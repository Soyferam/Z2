import { GAME_CONSTANTS } from "./constants.js";

export class UIManager {
  constructor(app, gameWorld, snakeHead, worldRadius, setMassCallback, foodManager, bots) {
    this.app = app;
    this.gameWorld = gameWorld;
    this.snakeHead = snakeHead;
    this.worldRadius = worldRadius;
    this.foodManager = foodManager;
    this.bots = bots;
    this.tokens = 0;
    this.tonBalance = 1;
    this.isBoosting = false;
    this.normalSpeed = GAME_CONSTANTS.BASE_SPEED;
    this.boostSpeed = GAME_CONSTANTS.BOOST_SPEED;
    this.currentSpeed = this.normalSpeed;
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.currentScale = this.isMobile ? GAME_CONSTANTS.MIN_SCALE.mobile : GAME_CONSTANTS.MIN_SCALE.desktop;
    this.setMassCallback = setMassCallback;
    this.targetAngle = -Math.PI / 2;

    // Initialize DOM elements
    this.tokenDisplay = document.querySelector(".token-amount");
    this.balanceDisplay = null; // Initialize as null
    this.exitButton = document.getElementById("exit-btn");
    this.quickExitButton = document.getElementById("quick-exit-btn");
    this.boostButton = document.getElementById("boost-btn");

    this.isDevMode = new URLSearchParams(window.location.search).get("dev") === "true";
    this.devContainer = null;
    this.devInput = null;
    this.devButton = null;
    this.devResetButton = null;

    // Initialize balance display
    this.initializeBalanceDisplay();

    this.initMinimap();
    this.initJoystick();
    this.initEventListeners();
    this.initDevUI();
    this.handleResize();
    window.addEventListener("resize", () => this.handleResize());
    window.addEventListener("orientationchange", () => this.updateMinimapPosition());
  }

  initializeBalanceDisplay() {
    this.balanceDisplay = document.querySelector(".balance-amount");
    if (!this.balanceDisplay) {
      console.warn("Balance display (.balance-amount) not found during initialization");
      window.addEventListener("DOMContentLoaded", () => {
        this.balanceDisplay = document.querySelector(".balance-amount");
        if (this.balanceDisplay) {
          console.log("Balance display initialized on DOMContentLoaded");
          this.updateBalanceDisplay();
        } else {
          console.error("Failed to find .balance-amount even after DOMContentLoaded");
        }
      }, { once: true });
    } else {
      console.log("Balance display initialized");
      this.updateBalanceDisplay();
    }
  }

  addTon(amount) {
  console.log(`🪙 addTon вызван с amount: ${amount}`);
  console.log(`🪙 Баланс ДО: ${this.tonBalance}`);
  
  this.tonBalance += amount;
  
  console.log(`🪙 Баланс ПОСЛЕ: ${this.tonBalance}`);
  console.log(`🪙 Элемент balanceDisplay:`, this.balanceDisplay);
  
  // Принудительное обновление
  if (this.balanceDisplay) {
    const newText = `${this.tonBalance.toFixed(2)} TON`;
    this.balanceDisplay.textContent = newText;
    console.log(`🪙 UI обновлен на: ${newText}`);
  } else {
    console.error(`🪙 ОШИБКА: balanceDisplay не найден!`);
  }
  
  // Дополнительная проверка через querySelector
  const directElement = document.querySelector('.balance-amount');
  if (directElement) {
    directElement.textContent = `${this.tonBalance.toFixed(2)} TON`;
    console.log(`🪙 Прямое обновление через querySelector выполнено`);
  }
}


  updateBalanceDisplay() {
  console.log(`🪙 updateBalanceDisplay вызван, баланс: ${this.tonBalance}`);
  
  if (this.balanceDisplay) {
    const formattedBalance = this.tonBalance.toFixed(2);
    this.balanceDisplay.textContent = `${formattedBalance} TON`;
    console.log(`🪙 updateBalanceDisplay: установлен текст "${formattedBalance} TON"`);
  } else {
    console.error("🪙 updateBalanceDisplay: balanceDisplay элемент не найден!");
    
    // Попытка найти элемент заново
    this.balanceDisplay = document.querySelector(".balance-amount");
    if (this.balanceDisplay) {
      const formattedBalance = this.tonBalance.toFixed(2);
      this.balanceDisplay.textContent = `${formattedBalance} TON`;
      console.log(`🪙 Элемент найден заново и обновлен: ${formattedBalance} TON`);
    }
  }
}


