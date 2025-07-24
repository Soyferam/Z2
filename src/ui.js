// src/ui.js
import { GAME_CONSTANTS } from "./constants.js";

export class UIManager {
  constructor(app, gameWorld, snakeHead, worldRadius, setMassCallback) {
    this.app = app;
    this.gameWorld = gameWorld;
    this.snakeHead = snakeHead;
    this.worldRadius = worldRadius;
    this.tokens = 0;
    this.isBoosting = false;
    this.normalSpeed = GAME_CONSTANTS.BASE_SPEED;
    this.boostSpeed = GAME_CONSTANTS.BOOST_SPEED;
    this.currentSpeed = this.normalSpeed;
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.currentScale = this.isMobile ? GAME_CONSTANTS.MIN_SCALE.mobile : GAME_CONSTANTS.MIN_SCALE.desktop;
    this.setMassCallback = setMassCallback;

    // UI элементы
    this.tokenDisplay = document.querySelector(".token-amount");
    this.profitDisplay = document.querySelector(".profit-amount");
    this.exitButton = document.getElementById("exit-btn");
    this.quickExitButton = document.getElementById("quick-exit-btn");
    this.boostButton = document.getElementById("boost-btn");

    // Developer UI
    this.isDevMode = new URLSearchParams(window.location.search).get("dev") === "true";
    this.devContainer = null;
    this.devInput = null;
    this.devButton = null;
    this.devResetButton = null;

    this.initMinimap();
    this.initJoystick();
    this.initEventListeners();
    this.initDevUI();
    this.handleResize();
    window.addEventListener("resize", () => this.handleResize());
  }

