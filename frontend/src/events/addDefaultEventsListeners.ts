import type { Socket } from 'socket.io-client';
import addDefaultLobbyEventsHandlers from './lobby/eventsHandlers';
import addDefaultGameEventsHandlers from './game/eventsHandlers';
import addDefaultGeneralEventsHandlers from './general/eventsHandlers';
export default function addDefaultEventsListeners(socket: Socket) {
  addDefaultLobbyEventsHandlers(socket);
  addDefaultGameEventsHandlers(socket);
  addDefaultGeneralEventsHandlers(socket);
}
