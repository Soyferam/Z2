import { FoodManager } from "./food.js";
import { UIManager } from "./ui.js";
import { GAME_CONSTANTS } from "./constants.js";

window.addEventListener("DOMContentLoaded", async () => {
  const app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x1a1a1a,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    resizeTo: window,
  });

  document.getElementById("game-container").appendChild(app.view);
  app.stage.interactive = true;
  app.stage.hitArea = new PIXI.Rectangle(0, 0, app.screen.width, app.screen.height);

  // Загрузка текстур
  let textures;
  try {
    textures = await PIXI.Assets.load([
      "assets/snake-head.png",
      "assets/token-food.png",
    ]);
  } catch (error) {
    console.error("Ошибка загрузки текстур:", error);
    return;
  }

  // Контейнер игрового мира
  const gameWorld = new PIXI.Container();
  gameWorld.sortableChildren = true;
  app.stage.addChild(gameWorld);

  // Круглый фон и сетка
  const grid = new PIXI.Graphics();
  grid.lineStyle(1, 0x333333, 0.5);
  for (let r = GAME_CONSTANTS.GRID_SIZE; r <= GAME_CONSTANTS.WORLD_RADIUS; r += GAME_CONSTANTS.GRID_SIZE) {
    grid.drawCircle(GAME_CONSTANTS.WORLD_CENTER.x, GAME_CONSTANTS.WORLD_CENTER.y, r);
  }
  for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 12) {
    grid.moveTo(GAME_CONSTANTS.WORLD_CENTER.x, GAME_CONSTANTS.WORLD_CENTER.y);
    grid.lineTo(
      GAME_CONSTANTS.WORLD_CENTER.x + GAME_CONSTANTS.WORLD_RADIUS * Math.cos(angle),
      GAME_CONSTANTS.WORLD_CENTER.y + GAME_CONSTANTS.WORLD_RADIUS * Math.sin(angle)
    );
  }
  gameWorld.addChild(grid);

  // Граница карты
  const boundary = new PIXI.Graphics();
  boundary.lineStyle(2, 0xFFFFFF, 1);
  boundary.drawCircle(GAME_CONSTANTS.WORLD_CENTER.x, GAME_CONSTANTS.WORLD_CENTER.y, GAME_CONSTANTS.WORLD_RADIUS);
  gameWorld.addChild(boundary);

  // Голова змейки
  const snakeHead = new PIXI.Sprite(textures["assets/snake-head.png"]);
  snakeHead.anchor.set(0.5);
  snakeHead.width = GAME_CONSTANTS.SNAKE_GROWTH.WIDTH_BASE;
  snakeHead.height = GAME_CONSTANTS.SNAKE_GROWTH.WIDTH_BASE;
  snakeHead.x = GAME_CONSTANTS.WORLD_CENTER.x;
  snakeHead.y = GAME_CONSTANTS.WORLD_CENTER.y;
  snakeHead.zIndex = 1;
  gameWorld.addChild(snakeHead);

  // Тело змейки
  const snakeBodyGraphics = new PIXI.Graphics();
  snakeBodyGraphics.zIndex = 0;
  gameWorld.addChild(snakeBodyGraphics);

  // Свечение тела при бусте
  const bodyGlowGraphics = new PIXI.Graphics();
  bodyGlowGraphics.zIndex = -0.5;
  gameWorld.addChild(bodyGlowGraphics);
  //bodyGlowGraphics.filters = [new PIXI.filters.BlurFilter(8, 4)];

  // Система сегментов змейки
  const snakeSegments = [];
  let snakeMass = GAME_CONSTANTS.BASE_MASS;
  let targetMass = GAME_CONSTANTS.BASE_MASS;
  let glowPulse = 0;
  let orbSpawnTimer = 0;
  let growthLerp = 1;
  let wasBoosting = false;

  // Менеджеры
  const foodManager = new FoodManager(gameWorld, GAME_CONSTANTS.WORLD_RADIUS, textures["assets/token-food.png"]);
  foodManager.initialize();
  const uiManager = new UIManager(app, gameWorld, snakeHead, GAME_CONSTANTS.WORLD_RADIUS, (newMass) => {
    targetMass = Math.max(10, newMass);
    snakeMass = targetMass;
    uiManager.updateTokens(snakeMass - uiManager.tokens, false); // false для блокировки профита
    growthLerp = 0;
  });

  uiManager.updateTokens(Math.floor(snakeMass), false); // Инициализация без профита

  // Инициализация камеры
  uiManager.currentScale = uiManager.isMobile ? GAME_CONSTANTS.MIN_SCALE.mobile : GAME_CONSTANTS.MIN_SCALE.desktop;
  gameWorld.x = -snakeHead.x * uiManager.currentScale + app.screen.width / 2;
  gameWorld.y = -snakeHead.y * uiManager.currentScale + app.screen.height / 2;
  gameWorld.scale.set(uiManager.currentScale);

  // Функция расчета размеров змейки
  function calculateSnakeParams(mass) {
    const baseLength = GAME_CONSTANTS.SNAKE_GROWTH.LENGTH_BASE;
    const lengthMultiplier = GAME_CONSTANTS.SNAKE_GROWTH.LENGTH_MULTIPLIER;
    const length = baseLength + mass * lengthMultiplier;
    
    const baseWidth = GAME_CONSTANTS.SNAKE_GROWTH.WIDTH_BASE;
    const widthMultiplier = GAME_CONSTANTS.SNAKE_GROWTH.WIDTH_MULTIPLIER;
    const width = baseWidth + Math.sqrt(mass) * widthMultiplier;
    
    return { width, length };
  }

  // Функция обновления размера головы
  function updateSnakeSize() {
    const { width } = calculateSnakeParams(snakeMass);
    snakeHead.width = width;
    snakeHead.height = width;
    return { width };
  }

  // Функция расчета скорости
  function calculateSpeed(mass, isBoosting) {
    const baseSpeed = GAME_CONSTANTS.BASE_SPEED;
    const boostSpeed = GAME_CONSTANTS.BOOST_SPEED;
    
    const speedMultiplier = Math.max(GAME_CONSTANTS.SPEED_REDUCTION.MIN_SPEED, 
      1 - Math.log(mass / 10) * GAME_CONSTANTS.SPEED_REDUCTION.BASE_FACTOR);
    
    const currentBaseSpeed = baseSpeed * speedMultiplier;
    const currentBoostSpeed = boostSpeed * speedMultiplier;
    
    return isBoosting ? currentBoostSpeed : currentBaseSpeed;
  }

  // Функция обновления сегментов змейки
  function updateSnakeSegments(delta, canBoost) {
    const { width, length } = calculateSnakeParams(snakeMass);
    
    const segmentDistance = width * GAME_CONSTANTS.SNAKE_GROWTH.SEGMENT_SPACING;
    const maxSegments = Math.floor(length / segmentDistance);
    
    snakeSegments.unshift({
      x: snakeHead.x,
      y: snakeHead.y,
      width: width
    });
    
    for (let i = 1; i < snakeSegments.length; i++) {
      const current = snakeSegments[i];
      const previous = snakeSegments[i - 1];
      
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
    
    if (snakeSegments.length > maxSegments) {
      snakeSegments.splice(maxSegments);
    }
    
    return { width, segmentDistance };
  }

  // Функция рисования тела змейки
  function drawSnakeBody() {
    snakeBodyGraphics.clear();
    
    if (snakeSegments.length < 2) return;

    for (let i = 0; i < snakeSegments.length; i++) {
      const segment = snakeSegments[i];
      const segmentWidth = segment.width;
      
      snakeBodyGraphics.beginFill(GAME_CONSTANTS.BODY_COLOR);
      snakeBodyGraphics.drawCircle(segment.x, segment.y, segmentWidth / 2);
      snakeBodyGraphics.endFill();
      
      if (i > 0) {
        const prevSegment = snakeSegments[i - 1];
        const angle = Math.atan2(segment.y - prevSegment.y, segment.x - prevSegment.x);
        const distance = Math.sqrt((segment.x - prevSegment.x) ** 2 + (segment.y - prevSegment.y) ** 2);
        
        if (distance > 0) {
          snakeBodyGraphics.beginFill(GAME_CONSTANTS.BODY_COLOR);
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
          
          snakeBodyGraphics.moveTo(x1, y1);
          snakeBodyGraphics.lineTo(x2, y2);
          snakeBodyGraphics.lineTo(x3, y3);
          snakeBodyGraphics.lineTo(x4, y4);
          snakeBodyGraphics.closePath();
          snakeBodyGraphics.endFill();
        }
      }
    }
  }

  // Функция интерполяции цветов
  function interpolateColor(color1, color2, factor) {
    const r = Math.round(color1.r + (color2.r - color1.r) * factor);
    const g = Math.round(color1.g + (color2.g - color1.g) * factor);
    const b = Math.round(color1.b + (color2.b - color1.b) * factor);
    return (r << 16) | (g << 8) | b;
  }

  // Функция преобразования HEX в RGB
  function hexToRgb(hex) {
    const r = (hex >> 16) & 255;
    const g = (hex >> 8) & 255;
    const b = hex & 255;
    return { r, g, b };
  }

  // Функция обновления свечения
  function updateGlowSegments(delta, isBoosting) {
    if (!isBoosting) {
      bodyGlowGraphics.clear();
    }
  }

  function drawSnakeGlow(isBoosting, currentWidth) {
    bodyGlowGraphics.clear();

    if (!isBoosting || snakeSegments.length < 1) return;

    const isSmallSnake = snakeSegments.length < 10;
    const glowPulseSpeed = isSmallSnake ? 0.03 : 0.05;
    glowPulse += glowPulseSpeed;

    const glowColors = isSmallSnake
      ? [
          hexToRgb(0x66CCFF),
          hexToRgb(0xFF66FF),
          hexToRgb(0xFF9999),
          hexToRgb(0xFFFF99),
        ]
      : [
          hexToRgb(0x00CCFF),
          hexToRgb(0xFF00FF),
          hexToRgb(0xFF3333),
          hexToRgb(0xFFFF00),
          hexToRgb(0x33FF33),
          hexToRgb(0xFFFFFF),
        ];

    const glowWidth = currentWidth * (isSmallSnake ? 1.5 : 2.0);
    const totalSegments = snakeSegments.length + 1;

    for (let i = 0; i <= snakeSegments.length; i++) {
      const isHead = i === 0;
      const segment = isHead ? { x: snakeHead.x, y: snakeHead.y } : snakeSegments[i - 1];

      const t = i / totalSegments;
      const phaseMultiplier = isSmallSnake ? 2 * Math.PI : 4 * Math.PI;
      const phase = (glowPulse + t * phaseMultiplier) % (2 * Math.PI);
      const colorIndex = Math.floor((phase / (2 * Math.PI)) * glowColors.length);
      const nextColorIndex = (colorIndex + 1) % glowColors.length;
      const colorFactor = (phase / (2 * Math.PI)) * glowColors.length - colorIndex;

      const currentColor = interpolateColor(
        glowColors[colorIndex],
        glowColors[nextColorIndex],
        colorFactor
      );

      const alphaFactor = isSmallSnake ? 0.7 + 0.3 * (1 - t) : 0.6 + 0.4 * (1 - t);
      const pulseFactor = 1.0 + (isSmallSnake ? 0.2 : 0.4) * Math.sin(glowPulse + t * 3);
      const alpha = Math.min(1, Math.max(isSmallSnake ? 0.5 : 0.4, alphaFactor * pulseFactor));

      bodyGlowGraphics.lineStyle({
        width: glowWidth,
        color: currentColor,
        alpha: alpha,
        cap: PIXI.LINE_CAP.ROUND,
        join: PIXI.LINE_JOIN.ROUND,
      });

      if (i === 0) {
        bodyGlowGraphics.moveTo(segment.x, segment.y);
      } else {
        bodyGlowGraphics.lineTo(segment.x, segment.y);
      }
    }
  }

  // Плавное масштабирование камеры
  function updateCamera(delta) {
    const t = Math.min(Math.max(Math.log(snakeMass / 2 + 1) / Math.log(75), 0), 1);
    const targetScale = (uiManager.isMobile ? GAME_CONSTANTS.MIN_SCALE.mobile : GAME_CONSTANTS.MIN_SCALE.desktop) -
      ((uiManager.isMobile ? GAME_CONSTANTS.MIN_SCALE.mobile : GAME_CONSTANTS.MIN_SCALE.desktop) -
       (uiManager.isMobile ? GAME_CONSTANTS.MAX_SCALE.mobile : GAME_CONSTANTS.MAX_SCALE.desktop)) * t;
    uiManager.currentScale += (targetScale - uiManager.currentScale) * GAME_CONSTANTS.SCALE_SPEED * delta * 0.5;
    const targetX = -snakeHead.x * uiManager.currentScale + app.screen.width / 2;
    const targetY = -snakeHead.y * uiManager.currentScale + app.screen.height / 2;
    gameWorld.x = targetX;
    gameWorld.y = targetY;
    gameWorld.scale.set(uiManager.currentScale);
  }

  // Управление движением
  let currentAngle = -Math.PI / 2;
  app.stage.on("pointermove", (event) => {
    if (!uiManager.isMobile) {
      const mouse = event.data.global;
      const dx = mouse.x - app.screen.width / 2;
      const dy = mouse.y - app.screen.height / 2;
      if (dx !== 0 || dy !== 0) {
        uiManager.targetAngle = Math.atan2(dy, dx);
      }
    }
  });

  // Анимация поедания еды
  function animateFoodConsumption(food, callback) {
    const duration = 0.03;
    let time = 0;
    const initialX = food.x;
    const initialY = food.y;
    const initialScale = food.scale.x || 1;
    const initialAlpha = food.alpha || 1;

    food.isConsumed = true;
    foodManager.foodItems = foodManager.foodItems.filter(f => f !== food);

    const headAngle = snakeHead.rotation - Math.PI / 2;
    const faceOffset = snakeHead.height * 0.5;
    const faceX = snakeHead.x + Math.cos(headAngle) * faceOffset;
    const faceY = snakeHead.y + Math.sin(headAngle) * faceOffset;

    const animate = (delta) => {
      try {
        time += delta / 60;
        const progress = Math.min(time / duration, 1);

        food.x = initialX + (faceX - initialX) * progress;
        food.y = initialY + (faceY - initialY) * progress;
        food.scale.set(initialScale * (1 - progress));
        food.alpha = initialAlpha * (1 - progress);

        if (progress >= 1) {
          console.log(`Food animation completed, removing food at: ${food.x}, ${food.y}, ID: ${food.id}, Type: ${food.type || 'unknown'}, Points: ${food.points}`);
          if (gameWorld.children.includes(food)) {
            gameWorld.removeChild(food);
          }
          food.destroy({ children: true });
          app.ticker.remove(animate);
          callback();
        }
      } catch (error) {
        console.error(`Error during food animation for ID: ${food.id}, Type: ${food.type || 'unknown'}, Points: ${food.points}`, error);
        if (gameWorld.children.includes(food)) {
          gameWorld.removeChild(food);
        }
        food.destroy({ children: true });
        app.ticker.remove(animate);
        callback();
      }
    };

    app.ticker.add(animate);
  }

  // Основной игровой цикл
  app.ticker.add((delta) => {
    // Проверка начала буста
    if (uiManager.isBoosting && !wasBoosting && snakeMass > 11 && targetMass > 11) {
      // Динамическое начальное уменьшение массы
      const initialMassLoss = Math.min(snakeMass * 0.01, 5); // 1% массы, но не более 5
      targetMass = Math.max(10, targetMass - initialMassLoss);
      snakeMass = Math.max(10, snakeMass - initialMassLoss);
      uiManager.updateTokens(snakeMass - uiManager.tokens, false); // false для блокировки профита
      console.debug(`Boost started, initial mass loss: ${initialMassLoss.toFixed(2)}, SnakeMass: ${snakeMass.toFixed(2)}, TargetMass: ${targetMass.toFixed(2)}`);
    }

    // Обновление состояния буста
    wasBoosting = uiManager.isBoosting;

    // Интерполяция массы с динамическим коэффициентом
    if (Math.abs(targetMass - snakeMass) > 0.01) {
      const lerpFactor = snakeMass > 100 ? 0.8 : 0.2; // Ускоренная интерполяция для больших змеек
      snakeMass += (targetMass - snakeMass) * lerpFactor * delta;
      uiManager.updateTokens(snakeMass - uiManager.tokens, false); // false для блокировки профита
    }

    const canBoost = snakeMass > 11 && targetMass > 11 && uiManager.isBoosting;

    if (canBoost) {
      const massLost = GAME_CONSTANTS.BOOST_MASS_LOSS * delta;
      targetMass = Math.max(10, targetMass - massLost);
      if (targetMass <= 11) {
        uiManager.isBoosting = false;
        console.debug(`Boost stopped due to low mass, SnakeMass: ${snakeMass.toFixed(2)}, TargetMass: ${targetMass.toFixed(2)}`);
      }
    }

    currentAngle = lerpAngle(currentAngle, uiManager.getTargetAngle(), GAME_CONSTANTS.ROTATION_SPEED * delta);
    const speed = calculateSpeed(snakeMass, canBoost);

    let newX = snakeHead.x + Math.cos(currentAngle) * speed * delta;
    let newY = snakeHead.y + Math.sin(currentAngle) * speed * delta;
    
    const dx = newX - GAME_CONSTANTS.WORLD_CENTER.x;
    const dy = newY - GAME_CONSTANTS.WORLD_CENTER.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > GAME_CONSTANTS.WORLD_RADIUS) {
      const angle = Math.atan2(dy, dx);
      newX = GAME_CONSTANTS.WORLD_CENTER.x + GAME_CONSTANTS.WORLD_RADIUS * Math.cos(angle);
      newY = GAME_CONSTANTS.WORLD_CENTER.y + GAME_CONSTANTS.WORLD_RADIUS * Math.sin(angle);
    }
    
    snakeHead.x = newX;
    snakeHead.y = newY;
    snakeHead.rotation = currentAngle + Math.PI / 2;

    const { width } = updateSnakeSize();
    const { segmentDistance } = updateSnakeSegments(delta, canBoost);

    // Проверка столкновений с едой
    foodManager.foodItems = foodManager.foodItems.filter(food => {
      if (!food || food.isConsumed) {
        console.warn(`Skipping invalid or consumed food: ID ${food?.id}, Type: ${food?.type || 'unknown'}`);
        return false;
      }

      const headAngle = snakeHead.rotation - Math.PI / 2;
      const faceOffset = snakeHead.height * 0.5;
      const faceX = snakeHead.x + Math.cos(headAngle) * faceOffset;
      const faceY = snakeHead.y + Math.sin(headAngle) * faceOffset;

      const foodSize = food.size || 10;
      const distanceToHead = Math.hypot(food.x - faceX, food.y - faceY);
      const collisionThreshold = (snakeHead.width / 2) + (foodSize / 2);

      // Обработка столкновения или "зависшей" еды
      if (distanceToHead < collisionThreshold || distanceToHead < snakeHead.width) {
        const points = food.type === "boost" ? (snakeMass > 100 ? 0.05 : 0.1) : food.points;
        console.log(`Food consumed at: ${food.x}, ${food.y}, ID: ${food.id}, Type: ${food.type || 'unknown'}, Points: ${points}`);
        targetMass += points;
        uiManager.updateTokens(snakeMass + points - uiManager.tokens, true); // true для профита только при поедании еды
        animateFoodConsumption(food, () => {
          if (food.type !== "boost") {
            foodManager.createFood();
          }
        });
        return false;
      }

      return true;
    });

    if (growthLerp < 1) {
      growthLerp += delta * 0.1;
      if (growthLerp > 1) growthLerp = 1;
    }

    drawSnakeBody();
    updateGlowSegments(delta, canBoost);
    drawSnakeGlow(canBoost, width);

    if (canBoost && snakeSegments.length > 5) {
      orbSpawnTimer += delta / 60;
      const orbInterval = snakeMass > 100 ? 0.06 : GAME_CONSTANTS.ORB_SPAWN_INTERVAL.small; // Увеличен интервал для больших змеек
      if (orbSpawnTimer >= orbInterval) {
        const tailIndex = Math.min(snakeSegments.length - 1, Math.floor(snakeSegments.length * 0.8));
        const tailPos = snakeSegments[tailIndex];
        
        const orb = new PIXI.Container();
        orb.type = "boost";
        orb.points = snakeMass > 100 ? 0.05 : 0.1;
        orb.size = 10;
        orb.zIndex = -2;
        orb.id = Math.random().toString(36).substr(2, 9);
        orb.attractionTime = 0;
        
        const color = foodManager.colors[Math.floor(Math.random() * foodManager.colors.length)];
        const gradientTexture = foodManager.createGradientTexture(color, orb.size);
        const orbCircle = new PIXI.Graphics();
        orbCircle.beginTextureFill({ texture: gradientTexture });
        orbCircle.drawCircle(0, 0, orb.size / 2);
        orbCircle.endFill();
        orb.addChild(orbCircle);
        
        orb.x = tailPos.x + (Math.random() - 0.5) * 10;
        orb.y = tailPos.y + (Math.random() - 0.5) * 10;
        
        gameWorld.addChild(orb);
        foodManager.foodItems.push(orb);
        orbSpawnTimer = 0;
      }
    } else {
      orbSpawnTimer = 0;
    }

    foodManager.update(delta, snakeHead);
    updateCamera(delta);
    uiManager.updateMinimap();

    // Отладка: логируем количество активных объектов еды
    if (foodManager.foodItems.length > 0) {
      console.debug(`Active food items: ${foodManager.foodItems.length}, SnakeMass: ${snakeMass.toFixed(2)}, TargetMass: ${targetMass.toFixed(2)}`);
    }
  });

  // Функция плавного поворота
  function lerpAngle(start, end, t) {
    const twoPi = 2 * Math.PI;
    start = ((start % twoPi) + twoPi) % twoPi;
    end = ((end % twoPi) + twoPi) % twoPi;
    let diff = end - start;
    if (diff > Math.PI) diff -= twoPi;
    if (diff < -Math.PI) diff += twoPi;
    const maxChange = GAME_CONSTANTS.MAX_ANGULAR_SPEED * t;
    diff = Math.max(-maxChange, Math.min(maxChange, diff));
    return ((start + diff) % twoPi + twoPi) % twoPi;
  }
});