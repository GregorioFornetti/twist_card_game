import type { Socket } from 'socket.io-client';
import EventsListenersAdderBase from '../EventsListenersAdderBase';
export class GameEventsHandlersAdder extends EventsListenersAdderBase {
  playError(handler: (type: string) => void) { this.socket.on('play-error', handler); }
}
export default function addDefaultGameEventsHandlers(_socket: Socket) { /* game-state handled in lobby handlers */ }
