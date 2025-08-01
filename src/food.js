import { GAME_CONSTANTS } from "./constants.js";

export class FoodManager {
  constructor(gameWorld, worldRadius, tokenFoodTexture, tonTexture, snakes = []) {
    this.gameWorld = gameWorld;
    this.worldRadius = worldRadius;
    this.tokenFoodTexture = tokenFoodTexture;
    this.tonTexture = tonTexture;
    this.foodItems = [];
    this.snakes = snakes;
    this.minFoodCount = Math.floor(GAME_CONSTANTS.FOOD_COUNT * 0.8);
    this.maxFoodCount = GAME_CONSTANTS.FOOD_COUNT;
    this.colors = GAME_CONSTANTS.FOOD_COLORS;
    this.foodSpawnTimer = 0;
    this.foodSpawnInterval = 0.1;
    //console.log("FoodManager initialized, tonTexture:", !!tonTexture);
  }

  createGradientTexture(color, size) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      size * (color.stops || 0.5),
      size / 2,
      size / 2,
      size / 2
    );
    gradient.addColorStop(0, `#${color.inner.toString(16).padStart(6, "0")}`);
    gradient.addColorStop(1, `#${color.outer.toString(16).padStart(6, "0")}`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return PIXI.Texture.from(canvas);
  }

  createFood() {
    const type = Math.random() < 0.8 ? "small" : "large";
    const points = type === "small" ? 1 : Math.floor(Math.random() * 4) + 2;
    const size = type === "small" ? 10 : 20;
    const color = this.colors[Math.floor(Math.random() * this.colors.length)];
    
    const foodContainer = new PIXI.Container();
    foodContainer.type = type;
    foodContainer.points = points || 1;
    foodContainer.size = size;
    foodContainer.isConsumed = false;
    foodContainer.id = Math.random().toString(36).substr(2, 9);
    foodContainer.attractionTime = 0;
    
    const foodCircle = new PIXI.Graphics();
    const gradientTexture = this.createGradientTexture(color, size);
    foodCircle.beginTextureFill({ texture: gradientTexture });
    foodCircle.drawCircle(0, 0, size / 2);
    foodCircle.endFill();
    foodContainer.addChild(foodCircle);
    
    if (this.tokenFoodTexture && type !== "boost") {
      const logo = new PIXI.Sprite(this.tokenFoodTexture);
      logo.anchor.set(0.5);
      logo.width = size * 0.8;
      logo.height = size * 0.8;
      foodContainer.addChild(logo);
    }
    
    foodContainer.anchor = new PIXI.Point(0.5, 0.5);
    
    let x, y, isValidPosition = false;
    const maxAttempts = 10;
    const minDistance = 50;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const angle = Math.random() * 2 * Math.PI;
      const radius = Math.sqrt(Math.random()) * this.worldRadius;
      x = GAME_CONSTANTS.WORLD_CENTER.x + radius * Math.cos(angle);
      y = GAME_CONSTANTS.WORLD_CENTER.y + radius * Math.sin(angle);

      isValidPosition = true;
      for (const snake of this.snakes) {
        if (!snake.alive) continue;
        const dx = x - snake.head.x;
        const dy = y - snake.head.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < minDistance) {
          isValidPosition = false;
          break;
        }
      }

      if (isValidPosition) break;
    }

    if (!isValidPosition) {
      console.warn("Не удалось найти безопасную позицию для еды, используется случайная");
      const angle = Math.random() * 2 * Math.PI;
      const radius = Math.sqrt(Math.random()) * this.worldRadius;
      x = GAME_CONSTANTS.WORLD_CENTER.x + radius * Math.cos(angle);
      y = GAME_CONSTANTS.WORLD_CENTER.y + radius * Math.sin(angle);
    }

    foodContainer.x = x;
    foodContainer.y = y;
    
    this.foodItems.push(foodContainer);
    this.gameWorld.addChild(foodContainer);
    console.debug(`Created food: ID ${foodContainer.id}, Type: ${type}, Points: ${points}, Size: ${size}, Position: (${x.toFixed(2)}, ${y.toFixed(2)})`);
  }

  createDebrisFromSnake(snakeMass, segments) {
    const debrisCount = Math.floor(snakeMass * GAME_CONSTANTS.DEBRIS_COUNT_PER_MASS);
    for (let i = 0; i < debrisCount; i++) {
      const segmentIndex = Math.floor(i * segments.length / debrisCount);
      const segment = segments[segmentIndex] || segments[segments.length - 1];
      const size = GAME_CONSTANTS.DEBRIS_MIN_SIZE + Math.random() * (GAME_CONSTANTS.DEBRIS_MAX_SIZE - GAME_CONSTANTS.DEBRIS_MIN_SIZE);
      const points = snakeMass * GAME_CONSTANTS.DEBRIS_POINTS_PER_MASS / debrisCount;
      const color = this.colors[Math.floor(Math.random() * this.colors.length)];
      
      const debris = new PIXI.Container();
      debris.type = "debris";
      debris.points = points;
      debris.size = size;
      debris.isConsumed = false;
      debris.id = Math.random().toString(36).substr(2, 9);
      debris.attractionTime = 0;
      
      const debrisCircle = new PIXI.Graphics();
      const gradientTexture = this.createGradientTexture(color, size);
      debrisCircle.beginTextureFill({ texture: gradientTexture });
      debrisCircle.drawCircle(0, 0, size / 2);
      debrisCircle.endFill();
      debris.addChild(debrisCircle);
      
      if (this.tokenFoodTexture) {
        const logo = new PIXI.Sprite(this.tokenFoodTexture);
        logo.anchor.set(0.5);
        logo.width = size * 0.8;
        logo.height = size * 0.8;
        debris.addChild(logo);
      }
      
      debris.anchor = new PIXI.Point(0.5, 0.5);
      debris.x = segment.x + (Math.random() - 0.5) * 20;
      debris.y = segment.y + (Math.random() - 0.5) * 20;
      
      this.foodItems.push(debris);
      this.gameWorld.addChild(debris);
      console.debug(`Created debris: ID ${debris.id}, Points: ${points}, Size: ${size}`);
    }
  }

  createTonFromSnake(mass, segments) {
    const totalTon = Math.min(
      GAME_CONSTANTS.TON_DROP.MAX_TON_PER_SNAKE,
      Math.max(GAME_CONSTANTS.TON_DROP.MIN_TON_PER_SNAKE, mass * 0.01)
    );
    const tonPerDrop = GAME_CONSTANTS.TON_DROP.TON_PER_DROP;
    const numDrops = Math.floor(totalTon / tonPerDrop);
    const dropInterval = Math.max(1, Math.floor(segments.length / Math.min(numDrops, 5)));

    for (let i = 0; i < segments.length; i += dropInterval) {
      const segment = segments[i];
      const ton = new PIXI.Container();
      ton.type = "ton";
      ton.points = tonPerDrop;
      ton.size = GAME_CONSTANTS.TON_DROP.TON_SIZE;
      ton.zIndex = -1;
      ton.id = Math.random().toString(36).substr(2, 9);
      ton.isConsumed = false;

      const gradientTexture = this.createGradientTexture(
        GAME_CONSTANTS.TON_DROP.TON_COLOR,
        ton.size
      );
      const tonCircle = new PIXI.Graphics();
      tonCircle.beginTextureFill({ texture: gradientTexture });
      tonCircle.drawCircle(0, 0, ton.size / 2);
      tonCircle.endFill();
      ton.addChild(tonCircle);

      if (this.tonTexture) {
        const logo = new PIXI.Sprite(this.tonTexture);
        logo.anchor.set(0.5);
        logo.width = ton.size * 0.8;
        logo.height = ton.size * 0.8;
        ton.addChild(logo);
        //console.log(`Applied ton.png texture to TON food ID ${ton.id}`);
      } else {
        console.warn("tonTexture not available for TON food");
      }

      ton.x = segment.x + (Math.random() - 0.5) * 10;
      ton.y = segment.y + (Math.random() - 0.5) * 10;
      this.gameWorld.addChild(ton);
      this.foodItems.push(ton);
    }
  }

  initialize() {
    for (let i = 0; i < this.maxFoodCount; i++) {
      this.createFood();
    }
  }

  update(delta, snakeHead) {
    const attractionDistance = 50;
    const attractionSpeed = 15;
    const maxAttractionTime = 1;
    
    this.foodSpawnTimer += delta / 60;
    if (this.foodSpawnTimer >= this.foodSpawnInterval && this.foodItems.length < this.maxFoodCount) {
      const foodsToSpawn = Math.min(
        Math.floor((this.minFoodCount - this.foodItems.length) / 2) + 1,
        this.maxFoodCount - this.foodItems.length
      );
      for (let i = 0; i < foodsToSpawn; i++) {
        this.createFood();
      }
      this.foodSpawnTimer = 0;
    }

    for (let i = this.foodItems.length - 1; i >= 0; i--) {
      const food = this.foodItems[i];
      if (!food || food.isConsumed) {
        console.warn(`Invalid or consumed food in update: ID ${food?.id}, Type: ${food?.type || 'unknown'}`);
        this.foodItems.splice(i, 1);
        if (food && this.gameWorld.children.includes(food)) {
          this.gameWorld.removeChild(food);
          food.destroy({ children: true });
        }
        continue;
      }

      const headAngle = snakeHead.rotation - Math.PI / 2;
      const faceOffset = snakeHead.height * 0.5;
      const faceX = snakeHead.x + Math.cos(headAngle) * faceOffset;
      const faceY = snakeHead.y + Math.sin(headAngle) * faceOffset;
      const dx = faceX - food.x;
      const dy = faceY - food.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < attractionDistance) {
        food.attractionTime = (food.attractionTime || 0) + delta / 60;
        console.debug(`Food in attraction zone: ID ${food.id}, Type: ${food.type}, Distance: ${distance.toFixed(2)}, AttractionTime: ${food.attractionTime.toFixed(2)}`);
        
        if (food.attractionTime > maxAttractionTime) {
          console.warn(`Food stuck in attraction zone too long: ID ${food.id}, Type: ${food.type}, Points: ${food.points || 1}`);
          this.foodItems.splice(i, 1);
          if (this.gameWorld.children.includes(food)) {
            this.gameWorld.removeChild(food);
          }
          food.destroy({ children: true });
          
          if (food.type !== "boost" && food.type !== "ton") {
            this.createFood();
          }
          continue;
        }

        const angle = Math.atan2(dy, dx);
        const speed = Math.min(attractionSpeed * delta, distance);
        let newX = food.x + Math.cos(angle) * speed;
        let newY = food.y + Math.sin(angle) * speed;
        const dxFromCenter = newX - GAME_CONSTANTS.WORLD_CENTER.x;
        const dyFromCenter = newY - GAME_CONSTANTS.WORLD_CENTER.y;
        const distFromCenter = Math.sqrt(dxFromCenter * dxFromCenter + dyFromCenter * dyFromCenter);
        
        if (distFromCenter <= this.worldRadius && distance > snakeHead.width / 4) {
          food.x = newX;
          food.y = newY;
        }
      } else {
        food.attractionTime = 0;
      }
    }
  }

  updateSnakes(snakes) {
    this.snakes = snakes;
  }
}