  refreshBalanceDisplay() {
    if (!this.balanceDisplay) {
      this.initializeBalanceDisplay();
    }
    this.updateBalanceDisplay();
  }

  updateTokens(newTokenValue, allowProfit = false) {
    this.tokens = Math.max(0, newTokenValue);
    if (this.tokenDisplay) {
      this.tokenDisplay.textContent = Math.floor(this.tokens).toString();
    } else {
      console.warn("Token display not available");
    }
    if (this.boostButton) {
      this.boostButton.style.opacity = this.tokens > 11 ? "1" : "0.5";
      this.boostButton.style.pointerEvents = this.tokens > 11 ? "auto" : "none";
      this.boostButton.disabled = this.tokens <= 11;
    }
    console.log(`Tokens updated: ${Math.floor(this.tokens)}`);
  }

  initMinimap() {
    this.minimapCanvas = document.getElementById("minimap");

    if (!(this.minimapCanvas instanceof HTMLCanvasElement)) {
      console.warn("Element #minimap is not a canvas, creating new");
      if (this.minimapCanvas) {
        this.minimapCanvas.remove();
      }
      this.minimapCanvas = document.createElement("canvas");
      this.minimapCanvas.id = "minimap";
      this.minimapCanvas.className = "minimap";
      document.body.appendChild(this.minimapCanvas);
    }

    this.minimapCanvas.width = 150;
    this.minimapCanvas.height = 150;

    try {
      this.minimapCtx = this.minimapCanvas.getContext("2d");
      if (!this.minimapCtx) {
        console.error("Failed to get 2D context for minimap");
        return;
      }
    } catch (error) {
      console.error(`Error initializing minimap context: ${error}`);
      return;
    }

    this.minimapCanvas.style.position = "fixed";
    this.minimapCanvas.style.zIndex = "100";

    this.updateMinimapPosition();
    console.log("Minimap initialized");
  }

  updateMinimapPosition() {
    if (!this.minimapCanvas) return;
    console.log(`Updating minimap position: relying on CSS, screen width=${window.innerWidth}, isMobile=${this.isMobile}`);
  }

  updateMinimap() {
    if (!this.minimapCtx) {
      console.warn("Minimap context unavailable, skipping update");
      return;
    }

    const ctx = this.minimapCtx;
    const minimapSize = this.minimapCanvas.width;
    const scale = minimapSize / (2 * this.worldRadius);
    ctx.clearRect(0, 0, minimapSize, minimapSize);

    ctx.beginPath();
    ctx.moveTo(minimapSize / 2, minimapSize / 2 - 5);
    ctx.lineTo(minimapSize / 2, minimapSize / 2 + 5);
    ctx.moveTo(minimapSize / 2 - 5, minimapSize / 2);
    ctx.lineTo(minimapSize / 2 + 5, minimapSize / 2);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.stroke();

    const playerX = (this.snakeHead.x - GAME_CONSTANTS.WORLD_CENTER.x) * scale + minimapSize / 2;
    const playerY = (this.snakeHead.y - GAME_CONSTANTS.WORLD_CENTER.y) * scale + minimapSize / 2;
    ctx.beginPath();
    ctx.arc(playerX, playerY, 3, 0, 2 * Math.PI);
    ctx.fillStyle = "#FF0000";
    ctx.fill();
  }

