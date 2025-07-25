import { GAME_CONSTANTS } from "./constants.js";

export class FoodManager {
  constructor(gameWorld, worldRadius, tokenFoodTexture) {
    this.gameWorld = gameWorld;
    this.worldRadius = worldRadius;
    this.tokenFoodTexture = tokenFoodTexture;
    this.foodItems = [];
    this.foodCount = GAME_CONSTANTS.FOOD_COUNT;
    this.colors = GAME_CONSTANTS.FOOD_COLORS;
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
    
    // Спавн внутри круга
    const angle = Math.random() * 2 * Math.PI;
    const radius = Math.sqrt(Math.random()) * this.worldRadius;
    foodContainer.x = GAME_CONSTANTS.WORLD_CENTER.x + radius * Math.cos(angle);
    foodContainer.y = GAME_CONSTANTS.WORLD_CENTER.y + radius * Math.sin(angle);
    
    this.foodItems.push(foodContainer);
    this.gameWorld.addChild(foodContainer);
    console.debug(`Created food: ID ${foodContainer.id}, Type: ${type}, Points: ${points}, Size: ${size}`);
  }

  initialize() {
    for (let i = 0; i < this.foodCount; i++) {
      this.createFood();
    }
  }

  update(delta, snakeHead) {
    const attractionDistance = 50;
    const attractionSpeed = 15;
    const maxAttractionTime = 1;
    
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
        
        // Если еда слишком долго в зоне притяжения, считаем её съеденной
        if (food.attractionTime > maxAttractionTime) {
          console.warn(`Food stuck in attraction zone too long: ID ${food.id}, Type: ${food.type}, Points: ${food.points || 1}`);
          this.foodItems.splice(i, 1);
          if (this.gameWorld.children.includes(food)) {
            this.gameWorld.removeChild(food);
          }
          food.destroy({ children: true });
          
          // УБРАН ПРОФИТ - прямое увеличение массы змейки без расчета профита
          const points = food.points || 1;
          // Здесь должна быть ссылка на увеличение массы змейки
          // Это будет обработано в основном игровом цикле
          
          if (food.type !== "boost") {
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
}