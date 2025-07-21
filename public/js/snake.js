export class Snake {
  constructor() {
    this.container = new PIXI.Container();
    this.sprite = null;
    this.segments = [];
    this.size = 5;
    this.tokens = 0;
    this.speed = 2;

    Promise.all([
      new Promise((resolve, reject) => {
        const img = new Image();
        img.src = './assets/snake-head.png';
        img.onload = () => {
          console.log('snake-head.png loaded successfully');
          resolve();
        };
        img.onerror = () => reject('Failed to load ./assets/snake-head.png');
      }),
      new Promise((resolve, reject) => {
        const img = new Image();
        img.src = './assets/snake-body.png';
        img.onload = () => {
          console.log('snake-body.png loaded successfully');
          resolve();
        };
        img.onerror = () => reject('Failed to load ./assets/snake-body.png');
      }),
    ])
      .then(() => {
        this.sprite = PIXI.Sprite.from('./assets/snake-head.png');
        if (!this.sprite.texture.valid) {
          console.error('Snake head texture invalid');
        }
        this.sprite.anchor.set(0.5);
        this.sprite.x = window.innerWidth / 2;
        this.sprite.y = window.innerHeight / 2;
        this.sprite.scale.set(2);
        this.segments = [this.sprite];

        for (let i = 1; i < this.size; i++) {
          const segment = PIXI.Sprite.from('./assets/snake-body.png');
          if (!segment.texture.valid) {
            console.error('Snake body texture invalid');
          }
          segment.anchor.set(0.5);
          segment.x = this.sprite.x - i * 20;
          segment.y = this.sprite.y;
          segment.scale.set(2);
          this.segments.push(segment);
          this.container.addChild(segment);
        }
        this.container.addChild(this.sprite);
        console.log('Snake initialized', this.segments, 'Position:', this.sprite.x, this.sprite.y);
      })
      .catch((error) => {
        console.error('Texture load error:', error);
      });
  }

  move(position) {
    if (!this.sprite) return;
    const dx = position.x - this.sprite.x;
    const dy = position.y - this.sprite.y;
    const angle = Math.atan2(dy, dx);
    this.sprite.rotation = angle;
    this.sprite.x += Math.cos(angle) * this.speed;
    this.sprite.y += Math.sin(angle) * this.speed;
    for (let i = this.segments.length - 1; i > 0; i--) {
      this.segments[i].x = this.segments[i - 1].x;
      this.segments[i].y = this.segments[i - 1].y;
    }
  }

  boost() {
    if (this.tokens >= 5) {
      this.tokens -= 5;
      this.speed = 4;
      setTimeout(() => (this.speed = 2), 2000);
    }
  }
}