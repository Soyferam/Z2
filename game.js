const app = new PIXI.Application({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x000000,
});
document.getElementById("game-container").appendChild(app.view);

const snake = new PIXI.Graphics();
snake.beginFill(0x00ff00);
snake.drawCircle(0, 0, 10);
snake.endFill();
app.stage.addChild(snake);

app.ticker.add(() => {
  const mouse = app.renderer.plugins.interaction.mouse.global;
  snake.x += (mouse.x - snake.x) * 0.05;
  snake.y += (mouse.y - snake.y) * 0.05;
});
