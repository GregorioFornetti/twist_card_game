import { Socket, Server } from 'socket.io';
import lobbyEventsHandlers from './lobby/eventsHandlers';
import gameEventsHandlers from './game/eventsHandlers';
import generalEventsHandlers from './general/eventsHandlers';
import Player from '../interfaces/Player';
import { players } from '../global';
import { createPlayer } from './functions/createPlayer';
import { handleDisconnect } from './general/handlers/general';

export default function addEventsListeners(io: Server, socket: Socket, playerId: string = socket.id) {
  const handlers: { [event: string]: (player: Player, ...args: any[]) => any } = { ...lobbyEventsHandlers, ...gameEventsHandlers, ...generalEventsHandlers };
  Object.entries(handlers).forEach(([event, handler]) => {
    socket.on(event, (...args: any[]) => {
      // A connected socket must always have an entry; re-register instead of failing every later event.
      if (!players[playerId]) players[playerId] = { socket };
      try { handler(createPlayer(io, playerId), ...args); } catch (e) { console.error(e); socket.emit('internal-server-error'); }
    });
  });
  socket.on('disconnect', () => handleDisconnect(io, playerId, socket.id));
}
