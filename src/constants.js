// Оптимизированные константы для src/constants.js
export const GAME_CONSTANTS = {
  // === РАЗМЕРЫ МИРА ===
  WORLD_RADIUS: 2500,                    // Радиус игрового мира
  WORLD_CENTER: { x: 2500, y: 2500 },    // Центр игрового мира
  
  // === ПАРАМЕТРЫ СКОРОСТИ ===
  BASE_SPEED: 5.8,                       // Базовая скорость движения змейки
  BOOST_SPEED: 8.5,                      // Скорость при ускорении (бусте)
  BOOST_MASS_LOSS: 0.2,                  // Потеря массы в секунду при бусте
  
  // === БАЗОВЫЕ ПАРАМЕТРЫ ЗМЕЙКИ ===
  BASE_MASS: 10,                         // Базовая масса змейки при старте
  MASS_SCALE: 1000,                      // Масштаб для расчетов массы
  BASE_WIDTH: 15,                        // Базовая ширина головы змейки
  BODY_COLOR: 0x1AC9FF,                  // Цвет тела змейки
  
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
  
  // === УЛУЧШЕННЫЕ ПАРАМЕТРЫ ПОВОРОТА ПО РАЗМЕРАМ ===
  ROTATION_CONFIG: {
    // Змейки размером 10-100 (начальные)
    small: {
      massRange: [10, 100],                // Диапазон массы
      rotationSpeed: 0.35,                 // Скорость поворота (высокая маневренность)
      maxAngularSpeed: 0.35,               // Максимальная угловая скорость
      speed: 5.8,
      description: "Маленькие змейки - высокая маневренность"
    },
    // Змейки размером 100-500 (средние)
    medium: {
      massRange: [100, 500],
      rotationSpeed: 0.25,                 // Средняя скорость поворота
      maxAngularSpeed: 0.35,
      speed: 5.5,
      description: "Средние змейки - умеренная маневренность"
    },
    // Змейки размером 500-1000 (большие)
    large: {
      massRange: [500, 1000],
      rotationSpeed: 0.2,                 // Пониженная скорость поворота
      maxAngularSpeed: 0.25,
      speed: 5.2,
      description: "Большие змейки - пониженная маневренность"
    },
    // Змейки размером 1000-5000 (очень большие)
    xlarge: {
      massRange: [1000, 5000],
      rotationSpeed: 0.15,
      maxAngularSpeed: 0.18,
      speed: 4.8,
      description: "Очень большие змейки"
    },
    // Змейки размером 5000-10000 (огромные)
    xxlarge: {
      massRange: [5000, 10000],
      rotationSpeed: 0.12,
      maxAngularSpeed: 0.15,
      speed: 4.3,
      description: "Огромные змейки"
    },
    // Змейки размером 10000-20000 (гигантские)
    xxxlarge: {
      massRange: [10000, 20000],
      rotationSpeed: 0.09,
      maxAngularSpeed: 0.12,
      speed: 3.8,
      description: "Гигантские змейки"
    },
    // Змейки размером 20000-50000 (сверхгигантские)
    ultra: {
      massRange: [20000, 50000],
      rotationSpeed: 0.06,
      maxAngularSpeed: 0.09,
      speed: 3.2,
      description: "Сверхгигантские змейки"
    },
    // Змейки размером 50000+ (мега змейки)
    mega: {
      massRange: [50000, Infinity],
      rotationSpeed: 0.03,
      maxAngularSpeed: 0.05,
      speed: 2.5,
      description: "Мега змейки"
    }
  },
  
  // === ПАРАМЕТРЫ РОСТА ЗМЕЙКИ ===
  HISTORY_LENGTH: 150,                     // Максимальная длина истории позиций
  
  // Интервалы спавна орбов при бусте
  ORB_SPAWN_INTERVAL: { 
    small: 0.08,                          // 12.5 орбов в секунду для маленьких
    large: 0.05                           // 20 орбов в секунду для больших
  },
  
  // === ДЕТАЛЬНЫЕ ПАРАМЕТРЫ РОСТА ===
  SNAKE_GROWTH: {
    LENGTH_BASE: 10,                      // Базовая длина змейки
    LENGTH_MULTIPLIER: 6,                 // Множитель роста длины
    WIDTH_BASE: 15,                       // Базовая ширина сегментов
    WIDTH_MULTIPLIER: 0.6,                // Множитель роста ширины
    SEGMENT_SPACING: 0.7,                 // Расстояние между сегментами (множитель ширины)
    TAIL_TAPER: 0.3,                      // Минимальная толщина хвоста (30% от основной)
  },
  
  // === ПАРАМЕТРЫ ЗАМЕДЛЕНИЯ ОТ РАЗМЕРА ===
  SPEED_REDUCTION: {
    BASE_FACTOR: 0.08,                    // Базовый фактор замедления
    MIN_SPEED: 0.4,                       // Минимальная скорость (40% от базовой)
  },

  // === ОПТИМИЗИРОВАННЫЕ ПАРАМЕТРЫ СВЕЧЕНИЯ ===
  GLOW_OPTIMIZATION: {
    // Максимальное количество сегментов для расчета свечения
    MAX_GLOW_SEGMENTS: 50,                // Ограничение сегментов для производительности
    
    // Интервал обновления свечения (в кадрах)
    GLOW_UPDATE_INTERVAL: 0.1,              // Обновлять свечение каждые 2 кадра
    
    // Упрощение свечения для больших змей
    LARGE_SNAKE_SIMPLIFICATION: {
      threshold: 200,                     // Порог массы для упрощения
      segmentSkip: 3,                     // Пропускать каждые N сегментов
      reducedAlpha: 0.6,                  // Уменьшенная прозрачность
    },
    
    // Новые параметры ширины свечения для больших змей
    glowWidthByMass: [
      { range: [10, 1000], width: 2.0 },
      { range: [1000, 5000], width: 1.5 },    // Исправлено: было 0.5, стало 1.5
      { range: [5000, 10000], width: 1.2 },
      { range: [10000, 20000], width: 1.0 },
      { range: [20000, 50000], width: 0.8 },
      { range: [50000, Infinity], width: 0.6 }
    ],
    
    // Оптимизация для сверхбольших змей
    ultraLargeGlow: {
      massThreshold: 40000,
      updateInterval: 0.3, // реже обновлять
      baseAlpha: 0.3,      // прозрачность ниже
      width: 0.6           // ширина свечения минимальная
    },
    
    // Параметры свечения по размерам
    small: {
      massRange: [10, 100],
      glowWidth: 1.5,                     // Множитель ширины свечения
      pulseSpeed: 0.03,                   // Скорость пульсации
      baseAlpha: 0.7,                     // Базовая прозрачность
      colorCount: 4,                      // Количество цветов в палитре
    },
    medium: {
      massRange: [100, 500],
      glowWidth: 1.8,
      pulseSpeed: 0.04,
      baseAlpha: 0.65,
      colorCount: 5,
    },
    large: {
      massRange: [500, 1000],
      glowWidth: 1.5,                     // Фиксированная ширина для больших
      pulseSpeed: 0.05,
      baseAlpha: 0.5,                     // Пониженная прозрачность
      colorCount: 6,
      useSimplification: true,            // Включить упрощение
    }
  }
};