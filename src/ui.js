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

    this.tokenDisplay = document.querySelector(".token-amount");
    this.balanceDisplay = document.querySelector(".balance-amount");
    this.exitButton = document.getElementById("exit-btn");
    this.quickExitButton = document.getElementById("quick-exit-btn");
    this.boostButton = document.getElementById("boost-btn");

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

    this.updateBalanceDisplay();
  }

  addTon(amount) {
    this.tonBalance += amount;
    this.updateBalanceDisplay();
    console.log(`Добавлено ${amount} TON. Новый баланс: ${this.tonBalance.toFixed(2)} TON`);
  }

  updateBalanceDisplay() {
    if (this.balanceDisplay) {
      this.balanceDisplay.textContent = `${this.tonBalance.toFixed(2)} TON`;
    }
  }

  updateTokens(newTokenValue, allowProfit = false) {
    this.tokens = Math.max(0, newTokenValue);
    if (this.tokenDisplay) {
      this.tokenDisplay.textContent = Math.floor(this.tokens).toString();
    }
    if (this.boostButton) {
      this.boostButton.style.opacity = this.tokens > 11 ? "1" : "0.5";
      this.boostButton.style.pointerEvents = this.tokens > 11 ? "auto" : "none";
      this.boostButton.disabled = this.tokens <= 11;
    }
    console.log(`Токены обновлены: ${Math.floor(this.tokens)}`);
  }

  initMinimap() {
    this.minimapCanvas = document.getElementById("minimap");
    
    if (!(this.minimapCanvas instanceof HTMLCanvasElement)) {
      console.warn("Элемент #minimap не является canvas, создаём новый");
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
        console.error("Не удалось получить 2D контекст для миникарты");
        return;
      }
    } catch (error) {
      console.error(`Ошибка инициализации контекста миникарты: ${error}`);
      return;
    }

    this.minimapCanvas.style.position = "fixed";
    this.minimapCanvas.style.top = this.isMobile ? "2vh" : "4vh";
    this.minimapCanvas.style.left = this.isMobile ? "2vw" : "4vw";
    this.minimapCanvas.style.width = this.isMobile ? "100px" : "150px";
    this.minimapCanvas.style.height = this.isMobile ? "100px" : "150px";
    this.minimapCanvas.style.zIndex = "100";
    console.log("Миникарта инициализирована");
  }

  updateMinimap() {
    if (!this.minimapCtx) {
      console.warn("Контекст миникарты недоступен, пропуск обновления");
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
        console.warn("Контейнер джойстика не найден, создаём новый");
        this.joystickContainer = document.createElement("div");
        this.joystickContainer.id = "joystick";
        document.body.appendChild(this.joystickContainer);
      }
      try {
        this.joystick = nipplejs.create({
          zone: this.joystickContainer,
          mode: "static",
          position: { left: "50%", top: "50%" }, // Восстановлено из старого кода
          color: "white",
          size: 100,
        });

        this.joystick.on("move", (evt, data) => {
          if (data.direction) {
            this.targetAngle = -data.angle.radian; // Восстановлено из старого кода
            this.targetAngle = ((this.targetAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
            if (this.targetAngle > Math.PI) this.targetAngle -= 2 * Math.PI;
          }
        });

        this.joystick.on("end", () => {
          // Не меняем угол при отпускании джойстика (как в старом коде)
        });
      } catch (error) {
        console.error(`Ошибка инициализации джойстика: ${error}`);
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
  // Существующие обработчики для кнопок буста
  if (this.boostButton && this.isMobile) {
    console.log("Кнопка буста найдена, настройка событий для мобильных");
    this.boostButton.removeEventListener("touchstart", this.handleTouchStart);
    this.boostButton.removeEventListener("touchend", this.handleTouchEnd);

    this.handleTouchStart = (e) => {
      e.preventDefault();
      if (this.tokens > 11) {
        this.isBoosting = true;
        console.log("Буст активирован через касание");
      } else {
        console.log(`Буст не активирован: недостаточно токенов (${this.tokens})`);
      }
    };
    this.handleTouchEnd = () => {
      this.isBoosting = false;
      console.log("Буст деактивирован через окончание касания");
    };

    this.boostButton.addEventListener("touchstart", this.handleTouchStart);
    this.boostButton.addEventListener("touchend", this.handleTouchEnd);
    this.boostButton.disabled = this.tokens <= 11;
  } else if (this.boostButton) {
    console.log("Кнопка буста найдена, но игнорируется на десктопе");
    this.boostButton.disabled = true;
  } else {
    console.warn("Кнопка буста не найдена");
  }

  // Обработчики для кнопок выхода с использованием Telegram Web App API
  if (this.exitButton) {
    this.exitButton.addEventListener("click", () => {
      if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.close(); // Закрываем приложение через API
      } else {
        alert("Exit: Баланс сохранён.");
        window.location.reload();
      }
    });
  }

  if (this.quickExitButton) {
    this.quickExitButton.addEventListener("click", () => {
      if (window.Telegram && window.Telegram.WebApp) {
        // Можно добавить логику для штрафа 10% перед закрытием
        window.Telegram.WebApp.close();
      } else {
        alert("Quick Exit: Баланс сохранён с 10% штрафом.");
        window.location.reload();
      }
    });
  }

  // Предотвращаем свайп вниз
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
    if (this.minimapCanvas) {
      this.minimapCanvas.style.top = this.isMobile ? "2vh" : "4vh";
      this.minimapCanvas.style.left = this.isMobile ? "2vw" : "4vw";
      this.minimapCanvas.style.width = this.isMobile ? "100px" : "150px";
      this.minimapCanvas.style.height = this.isMobile ? "100px" : "150px";
    }
  }

  getTargetAngle() {
    return this.targetAngle;
  }
}