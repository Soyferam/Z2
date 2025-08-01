import { GAME_CONSTANTS } from "./constants.js";

function calculateSnakeParams(mass) {
  const baseLength = GAME_CONSTANTS.SNAKE_GROWTH.LENGTH_BASE;
  const lengthMultiplier = GAME_CONSTANTS.SNAKE_GROWTH.LENGTH_MULTIPLIER;
  const length = baseLength + mass * lengthMultiplier;
  const baseWidth = GAME_CONSTANTS.SNAKE_GROWTH.WIDTH_BASE;
  const widthMultiplier = GAME_CONSTANTS.SNAKE_GROWTH.WIDTH_MULTIPLIER;
  const width = baseWidth + Math.sqrt(mass) * widthMultiplier;
  return { width, length };
}

function calculateSpeed(mass, isBoosting) {
  const baseSpeed = GAME_CONSTANTS.BASE_SPEED;
  const boostSpeed = GAME_CONSTANTS.BOOST_SPEED;
  const config = GAME_CONSTANTS.SPEED_FORMULA;
  let speedMultiplier = 1.0 - (mass * config.MASS_SLOWDOWN_FACTOR);
  speedMultiplier = Math.max(config.MIN_SPEED_MULTIPLIER, Math.min(config.MAX_SPEED_MULTIPLIER, speedMultiplier));
  return isBoosting ? boostSpeed * speedMultiplier : baseSpeed * speedMultiplier;
}

function calculateRotationSpeed(mass) {
  const config = GAME_CONSTANTS.ROTATION_FORMULA;
  let rotationSpeed = config.BASE_ROTATION_SPEED - (mass * config.MASS_SLOWDOWN_FACTOR);
  return Math.max(config.MIN_ROTATION_SPEED, Math.min(config.MAX_ROTATION_SPEED, rotationSpeed));
}

function getGlowParams(mass) {
  const configs = GAME_CONSTANTS.GLOW_OPTIMIZATION;
  for (const key in configs) {
    const config = configs[key];
    if (config?.massRange && mass >= config.massRange[0] && mass < config.massRange[1]) {
      return config;
    }
  }
  return configs.large;
}

function getGlowWidthByMass(mass) {
  const arr = GAME_CONSTANTS.GLOW_OPTIMIZATION.glowWidthByMass;
  for (const item of arr) {
    if (mass >= item.range[0] && mass < item.range[1]) {
      return item.width;
    }
  }
  return arr[arr.length - 1].width;
}

function slitherLerpAngle(currentAngle, targetAngle, mass, delta) {
  const config = GAME_CONSTANTS.ROTATION_FORMULA;
  const rotationSpeed = calculateRotationSpeed(mass);
  const twoPi = 2 * Math.PI;
  currentAngle = ((currentAngle % twoPi) + twoPi) % twoPi;
  targetAngle = ((targetAngle % twoPi) + twoPi) % twoPi;
  let diff = targetAngle - currentAngle;
  if (diff > Math.PI) diff -= twoPi;
  if (diff < -Math.PI) diff += twoPi;
  const maxRotationThisFrame = rotationSpeed * delta;
  diff = Math.max(-maxRotationThisFrame, Math.min(maxRotationThisFrame, diff));
  const lerpedDiff = diff * config.SMOOTHNESS;
  return ((currentAngle + lerpedDiff) % twoPi + twoPi) % twoPi;
}

function hexToRgb(hex) {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  return { r, g, b };
}

function interpolateColor(color1, color2, factor) {
  // Гарантируем, что factor в [0, 1] и RGB в [0, 255]
  factor = Math.max(0, Math.min(1, factor));
  const r = Math.round(Math.max(0, Math.min(255, color1.r + (color2.r - color1.r) * factor)));
  const g = Math.round(Math.max(0, Math.min(255, color1.g + (color2.g - color1.g) * factor)));
  const b = Math.round(Math.max(0, Math.min(255, color1.b + (color2.b - color1.b) * factor)));
  return (r << 16) | (g << 8) | b;
}

