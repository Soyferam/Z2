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

  // Оптимизированное свечение тела
  const bodyGlowGraphics = new PIXI.Graphics();
  bodyGlowGraphics.zIndex = -0.5;
  gameWorld.addChild(bodyGlowGraphics);

  // Система сегментов змейки
  const snakeSegments = [];
  let snakeMass = GAME_CONSTANTS.BASE_MASS;
  let targetMass = GAME_CONSTANTS.BASE_MASS;
  let glowPulse = 0;
  let orbSpawnTimer = 0;
  let growthLerp = 1;
  let wasBoosting = false;
  let glowUpdateCounter = 0; // Счетчик для оптимизации обновления свечения

  // Менеджеры
  const foodManager = new FoodManager(gameWorld, GAME_CONSTANTS.WORLD_RADIUS, textures["assets/token-food.png"]);
  foodManager.initialize();
  const uiManager = new UIManager(app, gameWorld, snakeHead, GAME_CONSTANTS.WORLD_RADIUS, (newMass) => {
    targetMass = Math.max(10, newMass);
    snakeMass = targetMass;
    // УБРАН ПРОФИТ - токены обновляются без профита
    uiManager.updateTokens(snakeMass, false);
    growthLerp = 0;
  });

  // Инициализация токенов без профита
  uiManager.updateTokens(Math.floor(snakeMass), false);

  // Инициализация камеры
  uiManager.currentScale = uiManager.isMobile ? GAME_CONSTANTS.MIN_SCALE.mobile : GAME_CONSTANTS.MIN_SCALE.desktop;
  gameWorld.x = -snakeHead.x * uiManager.currentScale + app.screen.width / 2;
  gameWorld.y = -snakeHead.y * uiManager.currentScale + app.screen.height / 2;
  gameWorld.scale.set(uiManager.currentScale);

  // Функция получения параметров поворота по массе
  function getRotationParams(mass) {
    const configs = GAME_CONSTANTS.ROTATION_CONFIG;
    for (const [key, config] of Object.entries(configs)) {
      if (mass >= config.massRange[0] && mass < config.massRange[1]) {
        return config;
      }
    }
    return configs.huge; // По умолчанию для очень больших змей
  }

  // Функция получения параметров свечения по массе (исправлено)
  function getGlowParams(mass) {
    const configs = GAME_CONSTANTS.GLOW_OPTIMIZATION;
    let foundConfig = null;
    for (const [key, config] of Object.entries(configs)) {
      // Проверяем, что есть massRange
      if (config && config.massRange && Array.isArray(config.massRange)) {
        if (mass >= config.massRange[0] && mass < config.massRange[1]) {
          foundConfig = config;
          break;
        }
      }
    }
    // Если не найдено, возвращаем дефолтные параметры для больших змей
    return foundConfig || configs.large;
  }

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

  // ОПТИМИЗИРОВАННАЯ функция рисования ЕДИНОГО свечения вдоль всей змейки (только одна линия по всем точкам)
  function drawOptimizedSnakeGlow(isBoosting, currentWidth) {
    bodyGlowGraphics.clear();

    if (!isBoosting || snakeSegments.length < 2) return;

    const glowParams = getGlowParams(snakeMass);
    const optimizationConfig = GAME_CONSTANTS.GLOW_OPTIMIZATION;
    glowPulse += glowParams.pulseSpeed;

    // Используем гибкую ширину свечения по массе
    const glowWidth = getGlowWidthByMass(snakeMass) * currentWidth;
    let alpha = glowParams.baseAlpha;
    if (glowParams.useSimplification) {
      alpha *= optimizationConfig.LARGE_SNAKE_SIMPLIFICATION.reducedAlpha;
    }

    // HSV rainbow for slither.io style
    function hsvToRgb(h, s, v) {
      let f = (n, k = (n + h / 60) % 6) =>
        v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
      return {
        r: Math.round(f(5) * 255),
        g: Math.round(f(3) * 255),
        b: Math.round(f(1) * 255)
      };
    }

    // Собираем все точки змейки для единой линии
    const points = [];
    points.push({ x: snakeHead.x, y: snakeHead.y });
    for (let i = 0; i < snakeSegments.length; i++) {
      points.push({ x: snakeSegments[i].x, y: snakeSegments[i].y });
    }

    // Цвет линии рассчитываем по фазе (один цвет на всю glow-линию, плавно переливается)
    const t = (glowPulse * 0.2) % 1;
    const hue = t * 360;
    const rgb = hsvToRgb(hue, 0.8, 1.0);
    const color = (rgb.r << 16) | (rgb.g << 8) | rgb.b;

    bodyGlowGraphics.lineStyle({
      width: glowWidth,
      color: color,
      alpha: alpha,
      cap: PIXI.LINE_CAP.ROUND,
      join: PIXI.LINE_JOIN.ROUND,
    });

    // Рисуем единую плавную линию вдоль всей змейки
    if (points.length > 2) {
      bodyGlowGraphics.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        bodyGlowGraphics.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      // Последний сегмент
      bodyGlowGraphics.quadraticCurveTo(
        points[points.length - 1].x,
        points[points.length - 1].y,
        points[points.length - 1].x,
        points[points.length - 1].y
      );
    } else {
      bodyGlowGraphics.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        bodyGlowGraphics.lineTo(points[i].x, points[i].y);
      }
    }
  }

  // Плавное масштабирование камеры
  function updateCamera(delta) {
    // Исправлено: корректная формула для плавного уменьшения масштаба при росте змейки
    const minScale = uiManager.isMobile ? GAME_CONSTANTS.MIN_SCALE.mobile : GAME_CONSTANTS.MIN_SCALE.desktop;
    const maxScale = uiManager.isMobile ? GAME_CONSTANTS.MAX_SCALE.mobile : GAME_CONSTANTS.MAX_SCALE.desktop;
    // t = 0 (маленькая змейка) -> minScale, t = 1 (большая) -> maxScale
    const t = Math.min(Math.max(Math.log(snakeMass + 1) / Math.log(50000), 0), 1);
    const targetScale = minScale - (minScale - maxScale) * t;

    uiManager.currentScale += (targetScale - uiManager.currentScale) * GAME_CONSTANTS.SCALE_SPEED * delta * 0.5;
    const targetX = -snakeHead.x * uiManager.currentScale + app.screen.width / 2;
    const targetY = -snakeHead.y * uiManager.currentScale + app.screen.height / 2;
    gameWorld.x = targetX;
    gameWorld.y = targetY;
    gameWorld.scale.set(uiManager.currentScale);
  }

  // Управление движением с динамическими параметрами поворота
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
          console.log(`Food consumed: ID ${food.id}, Type: ${food.type || 'unknown'}, Points: ${food.points}`);
          if (gameWorld.children.includes(food)) {
            gameWorld.removeChild(food);
          }
          food.destroy({ children: true });
          app.ticker.remove(animate);
          callback();
        }
      } catch (error) {
        console.error(`Error during food animation: ${error}`);
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
      const initialMassLoss = Math.min(snakeMass * 0.01, 5);
      targetMass = Math.max(10, targetMass - initialMassLoss);
      snakeMass = Math.max(10, snakeMass - initialMassLoss);
      // УБРАН ПРОФИТ - обновляем только токены
      uiManager.updateTokens(snakeMass, false);
    }

    wasBoosting = uiManager.isBoosting;

    // Интерполяция массы
    if (Math.abs(targetMass - snakeMass) > 0.01) {
      const lerpFactor = snakeMass > 100 ? 0.8 : 0.2;
      snakeMass += (targetMass - snakeMass) * lerpFactor * delta;
      // УБРАН ПРОФИТ - обновляем только токены
      uiManager.updateTokens(snakeMass, false);
    }

    const canBoost = snakeMass > 11 && targetMass > 11 && uiManager.isBoosting;

    if (canBoost) {
      const massLost = GAME_CONSTANTS.BOOST_MASS_LOSS * delta;
      targetMass = Math.max(10, targetMass - massLost);
      if (targetMass <= 11) {
        uiManager.isBoosting = false;
      }
    }

    // Получаем динамические параметры поворота
    const rotationParams = getRotationParams(snakeMass);
    currentAngle = lerpAngle(currentAngle, uiManager.getTargetAngle(), rotationParams.rotationSpeed * delta);
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
        return false;
      }

      const headAngle = snakeHead.rotation - Math.PI / 2;
      const faceOffset = snakeHead.height * 0.5;
      const faceX = snakeHead.x + Math.cos(headAngle) * faceOffset;
      const faceY = snakeHead.y + Math.sin(headAngle) * faceOffset;

      const foodSize = food.size || 10;
      const distanceToHead = Math.hypot(food.x - faceX, food.y - faceY);
      const collisionThreshold = (snakeHead.width / 2) + (foodSize / 2);

      if (distanceToHead < collisionThreshold || distanceToHead < snakeHead.width) {
        const points = food.type === "boost" ? (snakeMass > 100 ? 0.05 : 0.1) : food.points;
        targetMass += points;
        // УБРАН ПРОФИТ - обновляем только токены без профита
        uiManager.updateTokens(snakeMass + points, false);
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
    
    // ОПТИМИЗИРОВАННОЕ обновление свечения - не каждый кадр
    glowUpdateCounter++;
    if (glowUpdateCounter >= GAME_CONSTANTS.GLOW_OPTIMIZATION.GLOW_UPDATE_INTERVAL) {
      drawOptimizedSnakeGlow(canBoost, width);
      glowUpdateCounter = 0;
    }

    // Спавн орбов при бусте
    if (canBoost && snakeSegments.length > 5) {
      orbSpawnTimer += delta / 60;
      const orbInterval = snakeMass > 100 ? 0.06 : GAME_CONSTANTS.ORB_SPAWN_INTERVAL.small;
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
  });

  // Функция плавного поворота с динамическим ограничением
  function lerpAngle(start, end, t) {
    const twoPi = 2 * Math.PI;
    start = ((start % twoPi) + twoPi) % twoPi;
    end = ((end % twoPi) + twoPi) % twoPi;
    let diff = end - start;
    if (diff > Math.PI) diff -= twoPi;
    if (diff < -Math.PI) diff += twoPi;
    
    // Получаем максимальную угловую скорость для текущей массы
    const rotationParams = getRotationParams(snakeMass);
    const maxChange = rotationParams.maxAngularSpeed * t;
    diff = Math.max(-maxChange, Math.min(maxChange, diff));
    return ((start + diff) % twoPi + twoPi) % twoPi;
  }

  function getRotationConfigByMass(mass) {
    const configs = GAME_CONSTANTS.ROTATION_CONFIG;
    for (const key in configs) {
      const { massRange } = configs[key];
      if (mass >= massRange[0] && mass < massRange[1]) {
        return configs[key];
      }
    }
    return configs.mega; // fallback
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

  function updateSnakeMovement(snake) {
    const config = getRotationConfigByMass(snake.mass);
    snake.rotationSpeed = config.rotationSpeed;
    snake.maxAngularSpeed = config.maxAngularSpeed;
    snake.speed = config.speed;
  }

  function drawSnakeGlow(snake) {
    let glowWidth = getGlowWidthByMass(snake.mass);
    let baseAlpha = 0.5;
    let updateInterval = GAME_CONSTANTS.GLOW_OPTIMIZATION.GLOW_UPDATE_INTERVAL;

    // Оптимизация для сверхбольших змей
    if (snake.mass >= GAME_CONSTANTS.GLOW_OPTIMIZATION.ultraLargeGlow.massThreshold) {
      glowWidth = GAME_CONSTANTS.GLOW_OPTIMIZATION.ultraLargeGlow.width;
      baseAlpha = GAME_CONSTANTS.GLOW_OPTIMIZATION.ultraLargeGlow.baseAlpha;
      updateInterval = GAME_CONSTANTS.GLOW_OPTIMIZATION.ultraLargeGlow.updateInterval;
    }

    // ...draw glow using glowWidth, baseAlpha, updateInterval...
  }
});