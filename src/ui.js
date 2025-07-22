// src/ui.js
export class UIManager {
  constructor(app, gameWorld, snakeHead, worldWidth, worldHeight) {
    this.app = app;
    this.gameWorld = gameWorld;
    this.snakeHead = snakeHead;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.tokens = 0;
    this.isBoosting = false;
    this.normalSpeed = 5;
    this.boostSpeed = 10;
    this.currentSpeed = this.normalSpeed;
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // UI элементы
    this.tokenDisplay = document.querySelector(".token-amount");
    this.exitButton = document.getElementById("exit-btn");
    this.quickExitButton = document.getElementById("quick-exit-btn");
    this.boostButton = document.getElementById("boost-btn");

    // Инициализация UI
    this.initMinimap();
    this.initJoystick();
    this.initEventListeners();
  }

  initMinimap() {
    this.minimapApp = new PIXI.Application({
      width: 150,
      height: 150,
      backgroundColor: 0x000000,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    document.getElementById("minimap").appendChild(this.minimapApp.view);
    this.minimapWorld = new PIXI.Container();
    this.minimapApp.stage.addChild(this.minimapWorld);
    const minimapGrid = new PIXI.Graphics();
    this.minimapScale = 150 / this.worldWidth;
    minimapGrid.lineStyle(1, 0x333333, 0.5);
    for (let x = 0; x <= this.worldWidth; x += 100) {
      minimapGrid.moveTo(x * this.minimapScale, 0);
      minimapGrid.lineTo(x * this.minimapScale, this.worldHeight * this.minimapScale);
    }
    for (let y = 0; y <= this.worldHeight; y += 100) {
      minimapGrid.moveTo(0, y * this.minimapScale);
      minimapGrid.lineTo(this.worldWidth * this.minimapScale, y * this.minimapScale);
    }
    this.minimapWorld.addChild(minimapGrid);
    this.minimapSnake = new PIXI.Graphics();
    this.minimapSnake.beginFill(0xFFFFFF);
    this.minimapSnake.drawCircle(0, 0, 3);
    this.minimapSnake.endFill();
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
          // Инвертируем угол для коррекции оси Y (вверх/вниз)
          this.targetAngle = -data.angle.radian;
          console.log("Joystick angle:", data.angle.radian, "Target angle:", this.targetAngle); // Для отладки
        }
      });
      this.joystick.on("end", () => {
        // Оставляем текущий угол
      });
    }
  }

  initEventListeners() {
    // Ускорение на ПК (ЛКМ)
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

    // Ускорение на мобильных (кнопка Boost)
    this.boostButton.addEventListener("touchstart", (e) => {
      e.preventDefault();
      if (this.isMobile) {
        this.isBoosting = true;
        this.currentSpeed = this.boostSpeed;
        console.log("Boost started");
      }
    });
    this.boostButton.addEventListener("touchend", () => {
      if (this.isMobile) {
        this.isBoosting = false;
        this.currentSpeed = this.normalSpeed;
        console.log("Boost ended");
      }
    });

    // Кнопки Exit и Quick Exit
    this.exitButton.addEventListener("click", () => {
      console.log("Exit clicked");
      window.location.href = "index.html"; // Замените на возврат в меню
    });
    this.quickExitButton.addEventListener("click", () => {
      console.log("Quick Exit clicked");
      window.location.href = "index.html"; // Замените на логику с комиссией
    });
  }

  updateMinimap() {
    this.minimapSnake.x = this.snakeHead.x * this.minimapScale;
    this.minimapSnake.y = this.snakeHead.y * this.minimapScale;
  }

  updateTokens(tokensCollected) {
    this.tokens += tokensCollected;
    this.tokenDisplay.textContent = this.tokens;
  }

  getCurrentSpeed() {
    return this.currentSpeed;
  }

  getTargetAngle() {
    return this.targetAngle || 0;
  }
}