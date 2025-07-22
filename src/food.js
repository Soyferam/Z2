// src/food.js
export class FoodManager {
  constructor(gameWorld, worldWidth, worldHeight, tokenFoodTexture) {
    this.gameWorld = gameWorld;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.foodItems = [];
    this.foodCount = 50;
    this.foodSize = 20;
    this.tokenFoodTexture = tokenFoodTexture;
    this.colors = [
      { stops: 0.6, inner: 0xFF3333, outer: 0xCC0000 },
      { stops: 0.6, inner: 0x3366FF, outer: 0x0033CC },
      { stops: 0.65, inner: 0x66FF33, outer: 0x33CC00 },
      { stops: 0.7, inner: 0xFFFF33, outer: 0xCCCC00 },
      { stops: 0.7, inner: 0xFF33CC, outer: 0xCC0099 },
    ];
  }

  createFood() {
    const color = this.colors[Math.floor(Math.random() * this.colors.length)];
    const foodContainer = new PIXI.Container();
    const foodCircle = new PIXI.Graphics();
    const gradientTexture = this.createGradientTexture(color);
    foodCircle.beginTextureFill({ texture: gradientTexture });
    foodCircle.drawCircle(0, 0, this.foodSize / 2);
    foodCircle.endFill();
    foodContainer.addChild(foodCircle);
    if (this.tokenFoodTexture) {
      const logo = new PIXI.Sprite(this.tokenFoodTexture);
      logo.anchor.set(0.5);
      logo.width = this.foodSize * 0.8;
      logo.height = this.foodSize * 0.8;
      foodContainer.addChild(logo);
    }
    foodContainer.anchor = new PIXI.Point(0.5, 0.5);
    foodContainer.x = Math.random() * this.worldWidth;
    foodContainer.y = Math.random() * this.worldHeight;
    this.foodItems.push(foodContainer);
    this.gameWorld.addChild(foodContainer);
  }

  createGradientTexture(color) {
    const canvas = document.createElement("canvas");
    canvas.width = this.foodSize;
    canvas.height = this.foodSize;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createRadialGradient(
      this.foodSize / 2,
      this.foodSize / 2,
      this.foodSize * color.stops,
      this.foodSize / 2,
      this.foodSize / 2,
      this.foodSize / 2
    );
    gradient.addColorStop(0, `#${color.inner.toString(16).padStart(6, "0")}`);
    gradient.addColorStop(1, `#${color.outer.toString(16).padStart(6, "0")}`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.foodSize, this.foodSize);
    return PIXI.Texture.from(canvas);
  }

  initialize() {
    for (let i = 0; i < this.foodCount; i++) {
      this.createFood();
    }
  }

  update(delta) {}

  checkCollision(snakeHead, bodySegments, segmentSize, segmentSpacing) {
    let tokensCollected = 0;
    for (let i = this.foodItems.length - 1; i >= 0; i--) {
      const food = this.foodItems[i];
      const dx = snakeHead.x - food.x;
      const dy = snakeHead.y - food.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < (snakeHead.width + this.foodSize) / 2) {
        this.gameWorld.removeChild(food);
        this.foodItems.splice(i, 1);
        tokensCollected += 1;
        const lastSegment = bodySegments[bodySegments.length - 1] || snakeHead;
        const newSegment = new PIXI.Sprite(PIXI.Texture.from("assets/snake-body.png"));
        newSegment.anchor.set(0.5);
        newSegment.width = segmentSize;
        newSegment.height = segmentSize;
        newSegment.x = lastSegment.x;
        newSegment.y = lastSegment.y + segmentSpacing;
        newSegment.zIndex = 100 - bodySegments.length - 1;
        bodySegments.push(newSegment);
        this.gameWorld.addChild(newSegment);
        this.createFood();
      }
    }
    return tokensCollected;
  }
}