export class BotSnake {
  constructor(gameWorld, textures, mass, startX, startY, foodManager, color, playerHead, app) {
    this.gameWorld = gameWorld;
    this.textures = textures;
    this.mass = mass;
    this.targetMass = mass;
    this.segments = [];
    this.angle = Math.random() * Math.PI * 2;
    this.isBoosting = false;
    this.glowPulse = 0;
    this.growthLerp = 1;
    this.segmentAccumulator = 0;
    this.currentAngle = Math.random() * Math.PI * 2;
    this.targetAngle = this.currentAngle;
    this.wasBoosting = false;
    this.glowUpdateCounter = 0;
    this.color = color;
    this.alive = true;
    this.playerHead = playerHead;
    this.foodManager = foodManager;
    this.app = app;
    this.isInvincible = true; // Неуязвимость при спавне
    this.invincibleTimer = 10; // 10 секунд
    this.invincibleBlinkTimer = 0;
    this.invincibleText = null;

    const texturePath = `assets/eye-area-${this.getColorName(color)}.png`;
    this.head = new PIXI.Sprite(textures[texturePath] || textures["assets/snake-head.png"]);
    this.head.anchor.set(0.5);
    const { width } = calculateSnakeParams(mass);
    this.head.width = width;
    this.head.height = width;
    this.head.x = startX;
    this.head.y = startY;
    this.head.zIndex = 1;
    gameWorld.addChild(this.head);

    this.glowGraphics = new PIXI.Graphics();
    this.glowGraphics.zIndex = -0.5;
    gameWorld.addChild(this.glowGraphics);

    this.bodyGraphics = new PIXI.Graphics();
    this.bodyGraphics.zIndex = 0;
    gameWorld.addChild(this.bodyGraphics);

    const initialSegmentCount = Math.floor(GAME_CONSTANTS.SNAKE_GROWTH.LENGTH_BASE / (width * GAME_CONSTANTS.SNAKE_GROWTH.SEGMENT_SPACING));
    for (let i = 0; i < initialSegmentCount; i++) {
      this.segments.push({
        x: startX,
        y: startY + i * width * GAME_CONSTANTS.SNAKE_GROWTH.SEGMENT_SPACING,
        width: width,
      });
    }

    this.createInvincibleText();
  }

  createInvincibleText() {
    this.invincibleText = new PIXI.Text("Safe Start: 10", {
      fontFamily: "AntonSC",
      fontSize: 18,
      fill: ["#33CCFF", "#0099CC"],
      stroke: "#000000",
      strokeThickness: 2,
      dropShadow: true,
      dropShadowColor: "#1eff00",
      dropShadowBlur: 4,
      dropShadowDistance: 2,
    });
    this.invincibleText.anchor.set(0.5);
    this.invincibleText.x = this.head.x;
    this.invincibleText.y = this.head.y - 50;
    this.invincibleText.zIndex = 2;
    this.gameWorld.addChild(this.invincibleText);
    //console.log(`Safe Start text created for bot at (${this.head.x}, ${this.head.y})`);
  }

  getColorName(color) {
    const colorMap = {
      0xff3333: "red",
      0x33ff33: "green",
      0xffff33: "yellow",
      0xff33ff: "purple",
      0x33ffff: "cyan",
      0xff9933: "orange",
      0x9933ff: "magenta",
      0x3333ff: "blue",
    };
    return colorMap[color] || "default";
  }

