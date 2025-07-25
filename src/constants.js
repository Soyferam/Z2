// Обновленные константы для src/constants.js
export const GAME_CONSTANTS = {
  WORLD_RADIUS: 2500,
  WORLD_CENTER: { x: 2500, y: 2500 },
  
  // Улучшенные параметры скорости
  BASE_SPEED: 5.8,         // Базовая скорость как в оригинале
  BOOST_SPEED: 8.5,        // Скорость буста
  BOOST_MASS_LOSS: 0.2,    // Потеря массы в секунду при бусте
  
  BASE_MASS: 10,
  MASS_SCALE: 1000,
  BASE_WIDTH: 15,          // Уменьшена базовая ширина
  BODY_COLOR: 0x1AC9FF,
  FOOD_COUNT: 1000,
  GRID_SIZE: 100,
  
  FOOD_COLORS: [
    { stops: 0.6, inner: 0xFF3333, outer: 0xCC0000 },
    { stops: 0.6, inner: 0x3366FF, outer: 0x0033CC },
    { stops: 0.65, inner: 0x66FF33, outer: 0x33CC00 },
    { stops: 0.7, inner: 0xFFFF33, outer: 0xCCCC00 },
    { stops: 0.7, inner: 0xFF33CC, outer: 0xCC0099 },
  ],
  
  // Обновленные параметры камеры
  MIN_SCALE: { mobile: 2.8, desktop: 3.2 }, 
  MAX_SCALE: { mobile: 0.8, desktop: 1.0 },
  SCALE_SPEED: 0.03,
  
  // Улучшенные параметры поворота
  ROTATION_SPEED: 0.3,     // Немного медленнее для плавности
  MAX_ANGULAR_SPEED: 0.3,  // Ограничение скорости поворота
  
  HISTORY_LENGTH: 150,      // Увеличено для более длинных змеек
  
  // Обновленные интервалы спавна орбов
  ORB_SPAWN_INTERVAL: { 
    small: 0.08,   // 12.5 орбов в секунду для маленьких змеек
    large: 0.05    // 20 орбов в секунду для больших змеек
  },
  
  // Новые константы для улучшенной логики
  SNAKE_GROWTH: {
    LENGTH_BASE: 10,         // Базовая длина
    LENGTH_MULTIPLIER: 6,    // Множитель роста длины
    WIDTH_BASE: 15,          // Базовая ширина
    WIDTH_MULTIPLIER: 0.6,   // Множитель роста ширины
    SEGMENT_SPACING: 0.7,    // Расстояние между сегментами (множитель ширины)
    TAIL_TAPER: 0.3,         // Минимальная толщина хвоста (30% от основной)
  },
  
  SPEED_REDUCTION: {
    BASE_FACTOR: 0.08,       // Базовый фактор замедления
    MIN_SPEED: 0.4,          // Минимальная скорость (40% от базовой)
  }
};