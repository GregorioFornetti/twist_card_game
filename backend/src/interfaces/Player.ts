import { Server, Socket } from 'socket.io';
import EventsEmitter from '../events/Emitter';
import Lobby from './Lobby';
interface Player {
  playerId: string;
  eventsEmitter: EventsEmitter;
  socket: Socket;
  io: Server;
  lobby?: Lobby;
}
export default Player;
