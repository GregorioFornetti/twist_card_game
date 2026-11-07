import express from 'express';
import path from 'node:path';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import addEventsListeners from './events/addEventsListeners';
import EventsEmitter from './events/Emitter';
import { players } from './global';
import { buildClientLobby } from './events/game/functions/engine';
import { cancelOfflineRemoval } from './events/general/handlers/general';

dotenv.config();
const app = express();
const server = createServer(app);
const cors = process.env.NODE_ENV === 'production' ? {} : { cors: { origin: 'http://localhost:5173' } };
const io = new Server(server, { ...cors, path: process.env.SERVER_PATH ? `${process.env.SERVER_PATH}/socket.io` : '/socket.io' });
const port = process.env.PORT || 3000;
app.use(process.env.SERVER_PATH || '/', express.static('../frontend/dist'));
app.get(`${process.env.SERVER_PATH || ''}/*`, (_req, res) => { res.sendFile(path.resolve(__dirname, '../../frontend/dist/index.html')); });

io.on('connection', (socket) => {
  const authPlayerId = (socket.handshake.auth as any)?.playerId;
  const playerId = typeof authPlayerId === 'string' && authPlayerId.length > 0 ? authPlayerId : socket.id;
  const existing = players[playerId];
  if (existing && existing.socket.id !== socket.id) existing.socket.disconnect(true);
  players[playerId] = { socket, lobby: existing?.lobby };
  socket.join(playerId);
  cancelOfflineRemoval(playerId);
  players[playerId].offlineSince = undefined;
  addEventsListeners(io, socket, playerId);
  if (existing?.lobby) {
    new EventsEmitter(io, socket, existing.lobby.lobbyId).Lobby.emitReconnect(buildClientLobby(existing.lobby, playerId));
  }
});
server.listen(port, () => console.log(`[server]: Server is running at http://localhost:${port}`));
export { io };