  initMinimap() {
    const minimapElement = document.getElementById("minimap");
    if (!minimapElement) {
      console.error("Minimap element (#minimap) not found in DOM!");
      return;
    }
    this.updateMinimapSize();

    this.minimapApp = new PIXI.Application({
      width: this.minimapSize,
      height: this.minimapSize,
      backgroundColor: 0x000000,
      backgroundAlpha: 0,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    minimapElement.appendChild(this.minimapApp.view);
    this.minimapWorld = new PIXI.Container();
    this.minimapWorld.sortableChildren = true;
    this.minimapApp.stage.addChild(this.minimapWorld);

    const mask = new PIXI.Graphics();
    mask.drawCircle(this.minimapSize / 2, this.minimapSize / 2, this.minimapSize / 2);
    this.minimapWorld.addChild(mask);

    this.minimapScale = this.minimapSize / (2 * this.worldRadius);
    this.minimapWorld.x = this.minimapSize / 2;
    this.minimapWorld.y = this.minimapSize / 2;

    const minimapGrid = new PIXI.Graphics();
    minimapGrid.lineStyle(1, 0x333333, 0.5);
    for (let r = GAME_CONSTANTS.GRID_SIZE; r <= this.worldRadius; r += GAME_CONSTANTS.GRID_SIZE) {
      minimapGrid.drawCircle(0, 0, r * this.minimapScale);
    }
    minimapGrid.zIndex = 0;
    this.minimapWorld.addChild(minimapGrid);

    const minimapBoundary = new PIXI.Graphics();
    minimapBoundary.lineStyle(1, 0xFFFFFF, 0.7);
    minimapBoundary.drawCircle(0, 0, this.worldRadius * this.minimapScale);
    minimapBoundary.zIndex = 1;
    this.minimapWorld.addChild(minimapBoundary);

    this.minimapTestDot = new PIXI.Graphics();
    this.minimapTestDot.lineStyle(2, 0x00FF00, 0.7);
    this.minimapTestDot.moveTo(-5, 0);
    this.minimapTestDot.lineTo(5, 0);
    this.minimapTestDot.moveTo(0, -5);
    this.minimapTestDot.lineTo(0, 5);
    this.minimapTestDot.alpha = 0.7;
    this.minimapTestDot.zIndex = 10;
    this.minimapWorld.addChild(this.minimapTestDot);

    this.minimapSnake = new PIXI.Graphics();
    this.minimapSnake.beginFill(0xFFFFFF, 0.7);
    this.minimapSnake.drawCircle(0, 0, 3);
    this.minimapSnake.endFill();
    this.minimapSnake.alpha = 0.7;
    this.minimapSnake.zIndex = 10;
    this.minimapWorld.addChild(this.minimapSnake);
  }

  initJoystick() {
    if (this.isMobile) {
      this.joystick = nipplejs.create({
        zone: document.getElementById("joystick"),
        mode: "static",
        position: { left: "50%", top: "50%" },
        color: "white",
        size: 100,
      });
      this.joystick.on("move", (evt, data) => {
        if (data.direction) {
          this.targetAngle = -data.angle.radian;
          this.targetAngle = ((this.targetAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
          if (this.targetAngle > Math.PI) this.targetAngle -= 2 * Math.PI;
        }
      });
      this.joystick.on("end", () => {});
    }
  }

  initDevUI() {
    if (this.isDevMode) {
      console.log("Developer mode enabled");
      this.devContainer = document.createElement("div");
      this.devContainer.className = "dev-container";
      document.body.appendChild(this.devContainer);

      this.devInput = document.createElement("input");
      this.devInput.type = "number";
      this.devInput.placeholder = "Enter tokens";
      this.devInput.className = "dev-input";
      this.devContainer.appendChild(this.devInput);

      this.devButton = document.createElement("button");
      this.devButton.textContent = "Set Tokens";
      this.devButton.className = "dev-btn";
      this.devButton.addEventListener("click", () => {
        const newMass = parseFloat(this.devInput.value);
        if (isNaN(newMass) || newMass < 10) {
          alert("Введите число ≥ 10");
          return;
        }
        this.setMassCallback(newMass);
        this.devInput.value = "";
      });
      this.devContainer.appendChild(this.devButton);

      this.devResetButton = document.createElement("button");
      this.devResetButton.textContent = "Reset Tokens";
      this.devResetButton.className = "dev-btn";
      this.devResetButton.addEventListener("click", () => {
        this.setMassCallback(10);
        this.devInput.value = "";
      });
      this.devContainer.appendChild(this.devResetButton);
    }
  }

  initEventListeners() {
    this.app.stage.on("pointerdown", () => {
      if (!this.isMobile) {
        this.isBoosting = true;
        this.currentSpeed = this.boostSpeed;
      }
    });
    this.app.stage.on("pointerup", () => {
      if (!this.isMobile) {
        this.isBoosting = false;
        this.currentSpeed = this.normalSpeed;
      }
    });

    this.boostButton.addEventListener("touchstart", (e) => {
      e.preventDefault();
      if (this.isMobile && this.tokens > 11) {
        this.isBoosting = true;
        this.currentSpeed = this.boostSpeed;
      }
    });
    this.boostButton.addEventListener("touchend", () => {
      if (this.isMobile) {
        this.isBoosting = false;
        this.currentSpeed = this.normalSpeed;
      }
    });

    this.exitButton.addEventListener("click", () => {
      console.log("Выход начат, задержка 10 секунд...");
      setTimeout(() => {
        console.log("Игра завершена (обычный выход)");
        window.location.href = "index.html";
      }, 10000);
    });

    this.quickExitButton.addEventListener("click", () => {
      console.log("Быстрый выход начат, задержка 2 секунды с комиссией...");
      setTimeout(() => {
        console.log("Игра завершена (быстрый выход)");
        window.location.href = "index.html";
      }, 2000);
    });
  }

  updateMinimap() {
    this.minimapTestDot.x = 0;
    this.minimapTestDot.y = 0;

    if (this.snakeHead && this.snakeHead.x !== undefined && this.snakeHead.y !== undefined) {
      const snakeX = (this.snakeHead.x - GAME_CONSTANTS.WORLD_CENTER.x) * this.minimapScale;
      const snakeY = (this.snakeHead.y - GAME_CONSTANTS.WORLD_CENTER.y) * this.minimapScale;
      const maxRadius = this.worldRadius * this.minimapScale;
      const distance = Math.sqrt(snakeX * snakeX + snakeY * snakeY);
      if (distance > maxRadius) {
        const angle = Math.atan2(snakeY, snakeX);
        this.minimapSnake.x = maxRadius * Math.cos(angle);
        this.minimapSnake.y = maxRadius * Math.sin(angle);
      } else {
        this.minimapSnake.x = snakeX;
        this.minimapSnake.y = snakeY;
      }
    }
  }

  updateTokens(delta) {
    this.tokens = Math.max(0, this.tokens + delta);
    this.tokenDisplay.textContent = Math.floor(this.tokens).toString();
    this.profitDisplay.textContent = `$${Math.floor(this.tokens * 0.01).toFixed(2)}`;
    if (this.isMobile && this.boostButton) {
      this.boostButton.style.opacity = this.tokens > 11 ? '1' : '0.5';
      this.boostButton.style.pointerEvents = this.tokens > 11 ? 'auto' : 'none';
    }
  }

  getCurrentSpeed() {
    return this.currentSpeed;
  }

  getTargetAngle() {
    return this.targetAngle !== undefined ? this.targetAngle : -Math.PI / 2;
  }

  updateMinimapSize() {
    const minimapElement = document.getElementById("minimap");
    this.minimapSize = parseInt(getComputedStyle(minimapElement).width);
    if (this.minimapApp) {
      this.minimapApp.renderer.resize(this.minimapSize, this.minimapSize);
      this.minimapWorld.x = this.minimapSize / 2;
      this.minimapWorld.y = this.minimapSize / 2;
      this.minimapScale = this.minimapSize / (2 * this.worldRadius);

      const mask = this.minimapWorld.getChildAt(0);
      if (mask) {
        mask.clear();
        mask.drawCircle(this.minimapSize / 2, this.minimapSize / 2, this.minimapSize / 2);
      }

      const grid = this.minimapWorld.getChildAt(1);
      const boundary = this.minimapWorld.getChildAt(2);
      if (grid && boundary) {
        grid.clear();
        grid.lineStyle(1, 0x333333, 0.5);
        for (let r = GAME_CONSTANTS.GRID_SIZE; r <= this.worldRadius; r += GAME_CONSTANTS.GRID_SIZE) {
          grid.drawCircle(0, 0, r * this.minimapScale);
        }
        boundary.clear();
        boundary.lineStyle(1, 0xFFFFFF, 0.7);
        boundary.drawCircle(0, 0, this.worldRadius * this.minimapScale);
      }
    }
  }

  handleResize() {
    this.updateMinimapSize();
    if (this.minimapTestDot) {
      this.minimapTestDot.x = 0;
      this.minimapTestDot.y = 0;
    }
    if (this.minimapSnake) {
      this.updateMinimap();
    }
  }
}