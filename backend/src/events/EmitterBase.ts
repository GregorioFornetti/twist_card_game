import { Socket, Server } from 'socket.io';
import { Socket as ClientSocket } from 'socket.io-client';
import { lobbys } from '../global';

export default class EmitterBase {
  protected socket: Socket | ClientSocket;
  protected io: Server;
  protected lobbyId?: string;
  constructor(io: Server, socket: Socket | ClientSocket, lobbyId?: string) {
    this.io = io; this.socket = socket; this.lobbyId = lobbyId;
  }
  protected emitToUser(event: string, ...args: any[]) { this.socket.emit(event, ...args); }
  protected emitToLobby(event: string, ...args: any[]) {
    if (!this.lobbyId || !lobbys[this.lobbyId]) throw new Error('Player not in a lobby');
    for (const p of lobbys[this.lobbyId].players) this.io.to(p.id).emit(event, ...args);
  }
  protected emitToSpecificLobbyPlayers(event: string, playersInfos: { [playerId: string]: any }) {
    if (!this.lobbyId) throw new Error('Player not in a lobby');
    for (const pid in playersInfos) this.io.to(pid).emit(event, playersInfos[pid]);
  }
  public get isPlayerInLobby() { return this.lobbyId !== undefined; }
}
