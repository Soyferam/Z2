import { FoodManager } from "./food.js";
import { UIManager } from "./ui.js";
import { GAME_CONSTANTS } from "./constants.js";
import { BotSnake } from "./bots.js";

console.log("Attempting to load bots.js");

let bots = [];

window.addEventListener("DOMContentLoaded", async () => {
  console.log("Инициализация игры начата");
  const app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x1a1a1a,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    resizeTo: window,
  });

  const gameContainer = document.getElementById("game-container");
  if (!gameContainer) {
    console.error("Контейнер игры (#game-container) не найден!");
    alert("Ошибка: контейнер игры не найден.");
    return;
  }
  gameContainer.appendChild(app.view);
  app.stage.interactive = true;
  app.stage.hitArea = new PIXI.Rectangle(0, 0, app.screen.width, app.screen.height);
  console.log("PIXI приложение создано, canvas добавлен в #game-container");

  const colorToTextureMap = {
    '0xff3333': 'assets/eye-area-red.png',
    '0x33ff33': 'assets/eye-area-green.png',
    '0xffff33': 'assets/eye-area-yellow.png',
    '0xff33ff': 'assets/eye-area-purple.png',
    '0x33ffff': 'assets/eye-area-cyan.png',
    '0xff9933': 'assets/eye-area-orange.png',
    '0x9933ff': 'assets/eye-area-magenta.png',
    '0x3333ff': 'assets/eye-area-blue.png',
  };

  let textures;
  try {
    textures = await PIXI.Assets.load([
      "assets/snake-head.png",
      "assets/token-food.png",
      "assets/ton.png",
      ...Object.values(colorToTextureMap),
    ]);
    console.log("Текстуры загружены:", Object.keys(textures));
    if (!textures["assets/snake-head.png"]) {
      throw new Error("Текстура snake-head.png не загружена");
    }
  } catch (error) {
    console.error("Ошибка загрузки текстур:", error);
    alert("Ошибка загрузки текстур. Проверьте файлы в папке assets.");
    return;
  }

  const gameWorld = new PIXI.Container();
  gameWorld.sortableChildren = true;
  app.stage.addChild(gameWorld);
  console.log("gameWorld добавлен в stage");

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
  console.log("Сетка мира отрисована");

  const boundary = new PIXI.Graphics();
  boundary.lineStyle(2, 0xFFFFFF, 1);
  boundary.drawCircle(GAME_CONSTANTS.WORLD_CENTER.x, GAME_CONSTANTS.WORLD_CENTER.y, GAME_CONSTANTS.WORLD_RADIUS);
  gameWorld.addChild(boundary);
  console.log("Граница мира отрисована");

  const snakeHead = new PIXI.Sprite(textures["assets/snake-head.png"]);
  snakeHead.anchor.set(0.5);
  const initialWidth = GAME_CONSTANTS.SNAKE_GROWTH.WIDTH_BASE + Math.sqrt(GAME_CONSTANTS.BASE_MASS) * GAME_CONSTANTS.SNAKE_GROWTH.WIDTH_MULTIPLIER;
  snakeHead.width = initialWidth;
  snakeHead.height = initialWidth;
  snakeHead.x = GAME_CONSTANTS.WORLD_CENTER.x;
  snakeHead.y = GAME_CONSTANTS.WORLD_CENTER.y;
  snakeHead.zIndex = 1;
  snakeHead.visible = true;
  snakeHead.alpha = 1;
  gameWorld.addChild(snakeHead);
  console.log("Голова змейки игрока создана:", {
    x: snakeHead.x,
    y: snakeHead.y,
    width: snakeHead.width,
    visible: snakeHead.visible,
    alpha: snakeHead.alpha
  });

  const snakeBodyGraphics = new PIXI.Graphics();
  snakeBodyGraphics.zIndex = 0;
  snakeBodyGraphics.visible = true;
  snakeBodyGraphics.alpha = 1;
  gameWorld.addChild(snakeBodyGraphics);
  console.log("Графика тела змейки создана");

  const bodyGlowGraphics = new PIXI.Graphics();
  bodyGlowGraphics.zIndex = -0.5;
  bodyGlowGraphics.visible = true;
  bodyGlowGraphics.alpha = 1;
  gameWorld.addChild(bodyGlowGraphics);
  console.log("Графика свечения тела создана");

  const snakeSegments = [];
  let snakeMass = GAME_CONSTANTS.BASE_MASS;
  let targetMass = GAME_CONSTANTS.BASE_MASS;
  let glowPulse = 0;
  let orbSpawnTimer = 0;
  let growthLerp = 1;
  let wasBoosting = false;
  let glowUpdateCounter = 0;
  let initialSafeFrames = 60;

  const initialSegmentCount = Math.floor(GAME_CONSTANTS.SNAKE_GROWTH.LENGTH_BASE / (initialWidth * GAME_CONSTANTS.SNAKE_GROWTH.SEGMENT_SPACING));
  for (let i = 0; i < initialSegmentCount; i++) {
    snakeSegments.push({
      x: snakeHead.x,
      y: snakeHead.y + i * initialWidth * GAME_CONSTANTS.SNAKE_GROWTH.SEGMENT_SPACING,
      width: initialWidth,
    });
  }
  console.log("Сегменты змейки игрока созданы:", snakeSegments.length, "сегментов");

  const foodManager = new FoodManager(
    gameWorld,
    GAME_CONSTANTS.WORLD_RADIUS,
    textures["assets/token-food.png"],
    textures["assets/ton.png"],
    [{ head: snakeHead, alive: true }, ...bots]
  );
  foodManager.initialize();
  console.log("FoodManager инициализирован");

  const uiManager = new UIManager(app, gameWorld, snakeHead, GAME_CONSTANTS.WORLD_RADIUS, (newMass) => {
    targetMass = Math.max(10, newMass);
    snakeMass = targetMass;
    uiManager.updateTokens(snakeMass, false);
    growthLerp = 0;
  }, foodManager, bots);
  console.log("UIManager инициализирован");

  // Добавляем обработку буста через мышь на десктопе
  if (!uiManager.isMobile) {
    app.stage.on("mousedown", () => {
      if (snakeMass > 11) {
        uiManager.isBoosting = true;
        console.log("Буст активирован через нажатие мыши");
      } else {
        console.log("Буст не активирован: недостаточно массы", snakeMass);
      }
    });
    app.stage.on("mouseup", () => {
      uiManager.isBoosting = false;
      console.log("Буст деактивирован через отпускание мыши");
    });
  }

  function createBot() {
    const mass = 10 + Math.random() * 50;
    const minDistance = 500;
    const maxDistance = 1000;
    let startX, startY;
    let attempts = 0;
    const maxAttempts = 10;
    let isValidPosition = false;

    do {
      const angle = Math.random() * 2 * Math.PI;
      const distance = minDistance + Math.random() * (maxDistance - minDistance);
      startX = snakeHead.x + Math.cos(angle) * distance;
      startY = snakeHead.y + Math.sin(angle) * distance;
      const dx = startX - GAME_CONSTANTS.WORLD_CENTER.x;
      const dy = startY - GAME_CONSTANTS.WORLD_CENTER.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = GAME_CONSTANTS.WORLD_RADIUS * 0.8;
      if (dist > maxDist) {
        const angleToCenter = Math.atan2(dy, dx);
        startX = GAME_CONSTANTS.WORLD_CENTER.x + Math.cos(angleToCenter) * maxDist;
        startY = GAME_CONSTANTS.WORLD_CENTER.y + Math.sin(angleToCenter) * maxDist;
      }
      const dxPlayer = startX - snakeHead.x;
      const dyPlayer = startY - snakeHead.y;
      const distToPlayer = Math.sqrt(dxPlayer * dxPlayer + dyPlayer * dyPlayer);
      isValidPosition = distToPlayer >= minDistance;
      attempts++;
    } while (!isValidPosition && attempts < maxAttempts);

    if (!isValidPosition) {
      console.warn("Не удалось найти подходящую позицию для бота, используется запасная");
      startX = GAME_CONSTANTS.WORLD_CENTER.x + (Math.random() - 0.5) * GAME_CONSTANTS.WORLD_RADIUS * 0.5;
      startY = GAME_CONSTANTS.WORLD_CENTER.y + (Math.random() - 0.5) * GAME_CONSTANTS.WORLD_RADIUS * 0.5;
    }

    const color = GAME_CONSTANTS.BOT_COLORS[Math.floor(Math.random() * GAME_CONSTANTS.BOT_COLORS.length)];
    const headTexturePath = colorToTextureMap[`0x${color.toString(16).padStart(6, "0")}`] || "assets/snake-head.png";
    console.log(`Создаём бота: масса=${mass}, позиция=(${startX}, ${startY}), цвет=0x${color.toString(16).padStart(6, "0")}, текстура=${headTexturePath}`);
    const bot = new BotSnake(gameWorld, textures, mass, startX, startY, foodManager, color, snakeHead, app);
    bots.push(bot);
  }

  for (let i = 0; i < GAME_CONSTANTS.BOT_COUNT; i++) {
    createBot();
  }
  console.log(`Создано ботов: ${bots.length}`);

  uiManager.updateTokens(Math.floor(snakeMass), false);

  uiManager.currentScale = uiManager.isMobile ? GAME_CONSTANTS.MIN_SCALE.mobile : GAME_CONSTANTS.MIN_SCALE.desktop;
  gameWorld.x = -snakeHead.x * uiManager.currentScale + app.screen.width / 2;
  gameWorld.y = -snakeHead.y * uiManager.currentScale + app.screen.height / 2;
  gameWorld.scale.set(uiManager.currentScale);
  console.log("Камера инициализирована:", {
    gameWorldX: gameWorld.x,
    gameWorldY: gameWorld.y,
    scale: uiManager.currentScale
  });

  function calculateRotationSpeed(mass) {
    const config = GAME_CONSTANTS.ROTATION_FORMULA;
    let rotationSpeed = config.BASE_ROTATION_SPEED - (mass * config.MASS_SLOWDOWN_FACTOR);
    return Math.max(config.MIN_ROTATION_SPEED, Math.min(config.MAX_ROTATION_SPEED, rotationSpeed));
  }

  function getGlowParams(mass) {
    const configs = GAME_CONSTANTS.GLOW_OPTIMIZATION;
    let foundConfig = null;
    for (const [key, config] of Object.entries(configs)) {
      if (config && config.massRange && Array.isArray(config.massRange)) {
        if (mass >= config.massRange[0] && mass < config.massRange[1]) {
          foundConfig = config;
          break;
        }
      }
    }
    return foundConfig || configs.large;
  }

  function calculateSnakeParams(mass) {
    const baseLength = GAME_CONSTANTS.SNAKE_GROWTH.LENGTH_BASE;
    const lengthMultiplier = GAME_CONSTANTS.SNAKE_GROWTH.LENGTH_MULTIPLIER;
    const length = baseLength + mass * lengthMultiplier;
    const baseWidth = GAME_CONSTANTS.SNAKE_GROWTH.WIDTH_BASE;
    const widthMultiplier = GAME_CONSTANTS.SNAKE_GROWTH.WIDTH_MULTIPLIER;
    const width = baseWidth + Math.sqrt(mass) * widthMultiplier;
    return { width, length };
  }

  function updateSnakeSize() {
    const { width } = calculateSnakeParams(snakeMass);
    snakeHead.width = width;
    snakeHead.height = width;
    console.log("Обновлён размер головы змейки:", width);
    return { width };
  }

  function updateSnakeSegments(delta, canBoost) {
    const { width, length } = calculateSnakeParams(snakeMass);
    const baseSegmentDistance = width * GAME_CONSTANTS.SNAKE_GROWTH.SEGMENT_SPACING;
    const segmentDistance = baseSegmentDistance;
    const maxSegments = Math.floor(length / segmentDistance);
    snakeSegments.unshift({
      x: snakeHead.x,
      y: snakeHead.y,
      width: width,
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
    console.log("Сегменты змейки обновлены, количество:", snakeSegments.length);
    return { width, segmentDistance };
  }

  function drawSnakeBody() {
    snakeBodyGraphics.clear();
    if (snakeSegments.length < 2) {
      console.warn("Недостаточно сегментов для отрисовки тела:", snakeSegments.length);
      return;
    }
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
    console.log("Тело змейки отрисовано");
  }

  function interpolateColor(color1, color2, factor) {
    const r = Math.round(color1.r + (color2.r - color1.r) * factor);
    const g = Math.round(color1.g + (color2.g - color1.g) * factor);
    const b = Math.round(color1.b + (color2.b - color1.b) * factor);
    return (r << 16) | (g << 8) | b;
  }

  function hexToRgb(hex) {
    const r = (hex >> 16) & 255;
    const g = (hex >> 8) & 255;
    const b = hex & 255;
    return { r, g, b };
  }

  function drawOptimizedSnakeGlow(isBoosting, currentWidth) {
    bodyGlowGraphics.clear();
    if (!isBoosting || snakeSegments.length < 2) return;
    const glowParams = getGlowParams(snakeMass);
    const optimizationConfig = GAME_CONSTANTS.GLOW_OPTIMIZATION;
    glowPulse += glowParams.pulseSpeed;
    const glowWidth = getGlowWidthByMass(snakeMass) * currentWidth;
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
    points.push({ x: snakeHead.x, y: snakeHead.y });
    for (let i = 0; i < snakeSegments.length; i++) {
      points.push({ x: snakeSegments[i].x, y: snakeSegments[i].y });
    }
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
    if (points.length > 2) {
      bodyGlowGraphics.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        bodyGlowGraphics.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
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

  function updateCamera(delta) {
    const minScale = uiManager.isMobile ? GAME_CONSTANTS.MIN_SCALE.mobile : GAME_CONSTANTS.MIN_SCALE.desktop;
    const maxScale = uiManager.isMobile ? GAME_CONSTANTS.MAX_SCALE.mobile : GAME_CONSTANTS.MAX_SCALE.desktop;
    const t = Math.min(Math.max(Math.log(snakeMass + 1) / Math.log(50000), 0), 1);
    const targetScale = minScale - (minScale - maxScale) * t;
    uiManager.currentScale += (targetScale - uiManager.currentScale) * GAME_CONSTANTS.SCALE_SPEED * delta * 0.5;
    const targetX = -snakeHead.x * uiManager.currentScale + app.screen.width / 2;
    const targetY = -snakeHead.y * uiManager.currentScale + app.screen.height / 2;
    gameWorld.x = targetX;
    gameWorld.y = targetY;
    gameWorld.scale.set(uiManager.currentScale);
    console.log("Камера обновлена:", {
      gameWorldX: gameWorld.x,
      gameWorldY: gameWorld.y,
      scale: uiManager.currentScale,
      snakeHeadX: snakeHead.x,
      snakeHeadY: snakeHead.y
    });
  }

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
          console.log(`Еда съедена: ID ${food.id}, Тип: ${food.type || 'unknown'}, Очки: ${food.points}`);
          if (gameWorld.children.includes(food)) {
            gameWorld.removeChild(food);
          }
          food.destroy({ children: true });
          app.ticker.remove(animate);
          callback();
        }
      } catch (error) {
        console.error(`Ошибка анимации еды: ${error}`);
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

  function playerDie() {
    foodManager.createDebrisFromSnake(snakeMass, snakeSegments);
    foodManager.createTonFromSnake(snakeMass, snakeSegments);

    const duration = 0.5;
    let time = 0;
    const initialAlpha = snakeHead.alpha || 1;
    const initialScale = snakeHead.scale.x || 1;

    const animate = (delta) => {
      try {
        time += delta / 60;
        const progress = Math.min(time / duration, 1);

        snakeHead.alpha = initialAlpha * (1 - progress);
        snakeBodyGraphics.alpha = initialAlpha * (1 - progress);
        bodyGlowGraphics.alpha = initialAlpha * (1 - progress);

        snakeHead.scale.set(initialScale * (1 - progress * 0.5));
        snakeBodyGraphics.scale.set(initialScale * (1 - progress * 0.5));
        bodyGlowGraphics.scale.set(initialScale * (1 - progress * 0.5));

        if (progress >= 1) {
          gameWorld.removeChild(snakeHead);
          gameWorld.removeChild(snakeBodyGraphics);
          gameWorld.removeChild(bodyGlowGraphics);
          snakeHead.destroy();
          snakeBodyGraphics.destroy();
          bodyGlowGraphics.destroy();
          app.ticker.remove(animate);

          alert("Игра окончена! Вы столкнулись с другой змеёй.");
          window.location.reload();
        }
      } catch (error) {
        console.error(`Ошибка в анимации смерти игрока: ${error}`);
        gameWorld.removeChild(snakeHead);
        gameWorld.removeChild(snakeBodyGraphics);
        gameWorld.removeChild(bodyGlowGraphics);
        snakeHead.destroy();
        snakeBodyGraphics.destroy();
        bodyGlowGraphics.destroy();
        app.ticker.remove(animate);
        alert("Игра окончена! Произошла ошибка.");
        window.location.reload();
      }
    };

    app.ticker.add(animate);
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

  function getGlowWidthByMass(mass) {
    const arr = GAME_CONSTANTS.GLOW_OPTIMIZATION.glowWidthByMass;
    for (const item of arr) {
      if (mass >= item.range[0] && mass < item.range[1]) {
        return item.width;
      }
    }
    return arr[arr.length - 1].width;
  }

  app.ticker.add((delta) => {
    if (uiManager.isBoosting && !wasBoosting && snakeMass > 11 && targetMass > 11) {
      const initialMassLoss = Math.min(snakeMass * 0.01, 5);
      targetMass = Math.max(10, targetMass - initialMassLoss);
      snakeMass = targetMass;
      uiManager.updateTokens(snakeMass, false);
    }
    wasBoosting = uiManager.isBoosting;
    const canBoost = snakeMass > 11 && targetMass > 11 && uiManager.isBoosting;
    if (Math.abs(targetMass - snakeMass) > 0.01) {
      if (canBoost) {
        snakeMass = targetMass;
      } else {
        const lerpFactor = snakeMass > 100 ? 0.8 : 0.2;
        snakeMass += (targetMass - snakeMass) * lerpFactor * delta;
      }
      uiManager.updateTokens(snakeMass, false);
    }
    if (canBoost) {
      const massLost = GAME_CONSTANTS.BOOST_MASS_LOSS * delta;
      const newTargetMass = Math.max(10, targetMass - massLost);
      targetMass = newTargetMass;
      snakeMass = newTargetMass;
      if (targetMass <= 11) {
        uiManager.isBoosting = false;
      }
    }
    currentAngle = slitherLerpAngle(currentAngle, uiManager.getTargetAngle(), snakeMass, delta);
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
    console.log("Позиция змейки обновлена:", { x: snakeHead.x, y: snakeHead.y, rotation: snakeHead.rotation });

    const { width } = updateSnakeSize();
    const { segmentDistance } = updateSnakeSegments(delta, canBoost);
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
        if (food.type === "ton") {
          uiManager.addTon(food.points);
        } else {
          const points = food.type === "boost" ? (snakeMass > 100 ? 0.05 : 0.1) : food.points;
          targetMass += points;
          uiManager.updateTokens(snakeMass + points, false);
        }
        animateFoodConsumption(food, () => {
          if (food.type !== "boost" && food.type !== "ton") {
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
    glowUpdateCounter++;
    if (glowUpdateCounter >= GAME_CONSTANTS.GLOW_OPTIMIZATION.GLOW_UPDATE_INTERVAL) {
      drawOptimizedSnakeGlow(canBoost, width);
      glowUpdateCounter = 0;
    }
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
        if (foodManager.tokenFoodTexture) {
          const logo = new PIXI.Sprite(foodManager.tokenFoodTexture);
          logo.anchor.set(0.5);
          logo.width = orb.size * 0.8;
          logo.height = orb.size * 0.8;
          orb.addChild(logo);
        }
        orb.x = tailPos.x + (Math.random() - 0.5) * 10;
        orb.y = tailPos.y + (Math.random() - 0.5) * 10;
        gameWorld.addChild(orb);
        foodManager.foodItems.push(orb);
        orbSpawnTimer = 0;
      }
    } else {
      orbSpawnTimer = 0;
    }
    foodManager.updateSnakes([{ head: snakeHead, alive: true }, ...bots.filter(bot => bot.alive)]);
    bots.forEach((bot, index) => {
      if (bot.alive) {
        bot.update(delta, foodManager, bots, snakeSegments);
      }
    });
    bots = bots.filter(bot => bot.alive);
    while (bots.length < GAME_CONSTANTS.BOT_COUNT) {
      createBot();
    }
    if (initialSafeFrames > 0) {
      initialSafeFrames--;
      console.log(`Пропуск проверки столкновений, осталось кадров: ${initialSafeFrames}`);
    } else {
      let playerDead = false;
      for (const bot of bots) {
        for (let i = 0; i < bot.segments.length; i++) {
          const seg = bot.segments[i];
          const dist = Math.hypot(snakeHead.x - seg.x, snakeHead.y - seg.y);
          if (dist < snakeHead.width / 2 + seg.width / 2) {
            console.log(`Обнаружено столкновение с ботом на сегменте ${i}, позиция (${seg.x}, ${seg.y})`);
            playerDead = true;
            break;
          }
        }
        if (playerDead) break;
      }
      if (playerDead) {
        playerDie();
        return;
      }
    }
    foodManager.update(delta, snakeHead);
    updateCamera(delta);
    uiManager.updateMinimap();
  });

  function calculateSpeed(mass, isBoosting) {
    const baseSpeed = GAME_CONSTANTS.BASE_SPEED;
    const boostSpeed = GAME_CONSTANTS.BOOST_SPEED;
    const config = GAME_CONSTANTS.SPEED_FORMULA;
    let speedMultiplier = 1.0 - (mass * config.MASS_SLOWDOWN_FACTOR);
    speedMultiplier = Math.max(config.MIN_SPEED_MULTIPLIER, Math.min(config.MAX_SPEED_MULTIPLIER, speedMultiplier));
    return isBoosting ? boostSpeed * speedMultiplier : baseSpeed * speedMultiplier;
  }
});