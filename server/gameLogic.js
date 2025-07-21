const players = {};
const food = [];
const mapSize = { width: 20000, height: 20000 }; // Карта 20,000x20,000

function handleConnection(ws) {
  const playerId = generateId();
  // Минимальный депозит 1 TON = начальный размер змеи (5 сегментов)
  players[playerId] = {
    ws,
    position: { x: Math.random() * mapSize.width, y: Math.random() * mapSize.height },
    size: 5,
    tokens: 0,
    segments: [{ x: Math.random() * mapSize.width, y: Math.random() * mapSize.height }],
  };
  ws.send(JSON.stringify({ type: 'init', id: playerId, size: 5, mapSize }));

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    if (data.type === 'move') {
      players[playerId].position = data.position;
      checkCollisions(playerId);
      broadcast({ type: 'update', players, food });
    } else if (data.type === 'eat') {
      players[playerId].size += 1; // Рост змеи
      players[playerId].tokens += 1; // Сбор токена
      broadcast({ type: 'update', players, food });
    } else if (data.type === 'exit') {
      handleExit(playerId, data.quick);
    }
  });

  ws.on('close', () => {
    delete players[playerId];
    broadcast({ type: 'update', players, food });
  });

  // Генерация еды
  if (food.length < 50) {
    for (let i = food.length; i < 50; i++) {
      food.push({
        x: Math.random() * mapSize.width,
        y: Math.random() * mapSize.height,
        type: 'token',
      });
    }
  }
}

function checkCollisions(playerId) {
  const player = players[playerId];
  // Проверка столкновений с другими змеями
  for (const otherId in players) {
    if (otherId !== playerId) {
      const other = players[otherId];
      const dx = player.position.x - other.position.x;
      const dy = player.position.y - other.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 20) { // Радиус столкновения
        // Создаем остатки змеи
        for (const segment of player.segments) {
          food.push({ x: segment.x, y: segment.y, type: 'remains' });
        }
        delete players[playerId];
        player.ws.send(JSON.stringify({ type: 'gameOver' }));
        break;
      }
    }
  }
}

function handleExit(playerId, quick) {
  const delay = quick ? 2000 : 10000; // 2 сек для быстрого, 10 сек для обычного
  setTimeout(() => {
    if (players[playerId]) {
      const player = players[playerId];
      if (quick) {
        // Комиссия 0.1 TON (заглушка для API)
        console.log(`Player ${playerId} quick exit, apply 0.1 TON fee via API`);
      }
      delete players[playerId];
      broadcast({ type: 'update', players, food });
    }
  }, delay);
}

function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

module.exports = { handleConnection };