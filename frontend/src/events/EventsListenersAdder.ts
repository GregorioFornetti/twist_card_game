import type { Socket } from 'socket.io-client';
import { LobbyEventsHandlersAdder } from './lobby/eventsHandlers';
import { GameEventsHandlersAdder } from './game/eventsHandlers';
import { GeneralEventsHandlersAdder } from './general/eventsHandlers';
export default class EventsListenersAdder {
  public lobby: LobbyEventsHandlersAdder;
  public game: GameEventsHandlersAdder;
  public general: GeneralEventsHandlersAdder;
  constructor(socket: Socket) {
    this.lobby = new LobbyEventsHandlersAdder(socket);
    this.game = new GameEventsHandlersAdder(socket);
    this.general = new GeneralEventsHandlersAdder(socket);
  }
}
