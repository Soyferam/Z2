export class Food {
  constructor(x, y) {
    this.sprite = null;
    new Promise((resolve, reject) => {
      const img = new Image();
      img.src = './assets/token-food.png';
      img.onload = () => {
        console.log('token-food.png loaded successfully');
        resolve();
      };
      img.onerror = () => reject('Failed to load ./assets/token-food.png');
    })
      .then(() => {
        this.sprite = PIXI.Sprite.from('./assets/token-food.png');
        if (!this.sprite.texture.valid) {
          console.error('Token food texture invalid');
        }
        this.sprite.anchor.set(0.5);
        this.sprite.x = x;
        this.sprite.y = y;
        this.sprite.scale.set(2);
        console.log('Food created at', x, y, 'Sprite:', this.sprite);
      })
      .catch((error) => {
        console.error('Texture load error for token-food:', error);
      });
  }
}