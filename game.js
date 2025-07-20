const app = new PIXI.Application({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x000000,
});
document.getElementById("game-container").appendChild(app.view);

// Центр карты
const world = new PIXI.Container();
app.stage.addChild(world);

// Игрок (пока точка-заглушка)
const snakeHead = new PIXI.Graphics();
snakeHead.beginFill(0x00ff00);
snakeHead.drawCircle(0, 0, 10);
snakeHead.endFill();
world.addChild(snakeHead);

// Следим за мышкой
app.ticker.add(() => {
  const dx = app.renderer.plugins.interaction.mouse.global.x - snakeHead.x;
  const dy = app.renderer.plugins.interaction.mouse.global.y - snakeHead.y;
  snakeHead.x += dx * 0.05;
  snakeHead.y += dy * 0.05;
});
1