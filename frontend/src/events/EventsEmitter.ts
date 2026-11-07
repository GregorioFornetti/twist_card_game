import type { Socket } from 'socket.io-client';
import LobbyEventsEmitter from './lobby/eventsEmitter';
import GameEventsEmitter from './game/eventsEmitter';
import GeneralEventsEmitter from './general/eventsEmitter';
export default class EventsEmitter {
  public lobby: LobbyEventsEmitter;
  public game: GameEventsEmitter;
  public general: GeneralEventsEmitter;
  constructor(socket: Socket) {
    this.lobby = new LobbyEventsEmitter(socket);
    this.game = new GameEventsEmitter(socket);
    this.general = new GeneralEventsEmitter(socket);
  }
}