  initJoystick() {
    if (this.isMobile) {
      if (this.joystick) {
        this.joystick.destroy();
        this.joystick = null;
      }
      this.joystickContainer = document.getElementById("joystick");
      if (!this.joystickContainer) {
        console.warn("Joystick container not found, creating new");
        this.joystickContainer = document.createElement("div");
        this.joystickContainer.id = "joystick";
        document.body.appendChild(this.joystickContainer);
      }

      this.joystickContainer.addEventListener("touchstart", (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, { passive: false });

      this.joystickContainer.addEventListener("touchmove", (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, { passive: false });

      this.joystickContainer.addEventListener("touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, { passive: false });

      try {
        this.joystick = nipplejs.create({
          zone: this.joystickContainer,
          mode: "static",
          position: { left: "50%", top: "50%" },
          color: "white",
          size: 100,
          catchDistance: 200,
        });

        this.joystick.on("move", (evt, data) => {
          if (data.direction) {
            this.targetAngle = -data.angle.radian;
            this.targetAngle = ((this.targetAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
            if (this.targetAngle > Math.PI) this.targetAngle -= 2 * Math.PI;
          }
        });

        this.joystick.on("end", () => {
          // Do not change angle on release
        });
      } catch (error) {
        console.error(`Error initializing joystick: ${error}`);
      }
    } else {
      if (this.joystick) {
        this.joystick.destroy();
        this.joystick = null;
      }
      if (this.joystickContainer) {
        this.joystickContainer.remove();
        this.joystickContainer = null;
      }
    }
  }

  initEventListeners() {
    if (this.boostButton && this.isMobile) {
      console.log("Boost button found, setting up events for mobile");
      this.boostButton.removeEventListener("touchstart", this.handleTouchStart);
      this.boostButton.removeEventListener("touchend", this.handleTouchEnd);

      this.handleTouchStart = (e) => {
        e.preventDefault();
        if (this.tokens > 11) {
          this.isBoosting = true;
          console.log("Boost activated via touch");
        } else {
          console.log(`Boost not activated: insufficient tokens (${this.tokens})`);
        }
      };
      this.handleTouchEnd = () => {
        this.isBoosting = false;
        console.log("Boost deactivated via touch end");
      };

      this.boostButton.addEventListener("touchstart", this.handleTouchStart);
      this.boostButton.addEventListener("touchend", this.handleTouchEnd);
      this.boostButton.disabled = this.tokens <= 11;
    } else if (this.boostButton) {
      console.log("Boost button found but ignored on desktop");
      this.boostButton.disabled = true;
    } else {
      console.warn("Boost button not found");
    }

    if (this.exitButton) {
      this.exitButton.addEventListener("click", () => {
        if (window.Telegram && window.Telegram.WebApp) {
          window.Telegram.WebApp.close();
        } else {
          alert("Exit: Balance saved.");
          window.location.reload();
        }
      });
    }

    if (this.quickExitButton) {
      this.quickExitButton.addEventListener("click", () => {
        if (window.Telegram && window.Telegram.WebApp) {
          window.Telegram.WebApp.close();
        } else {
          alert("Quick Exit: Balance saved with 10% penalty.");
          window.location.reload();
        }
      });
    }

    document.addEventListener("touchstart", (e) => {
      this.touchStartY = e.touches[0].clientY;
    });

    document.addEventListener("touchmove", (e) => {
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - this.touchStartY;

      if (deltaY > 0) {
        e.preventDefault();
      }
    }, { passive: false });
  }

  initDevUI() {
    if (this.isDevMode) {
      this.devContainer = document.createElement("div");
      this.devContainer.style.position = "absolute";
      this.devContainer.style.top = "20vh";
      this.devContainer.style.right = "4vw";
      this.devContainer.style.background = "rgba(255, 255, 255, 0.08)";
      this.devContainer.style.padding = "10px";
      this.devContainer.style.color = "white";
      this.devContainer.style.zIndex = "1000";
      document.body.appendChild(this.devContainer);

      this.devInput = document.createElement("input");
      this.devInput.type = "number";
      this.devInput.placeholder = "Set snake mass";
      this.devInput.style.marginRight = "10px";
      this.devContainer.appendChild(this.devInput);

      this.devButton = document.createElement("button");
      this.devButton.textContent = "Set Mass";
      this.devButton.addEventListener("click", () => {
        const newMass = parseFloat(this.devInput.value);
        if (!isNaN(newMass) && newMass >= 10) {
          this.setMassCallback(newMass);
        }
      });
      this.devContainer.appendChild(this.devButton);

      this.devResetButton = document.createElement("button");
      this.devResetButton.textContent = "Reset Game";
      this.devResetButton.style.marginLeft = "10px";
      this.devResetButton.addEventListener("click", () => {
        window.location.reload();
      });
      this.devContainer.appendChild(this.devResetButton);
    }
  }

  handleResize() {
    this.app.renderer.resize(window.innerWidth, window.innerHeight);
    this.app.stage.hitArea = new PIXI.Rectangle(0, 0, window.innerWidth, window.innerHeight);
    this.updateMinimapPosition();
  }

  getTargetAngle() {
    return this.targetAngle;
  }
}