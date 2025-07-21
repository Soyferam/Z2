import { Game } from './game.js';

if (!window.PIXI) {
  console.error('Pixi.js not loaded');
} else {
  console.log('Pixi.js version:', PIXI.VERSION);
}

const app = new PIXI.Application({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x000000,
  backgroundAlpha: 0, // Прозрачный канвас
});

document.getElementById('game-container').appendChild(app.view);
console.log('Pixi.js initialized', app);

const game = new Game(app);

const joystick = nipplejs.create({
  zone: document.getElementById('joystick'),
  mode: 'static',
  position: { left: '50px', bottom: '50px' },
  color: 'white',
});

joystick.on('move', (evt, data) => {
  if (game.snake.sprite) {
    const position = {
      x: game.snake.sprite.x + data.vector.x * 500,
      y: game.snake.sprite.y + data.vector.y * 500,
    };
    game.snake.move(position);
    game.ws.send({ type: 'move', position });
    app.stage.pivot.x = game.snake.sprite.x - window.innerWidth / 2;
    app.stage.pivot.y = game.snake.sprite.y - window.innerHeight / 2;
  }
});