import { Snake } from './snake.js';
import { Food } from './food.js';
import { WebSocketManager } from './websocket.js';
import { UI } from './ui.js';

export class Game {
  constructor(app) {
    this.app = app;
    this.snake = new Snake();
    this.foods = [];
    this.ws = new WebSocketManager(this);
    this.ui = new UI(this);
    this.mapSize = { width: 20000, height: 20000 };
    const waitForSnake = setInterval(() => {
      if (this.snake.sprite) {
        clearInterval(waitForSnake);
        this.app.stage.pivot.x = this.snake.sprite.x - window.innerWidth / 2;
        this.app.stage.pivot.y = this.snake.sprite.y - window.innerHeight / 2;
        this.generateTempFood();
        this.start();
        console.log('Game initialized', this.snake, this.ui);
      }
    }, 100);
  }

  generateTempFood() {
    for (let i = 0; i < 10; i++) {
      const food = new Food(
        window.innerWidth / 2 + (Math.random() - 0.5) * 500,
        window.innerHeight / 2 + (Math.random() - 0.5) * 500
      );
      this.foods.push(food);
      const waitForFood = setInterval(() => {
        if (food.sprite) {
          clearInterval(waitForFood);
          this.app.stage.addChild(food.sprite);
          console.log('Food sprite added to stage:', food.sprite);
        }
      }, 100);
    }
  }

  start() {
    this.app.stage.addChild(this.snake.container);
    this.ws.connect();

    this.app.view.addEventListener('mousemove', (e) => {
      const position = { x: e.clientX + this.app.stage.pivot.x, y: e.clientY + this.app.stage.pivot.y };
      this.snake.move(position);
      this.ws.send({ type: 'move', position });
      this.app.stage.pivot.x = this.snake.sprite.x - window.innerWidth / 2;
      this.app.stage.pivot.y = this.snake.sprite.y - window.innerHeight / 2;
    });

    document.getElementById('boost').addEventListener('click', () => {
      if (this.snake.tokens >= 5) {
        this.snake.boost();
        this.snake.tokens -= 5;
        this.ui.updateTokens(this.snake.tokens);
      }
    });

    this.app.ticker.add(() => {
      this.foods.forEach((food, index) => {
        if (!food.sprite || !this.snake.sprite) return;
        const dx = this.snake.sprite.x - food.sprite.x;
        const dy = this.snake.sprite.y - food.sprite.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 20) {
          this.eatFood(food);
          this.foods.splice(index, 1);
          this.app.stage.removeChild(food.sprite);
          this.generateTempFoodSingle();
        }
      });
    });
  }

  generateTempFoodSingle() {
    const food = new Food(
      this.snake.sprite.x + (Math.random() - 0.5) * 500,
      this.snake.sprite.y + (Math.random() - 0.5) * 500
    );
    this.foods.push(food);
    const waitForFood = setInterval(() => {
      if (food.sprite) {
        clearInterval(waitForFood);
        this.app.stage.addChild(food.sprite);
        console.log('Single food sprite added to stage:', food.sprite);
      }
    }, 100);
  }

  update(data) {
    this.snake.move(data.position);
    this.foods.forEach((food) => {
      if (food.sprite) this.app.stage.removeChild(food.sprite);
    });
    this.foods = data.food.map((f) => {
      const food = new Food(f.x, f.y);
      return food;
    });
    this.app.stage.pivot.x = this.snake.sprite.x - window.innerWidth / 2;
    this.app.stage.pivot.y = this.snake.sprite.y - window.innerHeight / 2;
  }

  eatFood(food) {
    this.snake.size += 1;
    this.snake.tokens += 1;
    this.ui.updateTokens(this.snake.tokens);
    this.ws.send({ type: 'eat' });
    const lastSegment = this.snake.segments[this.snake.segments.length - 1];
    const newSegment = PIXI.Sprite.from('./assets/snake-body.png');
    if (!newSegment.texture.valid) {
      console.error('Failed to load ./assets/snake-body.png for new segment');
    }
    newSegment.anchor.set(0.5);
    newSegment.x = lastSegment.x;
    newSegment.y = lastSegment.y;
    newSegment.scale.set(2);
    this.snake.segments.push(newSegment);
    this.snake.container.addChild(newSegment);
  }
}