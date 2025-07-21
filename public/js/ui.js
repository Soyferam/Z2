export class UI {
  constructor(game) {
    this.game = game;
    this.createUI();
  }

  createUI() {
    const container = document.getElementById('game-container');
    container.innerHTML += `
      <div id="map" class="ui">Map</div>
      <div id="profit" class="ui">Profit: 1 TON</div>
      <div id="tokens" class="ui">Tokens: 0</div>
      <button id="exit" class="ui">Exit</button>
      <button id="quick-exit" class="ui">Quick Exit</button>
      <div id="joystick" class="ui"></div>
      <div id="boost" class="ui"></div>
    `;

    document.getElementById('exit').addEventListener('click', () => {
      this.game.ws.send({ type: 'exit', quick: false });
    });
    document.getElementById('quick-exit').addEventListener('click', () => {
      this.game.ws.send({ type: 'exit', quick: true });
    });
  }

  updateTokens(tokens) {
    document.getElementById('tokens').textContent = `Tokens: ${tokens}`;
  }
}