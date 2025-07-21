export class WebSocketManager {
  constructor(game) {
    this.game = game;
    this.ws = null;
  }

  connect() {
    this.ws = new WebSocket('ws://localhost:3000');
    this.ws.onopen = () => {
      console.log('Connected to server');
    };
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'update') {
        this.game.update(data);
      } else if (data.type === 'gameOver') {
        alert('Game Over');
      }
    };
  }

  send(data) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}