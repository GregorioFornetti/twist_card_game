import { Socket, Server } from 'socket.io';
import { Socket as ClientSocket } from 'socket.io-client';
import LobbyEventsEmitter from './lobby/eventsEmitter';
import GameEventsEmitter from './game/eventsEmitter';
import GeneralEventsEmitter from './general/eventsEmitter';

export default class EventsEmitter {
  public Lobby: LobbyEventsEmitter;
  public Game: GameEventsEmitter;
  public General: GeneralEventsEmitter;
  constructor(io: Server, socket: Socket | ClientSocket, lobbyId?: string) {
    this.Lobby = new LobbyEventsEmitter(io, socket, lobbyId);
    this.Game = new GameEventsEmitter(io, socket, lobbyId);
    this.General = new GeneralEventsEmitter(io, socket, lobbyId);
  }
}