  updateSegments(delta) {
    const { width, length } = calculateSnakeParams(this.mass);
    const baseSegmentDistance = width * GAME_CONSTANTS.SNAKE_GROWTH.SEGMENT_SPACING;
    const segmentDistance = baseSegmentDistance;
    const maxSegments = Math.floor(length / segmentDistance);
    this.segments.unshift({
      x: this.head.x,
      y: this.head.y,
      width: width,
    });
    for (let i = 1; i < this.segments.length; i++) {
      const current = this.segments[i];
      const previous = this.segments[i - 1];
      const dx = current.x - previous.x;
      const dy = current.y - previous.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > segmentDistance) {
        const angle = Math.atan2(dy, dx);
        current.x = previous.x + Math.cos(angle) * segmentDistance;
        current.y = previous.y + Math.sin(angle) * segmentDistance;
      }
      current.width = width;
    }
    if (this.segments.length > maxSegments) {
      this.segments.splice(maxSegments);
    }
    return { width, segmentDistance };
  }

  drawBody() {
    this.bodyGraphics.clear();
    if (this.segments.length < 2) return;
    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i];
      const segmentWidth = segment.width;
      this.bodyGraphics.beginFill(this.color);
      this.bodyGraphics.drawCircle(segment.x, segment.y, segmentWidth / 2);
      this.bodyGraphics.endFill();
      if (i > 0) {
        const prevSegment = this.segments[i - 1];
        const angle = Math.atan2(segment.y - prevSegment.y, segment.x - prevSegment.x);
        const distance = Math.sqrt((segment.x - prevSegment.x) ** 2 + (segment.y - prevSegment.y) ** 2);
        if (distance > 0) {
          this.bodyGraphics.beginFill(this.color);
          const perpAngle = angle + Math.PI / 2;
          const hw = segmentWidth / 2;
          const x1 = prevSegment.x + Math.cos(perpAngle) * hw;
          const y1 = prevSegment.y + Math.sin(perpAngle) * hw;
          const x2 = prevSegment.x - Math.cos(perpAngle) * hw;
          const y2 = prevSegment.y - Math.sin(perpAngle) * hw;
          const x3 = segment.x - Math.cos(perpAngle) * hw;
          const y3 = segment.y - Math.sin(perpAngle) * hw;
          const x4 = segment.x + Math.cos(perpAngle) * hw;
          const y4 = segment.y + Math.sin(perpAngle) * hw;
          this.bodyGraphics.moveTo(x1, y1);
          this.bodyGraphics.lineTo(x2, y2);
          this.bodyGraphics.lineTo(x3, y3);
          this.bodyGraphics.lineTo(x4, y4);
          this.bodyGraphics.closePath();
          this.bodyGraphics.endFill();
        }
      }
    }
  }

  drawGlow(currentWidth) {
    this.glowGraphics.clear();
    if (!this.isBoosting || this.segments.length < 2) return;
    const glowParams = getGlowParams(this.mass);
    const optimizationConfig = GAME_CONSTANTS.GLOW_OPTIMIZATION;
    this.glowPulse += glowParams.pulseSpeed;
    const glowWidth = getGlowWidthByMass(this.mass) * currentWidth;
    let alpha = glowParams.baseAlpha;
    if (glowParams.useSimplification) {
      alpha *= optimizationConfig.LARGE_SNAKE_SIMPLIFICATION.reducedAlpha;
    }
    function hsvToRgb(h, s, v) {
      let f = (n, k = (n + h / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
      return {
        r: Math.round(f(5) * 255),
        g: Math.round(f(3) * 255),
        b: Math.round(f(1) * 255)
      };
    }
    const points = [];
    points.push({ x: this.head.x, y: this.head.y });
    for (let i = 0; i < this.segments.length; i++) {
      points.push({ x: this.segments[i].x, y: this.segments[i].y });
    }
    const t = (this.glowPulse * 0.2) % 1;
    const hue = t * 360;
    const rgb = hsvToRgb(hue, 0.8, 1.0);
    const color = (rgb.r << 16) | (rgb.g << 8) | rgb.b;
    this.glowGraphics.lineStyle({
      width: glowWidth,
      color: color,
      alpha: alpha,
      cap: PIXI.LINE_CAP.ROUND,
      join: PIXI.LINE_JOIN.ROUND,
    });
    if (points.length > 2) {
      this.glowGraphics.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        this.glowGraphics.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      this.glowGraphics.quadraticCurveTo(
        points[points.length - 1].x,
        points[points.length - 1].y,
        points[points.length - 1].x,
        points[points.length - 1].y
      );
    } else {
      this.glowGraphics.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        this.glowGraphics.lineTo(points[i].x, points[i].y);
      }
    }
  }

  // Новая функция для избегания других ботов
  avoidOtherBots(bots) {
    let closestBot = null;
    let minDistance = Infinity;
    for (const otherBot of bots) {
      if (otherBot === this || !otherBot.alive) continue;
      const dx = this.head.x - otherBot.head.x;
      const dy = this.head.y - otherBot.head.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < minDistance && distance < 200) { // Порог избегания: 200 пикселей
        minDistance = distance;
        closestBot = otherBot;
      }
    }
    if (closestBot) {
      const dx = this.head.x - closestBot.head.x;
      const dy = this.head.y - closestBot.head.y;
      const avoidanceAngle = Math.atan2(dy, dx) + Math.PI; // Поворачиваем в противоположную сторону
      const avoidanceFactor = Math.max(0, (200 - minDistance) / 200); // Сила избегания возрастает при сближении
      this.targetAngle = slitherLerpAngle(this.targetAngle, avoidanceAngle, this.mass, 0.1 * avoidanceFactor);
    }
  }

  update(delta, foodManager, bots, playerSegments) {
    if (!this.alive) return;

    // Обновление неуязвимости
    this.invincibleBlinkTimer += delta / 60;
    this.invincibleTimer -= delta / 60;
    if (this.invincibleTimer <= 0 && this.isInvincible) {
      this.isInvincible = false;
      if (this.invincibleText) {
        this.gameWorld.removeChild(this.invincibleText);
        this.invincibleText.destroy();
        this.invincibleText = null;
        //console.log("Safe Start text removed for bot");
      }
    }

    // Мерцание всей змейки белым
    if (this.isInvincible) {
      const blinkFrequency = 2 + (10 - this.invincibleTimer) * 0.2; // Частота от 2 до ~4 Гц
      const tintFactor = 0.3 + 0.7 * Math.sin(blinkFrequency * Math.PI * this.invincibleBlinkTimer); // От 0.3 до 1
      const baseColor = hexToRgb(this.color || 0xFFFFFF); // Запасной белый цвет
      const white = { r: 255, g: 255, b: 255 };
      const tintedColor = interpolateColor(baseColor, white, tintFactor);
      this.head.tint = tintedColor;
      this.bodyGraphics.tint = tintedColor;
      this.glowGraphics.tint = tintedColor;
      this.head.alpha = 1;
      this.bodyGraphics.alpha = 1;
      this.glowGraphics.alpha = 1;
      if (this.invincibleText) {
        this.invincibleText.text = `Safe Start: ${Math.ceil(this.invincibleTimer)}`;
        this.invincibleText.x = this.head.x;
        this.invincibleText.y = this.head.y - 50;
      }
    } else {
      this.head.tint = 0xFFFFFF;
      this.bodyGraphics.tint = 0xFFFFFF;
      this.glowGraphics.tint = 0xFFFFFF;
      this.head.alpha = 1;
      this.bodyGraphics.alpha = 1;
      this.glowGraphics.alpha = 1;
    }

    // Логика буста
    if (this.isBoosting && !this.wasBoosting && this.mass > 11 && this.targetMass > 11) {
      const initialMassLoss = Math.min(this.mass * 0.01, 5);
      this.targetMass = Math.max(10, this.targetMass - initialMassLoss);
      this.mass = this.targetMass;
    }
    this.wasBoosting = this.isBoosting;
    if (Math.abs(this.targetMass - this.mass) > 0.01) {
      const lerpFactor = this.mass > 100 ? 0.8 : 0.2;
      this.mass += (this.targetMass - this.mass) * lerpFactor * delta;
    }
    if (this.isBoosting && this.mass > 11 && this.targetMass > 11) {
      const massLost = GAME_CONSTANTS.BOOST_MASS_LOSS * delta;
      this.targetMass = Math.max(10, this.targetMass - massLost);
      this.mass = this.targetMass;
      if (this.targetMass <= 11) {
        this.isBoosting = false;
      }
    }

    // Логика движения
    if (this.isInvincible) {
      // Случайное блуждание в безопасном режиме
      this.targetAngle += (Math.random() - 0.5) * 0.5; // Более выраженное изменение угла
      this.avoidOtherBots(bots); // Избегаем других ботов
      this.isBoosting = false; // Отключаем буст в безопасном режиме
    } else {
      // Обычная логика движения
      const nearestFood = foodManager.foodItems
        .filter(food => !food.isConsumed)
        .reduce((closest, food) => {
          const dx = food.x - this.head.x;
          const dy = food.y - this.head.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (!closest || distance < closest.distance) {
            return { food, distance };
          }
          return closest;
        }, null);

      if (nearestFood && nearestFood.distance < 300) {
        const dx = nearestFood.food.x - this.head.x;
        const dy = nearestFood.food.y - this.head.y;
        this.targetAngle = Math.atan2(dy, dx);
      } else {
        const dx = this.playerHead.x - this.head.x;
        const dy = this.playerHead.y - this.head.y;
        const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
        if (distanceToPlayer < 200 && this.mass < 100) {
          this.targetAngle = Math.atan2(dy, dx) + Math.PI; // Убегать от игрока
        } else {
          this.targetAngle += (Math.random() - 0.5) * 0.1; // Случайное блуждание
        }
      }

      this.isBoosting = nearestFood && nearestFood.distance < 100 && this.mass > 11 && Math.random() < 0.02;
    }

    this.currentAngle = slitherLerpAngle(this.currentAngle, this.targetAngle, this.mass, delta);
    const speed = calculateSpeed(this.mass, this.isBoosting);
    let newX = this.head.x + Math.cos(this.currentAngle) * speed * delta;
    let newY = this.head.y + Math.sin(this.currentAngle) * speed * delta;
    const dx = newX - GAME_CONSTANTS.WORLD_CENTER.x;
    const dy = newY - GAME_CONSTANTS.WORLD_CENTER.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > GAME_CONSTANTS.WORLD_RADIUS) {
      const angle = Math.atan2(dy, dx);
      newX = GAME_CONSTANTS.WORLD_CENTER.x + GAME_CONSTANTS.WORLD_RADIUS * Math.cos(angle);
      newY = GAME_CONSTANTS.WORLD_CENTER.y + GAME_CONSTANTS.WORLD_RADIUS * Math.sin(angle);
      this.targetAngle = angle + Math.PI;
    }
    this.head.x = newX;
    this.head.y = newY;
    this.head.rotation = this.currentAngle + Math.PI / 2;

    const { width } = calculateSnakeParams(this.mass);
    this.head.width = width;
    this.head.height = width;

    const { segmentDistance } = this.updateSegments(delta);
    this.drawBody();

    if (this.glowUpdateCounter >= GAME_CONSTANTS.GLOW_OPTIMIZATION.GLOW_UPDATE_INTERVAL) {
      this.drawGlow(width);
      this.glowUpdateCounter = 0;
    }
    this.glowUpdateCounter++;

    // Обработка еды
    foodManager.foodItems = foodManager.foodItems.filter(food => {
      if (!food || food.isConsumed) {
        return false;
      }
      const headAngle = this.head.rotation - Math.PI / 2;
      const faceOffset = this.head.height * 0.5;
      const faceX = this.head.x + Math.cos(headAngle) * faceOffset;
      const faceY = this.head.y + Math.sin(headAngle) * faceOffset;
      const foodSize = food.size || 10;
      const distanceToHead = Math.hypot(food.x - faceX, food.y - faceY);
      const collisionThreshold = (this.head.width / 2) + (foodSize / 2);
      if (distanceToHead < collisionThreshold || distanceToHead < this.head.width) {
        const points = food.type === "boost" ? (this.mass > 100 ? 0.05 : 0.1) : food.points;
        this.targetMass += points;
        const duration = 0.03;
        let time = 0;
        const initialX = food.x;
        const initialY = food.y;
        const initialScale = food.scale.x || 1;
        const initialAlpha = food.alpha || 1;
        food.isConsumed = true;
        foodManager.foodItems = foodManager.foodItems.filter(f => f !== food);
        const animate = (delta) => {
          try {
            time += delta / 60;
            const progress = Math.min(time / duration, 1);
            food.x = initialX + (faceX - initialX) * progress;
            food.y = initialY + (faceY - initialY) * progress;
            food.scale.set(initialScale * (1 - progress));
            food.alpha = initialAlpha * (1 - progress);
            if (progress >= 1) {
              if (this.gameWorld.children.includes(food)) {
                this.gameWorld.removeChild(food);
              }
              food.destroy({ children: true });
              this.app.ticker.remove(animate);
              if (food.type !== "boost" && food.type !== "ton") {
                foodManager.createFood();
              }
            }
          } catch (error) {
            console.error(`Error during bot food animation: ${error}`);
            if (this.gameWorld.children.includes(food)) {
              this.gameWorld.removeChild(food);
            }
            food.destroy({ children: true });
            this.app.ticker.remove(animate);
          }
        };
        this.app.ticker.add(animate);
        return false;
      }
      return true;
    });

    // Проверка столкновений (только если не неуязвим)
    if (!this.isInvincible) {
      for (const otherBot of bots) {
        if (otherBot === this || !otherBot.alive || otherBot.isInvincible) continue;
        for (let i = 0; i < otherBot.segments.length; i++) {
          const seg = otherBot.segments[i];
          const dist = Math.hypot(this.head.x - seg.x, this.head.y - seg.y);
          if (dist < this.head.width / 2 + seg.width / 2) {
            this.alive = false;
            foodManager.createDebrisFromSnake(this.mass, this.segments);
            foodManager.createTonFromSnake(this.mass, this.segments);
            this.gameWorld.removeChild(this.head);
            this.gameWorld.removeChild(this.bodyGraphics);
            this.gameWorld.removeChild(this.glowGraphics);
            if (this.invincibleText) {
              this.gameWorld.removeChild(this.invincibleText);
              this.invincibleText.destroy();
            }
            this.head.destroy();
            this.bodyGraphics.destroy();
            this.glowGraphics.destroy();
            //console.log(`Bot died due to collision with another bot at segment ${i}`);
            return;
          }
        }
      }

      for (let i = 0; i < playerSegments.length; i++) {
        const seg = playerSegments[i];
        const dist = Math.hypot(this.head.x - seg.x, this.head.y - seg.y);
        if (dist < this.head.width / 2 + seg.width / 2 && !playerSegments[0].isInvincible) {
          this.alive = false;
          foodManager.createDebrisFromSnake(this.mass, this.segments);
          foodManager.createTonFromSnake(this.mass, this.segments);
          this.gameWorld.removeChild(this.head);
          this.gameWorld.removeChild(this.bodyGraphics);
          this.gameWorld.removeChild(this.glowGraphics);
          if (this.invincibleText) {
            this.gameWorld.removeChild(this.invincibleText);
            this.invincibleText.destroy();
          }
          this.head.destroy();
          this.bodyGraphics.destroy();
          this.glowGraphics.destroy();
          //(`Bot died due to collision with player at segment ${i}`);
          return;
        }
      }
    }
  }
}