// src/game.js
import { FoodManager } from "./food.js";
import { UIManager } from "./ui.js";

console.log("game.js loaded");

// Ожидаем загрузки DOM перед инициализацией игры
window.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM loaded, initializing game");

  // Инициализация приложения Pixi.js
  const app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x1a1a1a,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    resizeTo: window,
  });

  // Добавляем канвас в DOM
  document.getElementById("game-container").appendChild(app.view);
  app.stage.interactive = true;
  app.stage.hitArea = new PIXI.Rectangle(0, 0, app.screen.width, app.screen.height);

  // Загружаем текстуры
  let textures;
  try {
    textures = await PIXI.Assets.load([
      "assets/snake-head.png",
      "assets/snake-body.png",
      "assets/token-food.png",
    ]);
  } catch (error) {
    console.error("Ошибка загрузки текстур:", error);
    return;
  }

  // Создаем контейнер для игрового мира
  const gameWorld = new PIXI.Container();
  app.stage.addChild(gameWorld);

  // Параметры игрового мира
  const worldWidth = 5000;
  const worldHeight = 5000;

  // Отрисовка сетки фона
  const grid = new PIXI.Graphics();
  const gridSize = 100;
  grid.lineStyle(1, 0x333333, 0.5);
  for (let x = 0; x <= worldWidth; x += gridSize) {
    grid.moveTo(x, 0);
    grid.lineTo(x, worldHeight);
  }
  for (let y = 0; y <= worldHeight; y += gridSize) {
    grid.moveTo(0, y);
    grid.lineTo(worldWidth, y);
  }
  gameWorld.addChild(grid);

  // Создаем голову змейки
  const snakeHead = new PIXI.Sprite(textures["assets/snake-head.png"]);
  snakeHead.anchor.set(0.5);
  snakeHead.width = 40;
  snakeHead.height = 40;
  snakeHead.x = 2500;
  snakeHead.y = 2500;
  gameWorld.addChild(snakeHead);

  // Параметры тела змейки
  const bodySegments = [];
  const segmentCount = 5;
  const segmentSize = 40;
  const segmentSpacing = segmentSize * 0.34;
  for (let i = 0; i < segmentCount; i++) {
    const segment = new PIXI.Sprite(textures["assets/snake-body.png"]);
    segment.anchor.set(0.5);
    segment.width = segmentSize;
    segment.height = segmentSize;
    segment.x = snakeHead.x;
    segment.y = snakeHead.y + (i + 1) * segmentSpacing;
    bodySegments.push(segment);
    gameWorld.addChild(segment);
  }

  // Сортировка по zIndex
  gameWorld.sortableChildren = true;
  snakeHead.zIndex = 100;
  bodySegments.forEach((segment, index) => {
    segment.zIndex = 100 - (index + 1);
  });

  // Инициализируем менеджер еды
  const foodManager = new FoodManager(gameWorld, worldWidth, worldHeight, textures["assets/token-food.png"]);
  foodManager.initialize();

  // Инициализируем менеджер UI
  const uiManager = new UIManager(app, gameWorld, snakeHead, worldWidth, worldHeight);

  // Параметры камеры
  let currentScale = 1.5;
  const minScale = 0.5;
  const maxScale = 1.5;
  const minSegments = 5;
  const maxSegments = 50;
  const scaleSpeed = 0.05;

  // Обновление позиции и масштаба камеры
  function updateCamera() {
    const segmentCount = bodySegments.length;
    const t = Math.min(Math.max((segmentCount - minSegments) / (maxSegments - minSegments), 0), 1);
    const targetScale = maxScale - (maxScale - minScale) * t;
    currentScale += (targetScale - currentScale) * scaleSpeed;
    gameWorld.scale.set(currentScale);
    const offsetX = app.screen.width / 2;
    const offsetY = app.screen.height / 2;
    gameWorld.x = -snakeHead.x * currentScale + offsetX;
    gameWorld.y = -snakeHead.y * currentScale + offsetY;
  }

  // Параметры движения змейки
  let currentAngle = 0;
  const rotationSpeed = 0.1;

  // Функция для линейной интерполяции углов
  function lerpAngle(start, end, t) {
    const diff = ((end - start + Math.PI) % (2 * Math.PI)) - Math.PI;
    return start + diff * t;
  }

  // Обработка движения мыши/тача для управления направлением (ПК)
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

  // Основной игровой цикл
  app.ticker.add((delta) => {
    currentAngle = lerpAngle(currentAngle, uiManager.getTargetAngle(), rotationSpeed * delta);
    snakeHead.x += Math.cos(currentAngle) * uiManager.getCurrentSpeed();
    snakeHead.y += Math.sin(currentAngle) * uiManager.getCurrentSpeed();
    snakeHead.rotation = currentAngle + Math.PI / 2;

    snakeHead.x = Math.max(0, Math.min(snakeHead.x, worldWidth));
    snakeHead.y = Math.max(0, Math.min(snakeHead.y, worldHeight));

    for (let i = 0; i < bodySegments.length; i++) {
      const segment = bodySegments[i];
      if (i === 0) {
        const dx = snakeHead.x - segment.x;
        const dy = snakeHead.y - segment.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > segmentSpacing) {
          const angle = Math.atan2(dy, dx);
          segment.x = snakeHead.x - Math.cos(angle) * segmentSpacing;
          segment.y = snakeHead.y - Math.sin(angle) * segmentSpacing;
          segment.rotation = angle + Math.PI / 2;
        }
      } else {
        const prevSegment = bodySegments[i - 1];
        const dx = prevSegment.x - segment.x;
        const dy = prevSegment.y - segment.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > segmentSpacing) {
          const angle = Math.atan2(dy, dx);
          segment.x = prevSegment.x - Math.cos(angle) * segmentSpacing;
          segment.y = prevSegment.y - Math.sin(angle) * segmentSpacing;
          segment.rotation = angle + Math.PI / 2;
        }
      }
    }

    const tokensCollected = foodManager.checkCollision(snakeHead, bodySegments, segmentSize, segmentSpacing);
    uiManager.updateTokens(tokensCollected);

    foodManager.update(delta);
    updateCamera();
    uiManager.updateMinimap();
  });
});