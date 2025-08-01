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
    this.balanceDisplay = null;
    this.exitButton = document.getElementById("exit-btn");
    this.quickExitButton = document.getElementById("quick-exit-btn");
    this.boostButton = document.getElementById("boost-btn");
    this.exitScreen = document.getElementById("exit-screen");
    this.tokenAmountExit = document.querySelector(".token-amount-exit");
    this.balanceAmountExit = document.querySelector(".balance-amount-exit");
    this.exitMenuButtonExit = document.getElementById("exit-menu-btn-exit");
    this.shareButton = document.getElementById("share-btn");

    this.isDevMode = new URLSearchParams(window.location.search).get("dev") === "true";
    this.devContainer = null;
    this.devInput = null;
    this.devButton = null;
    this.devResetButton = null;

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
          //console.log("Balance display initialized on DOMContentLoaded");
          this.updateBalanceDisplay();
        } else {
          console.error("Failed to find .balance-amount even after DOMContentLoaded");
        }
      }, { once: true });
    } else {
      //console.log("Balance display initialized");
      this.updateBalanceDisplay();
    }
  }

  addTon(amount) {
    console.log(`🪙 addTon вызван с amount: ${amount}`);
    console.log(`🪙 Баланс ДО: ${this.tonBalance}`);
    this.tonBalance += amount;
    console.log(`🪙 Баланс ПОСЛЕ: ${this.tonBalance}`);
    console.log(`🪙 Элемент balanceDisplay:`, this.balanceDisplay);
    if (this.balanceDisplay) {
      const newText = `${this.tonBalance.toFixed(2)} TON`;
      this.balanceDisplay.textContent = newText;
      console.log(`🪙 UI обновлен на: ${newText}`);
    } else {
      console.error(`🪙 ОШИБКА: balanceDisplay не найден!`);
    }
    const directElement = document.querySelector('.balance-amount');
    if (directElement) {
      directElement.textContent = `${this.tonBalance.toFixed(2)} TON`;
      console.log(`🪙 Прямое обновление через querySelector выполнено`);
    }
    this.saveProfitData();
  }

  updateBalanceDisplay() {
    console.log(`🪙 updateBalanceDisplay вызван, баланс: ${this.tonBalance}`);
    if (this.balanceDisplay) {
      const formattedBalance = this.tonBalance.toFixed(2);
      this.balanceDisplay.textContent = `${formattedBalance} TON`;
      console.log(`🪙 updateBalanceDisplay: установлен текст "${formattedBalance} TON"`);
    } else {
      console.error("🪙 updateBalanceDisplay: balanceDisplay элемент не найден!");
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
    this.saveProfitData();
  }

  saveProfitData() {
    const profitData = {
      username: window.Telegram?.WebApp?.initDataUnsafe?.user?.username || "Player",
      tokens: Math.floor(this.tokens),
      tonBalance: this.tonBalance,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem("profitData", JSON.stringify(profitData));
    console.log("Profit data saved to localStorage:", profitData);
  }

  generateProfitCard() {
    const profitData = JSON.parse(localStorage.getItem("profitData")) || {
      username: "Player",
      tokens: Math.floor(this.tokens),
      tonBalance: this.tonBalance,
      timestamp: new Date().toISOString(),
    };

    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 200;
    const ctx = canvas.getContext("2d");

    // Load background image
    const bgImage = new Image();
    bgImage.src = "./img/profit-card-bg.png";
    bgImage.onload = () => {
      ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

      // Load snake logo
      const logo = new Image();
      logo.src = "./img/snake-logo.png";
      logo.onload = () => {
        ctx.drawImage(logo, 10, 10, 50, 50);

        // Draw text
        ctx.font = "bold 20px AntonSC";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(`@${profitData.username}`, 70, 40);

        ctx.font = "16px AntonSC";
        ctx.fillText(`Tokens: ${profitData.tokens}`, 70, 80);
        ctx.fillText(`Balance: ${profitData.tonBalance.toFixed(2)} TON`, 70, 110);
        ctx.fillText(`Date: ${new Date(profitData.timestamp).toLocaleDateString()}`, 70, 140);

        // Convert to data URL
        const dataUrl = canvas.toDataURL("image/png");
        this.shareProfitCard(dataUrl);
      };
      logo.onerror = () => {
        console.error("Failed to load snake-logo.png");
        ctx.font = "bold 20px AntonSC";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(`@${profitData.username}`, 70, 40);
        ctx.font = "16px AntonSC";
        ctx.fillText(`Tokens: ${profitData.tokens}`, 70, 80);
        ctx.fillText(`Balance: ${profitData.tonBalance.toFixed(2)} TON`, 70, 110);
        ctx.fillText(`Date: ${new Date(profitData.timestamp).toLocaleDateString()}`, 70, 140);
        const dataUrl = canvas.toDataURL("image/png");
        this.shareProfitCard(dataUrl);
      };
    };
    bgImage.onerror = () => {
      console.error("Failed to load profit-card-bg.png");
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const logo = new Image();
      logo.src = "./img/snake-logo.png";
      logo.onload = () => {
        ctx.drawImage(logo, 10, 10, 50, 50);
        ctx.font = "bold 20px AntonSC";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(`@${profitData.username}`, 70, 40);
        ctx.font = "16px AntonSC";
        ctx.fillText(`Tokens: ${profitData.tokens}`, 70, 80);
        ctx.fillText(`Balance: ${profitData.tonBalance.toFixed(2)} TON`, 70, 110);
        ctx.fillText(`Date: ${new Date(profitData.timestamp).toLocaleDateString()}`, 70, 140);
        const dataUrl = canvas.toDataURL("image/png");
        this.shareProfitCard(dataUrl);
      };
      logo.onerror = () => {
        console.error("Failed to load snake-logo.png");
        ctx.font = "bold 20px AntonSC";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(`@${profitData.username}`, 70, 40);
        ctx.font = "16px AntonSC";
        ctx.fillText(`Tokens: ${profitData.tokens}`, 70, 80);
        ctx.fillText(`Balance: ${profitData.tonBalance.toFixed(2)} TON`, 70, 110);
        ctx.fillText(`Date: ${new Date(profitData.timestamp).toLocaleDateString()}`, 70, 140);
        const dataUrl = canvas.toDataURL("image/png");
        this.shareProfitCard(dataUrl);
      };
    };
  }

  async shareProfitCard(dataUrl) {
  // Сжимаем изображение перед отправкой
  const compressedDataUrl = await this.compressImage(dataUrl, 0.7, 400, 200);

  if (window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp;
    try {
      // Проверяем длину compressedDataUrl
      if (compressedDataUrl.length > 4096) {
        console.warn("Compressed dataUrl still too large, attempting to send as file");
        // Конвертируем dataUrl в Blob для отправки как файл
        const blob = this.dataURLtoBlob(compressedDataUrl);
        const file = new File([blob], "profit-card.png", { type: "image/png" });

        // Формируем сообщение
        const shareText = `Check out my Crypto Snake profit card! Total Tokens: ${this.tokenAmountExit.textContent}`;

        // Проверяем, поддерживает ли Telegram WebApp отправку файлов
        if (tg.sendData) {
          // Отправляем данные через sendData (ограниченный способ, может не поддерживать файлы)
          const formData = new FormData();
          formData.append("chat_id", tg.initDataUnsafe?.user?.id || "@CryptoSnakeGame");
          formData.append("photo", file);
          formData.append("caption", shareText);

          // Для отправки файла используем fetch к Telegram Bot API (нужен токен бота)
          // Замените YOUR_BOT_TOKEN на реальный токен вашего бота
          const botToken = "YOUR_BOT_TOKEN"; // Укажите токен вашего Telegram-бота
          const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
            method: "POST",
            body: formData,
          });

          if (response.ok) {
            console.log("Profit card sent via Telegram Bot API");
            tg.showAlert("Profit card sent to your Telegram chat!");
          } else {
            console.error("Failed to send profit card via Telegram Bot API");
            tg.showAlert("Failed to send profit card. Try copying it instead.");
            this.copyImageToClipboard(compressedDataUrl);
          }
        } else {
          console.warn("Telegram WebApp sendData not available, falling back to copy");
          this.copyImageToClipboard(compressedDataUrl);
        }
      } else {
        // Если dataUrl достаточно короткий, отправляем через share URL
        const shareText = `Check out my Crypto Snake profit card! Total Tokens: ${this.tokenAmountExit.textContent}`;
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(compressedDataUrl)}&text=${encodeURIComponent(shareText)}`;
        tg.openLink(shareUrl);
        console.log("Profit card shared via Telegram WebApp:", shareUrl);
      }
    } catch (error) {
      console.error("Error sharing profit card:", error);
      tg.showAlert("Error sharing profit card. Copying to clipboard instead.");
      this.copyImageToClipboard(compressedDataUrl);
    }
  } else {
    // Если Telegram WebApp недоступен, копируем изображение в буфер обмена
    this.copyImageToClipboard(compressedDataUrl);
  }
}

// Вспомогательная функция для сжатия изображения
async compressImage(dataUrl, quality, maxWidth, maxHeight) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      // Уменьшаем размеры, если они превышают максимальные
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve(compressedDataUrl);
    };
    img.onerror = () => {
      console.error("Failed to load image for compression");
      resolve(dataUrl); // Возвращаем оригинальный dataUrl в случае ошибки
    };
  });
}

// Вспомогательная функция для копирования изображения в буфер обмена
async copyImageToClipboard(dataUrl) {
  try {
    const blob = this.dataURLtoBlob(dataUrl);
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob }),
    ]);
    console.log("Profit card copied to clipboard");
    alert("Profit card copied to clipboard! Paste it in any app.");
  } catch (error) {
    console.error("Error copying to clipboard:", error);
    // Запасной вариант: скачать изображение
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "profit-card.png";
    link.click();
    console.log("Profit card downloaded as profit-card.png");
    alert("Failed to copy to clipboard. Image downloaded instead.");
  }
}

  dataURLtoBlob(dataUrl) {
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  showExitScreen(isQuickExit = false) {
    if (!this.exitScreen || !this.tokenAmountExit || !this.balanceAmountExit) {
      console.error("Exit screen elements not found!");
      return;
    }

    // Скрываем игровые элементы
    if (this.exitButton) this.exitButton.style.display = "none";
    if (this.quickExitButton) this.quickExitButton.style.display = "none";
    if (this.boostButton) this.boostButton.style.display = "none";
    if (this.joystickContainer) this.joystickContainer.style.display = "none";
    if (this.minimapCanvas) this.minimapCanvas.style.display = "none";
    if (this.profitBox) this.profitBox.style.display = "none";

    // Применяем штраф 10% для быстрого выхода
    const finalTonBalance = isQuickExit ? this.tonBalance * 0.9 : this.tonBalance;
    const finalTokens = Math.floor(this.tokens);

    // Устанавливаем начальную прозрачность и масштаб для анимации появления
    this.exitScreen.style.opacity = "0";
    this.exitScreen.style.display = "flex";
    const exitContent = this.exitScreen.querySelector(".exit-content");
    if (exitContent) {
      exitContent.style.transform = "scale(0.8)";
      exitContent.style.opacity = "0";
    }

    // Анимация появления
    let opacity = 0;
    let scale = 0.8;
    const duration = 500; // Длительность анимации в миллисекундах
    const startTime = performance.now();

    const animateAppearance = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      opacity = progress;
      scale = 0.8 + 0.2 * progress; // От 0.8 до 1

      this.exitScreen.style.opacity = opacity;
      if (exitContent) {
        exitContent.style.transform = `scale(${scale})`;
        exitContent.style.opacity = progress;
      }

      if (progress < 1) {
        requestAnimationFrame(animateAppearance);
      }
    };

    requestAnimationFrame(animateAppearance);

    // Анимация для токенов и TON
    let currentTokens = 0;
    let currentTon = 0;
    const countUpDuration = 2000; // Длительность анимации счетчика
    const countUpStartTime = performance.now();

    const animateCountUp = (currentTime) => {
      const elapsed = currentTime - countUpStartTime;
      const progress = Math.min(elapsed / countUpDuration, 1);

      // Линейная интерполяция для токенов и TON
      currentTokens = Math.floor(progress * finalTokens);
      currentTon = progress * finalTonBalance;

      // Обновляем текст в UI
      this.tokenAmountExit.textContent = currentTokens.toString();
      this.balanceAmountExit.textContent = `${currentTon.toFixed(2)} TON`;

      if (progress < 1) {
        requestAnimationFrame(animateCountUp);
      } else {
        // Финальные значения
        this.tokenAmountExit.textContent = finalTokens.toString();
        this.balanceAmountExit.textContent = `${finalTonBalance.toFixed(2)} TON`;
      }
    };

    requestAnimationFrame(animateCountUp);
    console.log(`Exit screen shown: Tokens=${finalTokens}, TON=${finalTonBalance.toFixed(2)}, isQuickExit=${isQuickExit}`);
    this.saveProfitData();
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
        this.showExitScreen(false);
      });
    }

    if (this.quickExitButton) {
      this.quickExitButton.addEventListener("click", () => {
        this.showExitScreen(true);
      });
    }

    if (this.exitMenuButtonExit) {
      this.exitMenuButtonExit.addEventListener("click", () => {
        window.location.href = "https://z-ticd.vercel.app/";
      });
    }

    if (this.shareButton) {
      this.shareButton.addEventListener("click", () => {
        this.generateProfitCard();
        console.log("Share button clicked, generating profit card");
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