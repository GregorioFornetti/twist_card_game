import { Server } from 'socket.io';
import { players } from '../../global';
import EventsEmitter from '../Emitter';
import Player from '../../interfaces/Player';

export function createPlayer(io: Server, playerId: string): Player {
  const entry = players[playerId];
  if (!entry) throw new Error(`Unknown player ${playerId}`);
  return {
    playerId,
    socket: entry.socket,
    io,
    lobby: entry.lobby,
    eventsEmitter: new EventsEmitter(io, entry.socket, entry.lobby?.lobbyId)
  };
}
