const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const gameLogic = require('./gameLogic');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static('public'));
app.use('/assets', express.static('public/assets'));
app.get('/test-assets', (req, res) => {
  res.send('Assets folder is accessible');
});

wss.on('connection', (ws) => {
  gameLogic.handleConnection(ws);
});

server.listen(3000, () => {
  console.log('Server started on port 3000');
});