export const GAME_CONSTANTS = {
  // === БОТЫ ===
  BOT_COUNT: 20,                          // Количество ботов на карте
  BOT_COLORS: [
    0xFF3333, // Красный
    0x33FF33, // Зелёный
    0xFFFF33, // Жёлтый
    0xFF33FF, // Фиолетовый
    0x33FFFF, // Циан
    0xFF9933, // Оранжевый
    0x9933FF, // Пурпурный
  ],                                      // Цвета для ботов

  // === ПАРАМЕТРЫ КРИПТОВАЛЮТЫ (TON) ===
  TON_DROP: {
    MIN_TON_PER_SNAKE: 1,               // Минимальное количество TON за змею
    MAX_TON_PER_SNAKE: 20,              // Максимальное количество TON за змею
    TON_PER_DROP: 0.5,                  // Количество TON в одном куске еды
    TON_SIZE: 12,                       // Размер TON-еды
    TON_COLOR: { stops: 0.6, inner: 0x33CCFF, outer: 0x0099CC }, // Цвет TON
  },

  // === РАЗМЕРЫ МИРА ===
  WORLD_RADIUS: 2500,                    // Радиус игрового мира
  WORLD_CENTER: { x: 2500, y: 2500 },    // Центр игрового мира
  
  // === ПАРАМЕТРЫ СКОРОСТИ И ПОВОРОТА (УПРОЩЕННЫЕ КАК В SLITHER.IO) ===
  BASE_SPEED: 3.0,                       // Базовая скорость движения змейки
  BOOST_SPEED: 6.0,                      // Скорость при ускорении (бусте)
  BOOST_MASS_LOSS: 0.2,                  // Потеря массы в секунду при бусте
  
  // Единая формула поворота как в Slither.io
  ROTATION_FORMULA: {
    // Базовая скорость поворота для маленьких змей
    BASE_ROTATION_SPEED: 0.02,
    
    // Коэффициент замедления поворота с ростом массы
    MASS_SLOWDOWN_FACTOR: 0.00008,
    
    // Минимальная скорость поворота (чтобы большие змеи могли поворачивать)
    MIN_ROTATION_SPEED: 0.6,
    
    // Максимальная скорость поворота
    MAX_ROTATION_SPEED: 0.08,
    
    // Плавность поворота (lerp factor)
    SMOOTHNESS: 0.12
  },
  
  // Единая формула скорости как в Slither.io  
  SPEED_FORMULA: {
    // Коэффициент замедления от массы
    MASS_SLOWDOWN_FACTOR: 0.00012,
    
    // Минимальная скорость
    MIN_SPEED_MULTIPLIER: 0.3,
    
    // Максимальная скорость  
    MAX_SPEED_MULTIPLIER: 1.0
  },
  
  // === БАЗОВЫЕ ПАРАМЕТРЫ ЗМЕЙКИ ===
  BASE_MASS: 10,                         // Базовая масса змейки при старте
  MASS_SCALE: 1000,                      // Масштаб для расчетов массы
  BASE_WIDTH: 15,                        // Базовая ширина головы змейки
  BODY_COLOR: 0x1AC9FF,                  // Цвет тела змейки игрока
  
  // === ПАРАМЕТРЫ ЕДЫ ===
  FOOD_COUNT: 1000,                      // Количество еды на карте
  GRID_SIZE: 100,                        // Размер сетки для фона
  
  // Цвета еды с градиентами
  FOOD_COLORS: [
    { stops: 0.6, inner: 0xFF3333, outer: 0xCC0000 },   // Красный
    { stops: 0.6, inner: 0x3366FF, outer: 0x0033CC },   // Синий
    { stops: 0.65, inner: 0x66FF33, outer: 0x33CC00 },  // Зеленый
    { stops: 0.7, inner: 0xFFFF33, outer: 0xCCCC00 },   // Желтый
    { stops: 0.7, inner: 0xFF33CC, outer: 0xCC0099 },   // Розовый
  ],
  
  // === ПАРАМЕТРЫ КАМЕРЫ ===
  MIN_SCALE: { mobile: 2.8, desktop: 3.2 },  // Минимальный зум камеры
  MAX_SCALE: { mobile: 0.8, desktop: 1.0 },   // Максимальный зум камеры
  SCALE_SPEED: 0.03,                          // Скорость изменения зума
  
  // === ПАРАМЕТРЫ РОСТА ЗМЕЙКИ ===
  HISTORY_LENGTH: 50,                     // Максимальная длина истории позиций
  
  ORB_SPAWN_INTERVAL: { 
    small: 0.08,
    large: 0.05
  },

  
  
  SNAKE_GROWTH: {
    LENGTH_BASE: 5,
    LENGTH_MULTIPLIER: 3,
    WIDTH_BASE: 15,
    WIDTH_MULTIPLIER: 0.6,
    SEGMENT_SPACING: 0.4,
    TAIL_TAPER: 0.3,
  },

  GLOW_OPTIMIZATION: {
    MAX_GLOW_SEGMENTS: 50,
    GLOW_UPDATE_INTERVAL: 0.1,
    LARGE_SNAKE_SIMPLIFICATION: {
      threshold: 200,
      segmentSkip: 3,
      reducedAlpha: 0.6,
    },
    glowWidthByMass: [
      { range: [10, 1000], width: 1.4 },
      { range: [1000, 5000], width: 1.3 },
      { range: [5000, 10000], width: 1.2 },
      { range: [10000, 20000], width: 1.2 },
      { range: [20000, 50000], width: 1.2 },
      { range: [50000, Infinity], width: 0.6 }
    ],
    ultraLargeGlow: {
      massThreshold: 40000,
      updateInterval: 0.3,
      baseAlpha: 0.3,
      width: 0.6
    },
    small: {
      massRange: [10, 100],
      glowWidth: 1.0,
      pulseSpeed: 0.03,
      baseAlpha: 0.7,
      colorCount: 4,
    },
    medium: {
      massRange: [100, 500],
      glowWidth: 1.2,
      pulseSpeed: 0.04,
      baseAlpha: 0.65,
      colorCount: 5,
    },
    large: {
      massRange: [500, 1000],
      glowWidth: 1.5,
      pulseSpeed: 0.05,
      baseAlpha: 0.5,
      colorCount: 6,
      useSimplification: true,
    }
  },

  DEBRIS_COUNT_PER_MASS: 0.1,
  DEBRIS_MIN_SIZE: 5,
  DEBRIS_MAX_SIZE: 20,
  DEBRIS_POINTS_PER_MASS: 0.5,
};