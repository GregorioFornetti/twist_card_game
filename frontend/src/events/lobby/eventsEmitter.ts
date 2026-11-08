import EventsEmitterBase from '../EventsEmitterBase';
import type { GameOptions } from '@/interfaces/Lobby';
export default class LobbyEventsEmitter extends EventsEmitterBase {
  emitCreateLobby(name: string, guris = false) { this.socket.emit('create-lobby', name, guris); }
  emitJoinLoby(code: string, name: string) { this.socket.emit('join-lobby', code, name); }
  emitReady() { this.socket.emit('ready'); }
  emitUnready() { this.socket.emit('unready'); }
  emitStartGameRequest() { this.socket.emit('start-game-request'); }
  emitUpdateOptions(options: GameOptions) { this.socket.emit('update-options', options); }
  emitResetOptions() { this.socket.emit('reset-options'); }
  emitAddBot() { this.socket.emit('add-bot'); }
  emitRemoveBot(botId: string) { this.socket.emit('remove-bot', botId); }
  emitRematchRequest() { this.socket.emit('rematch-request'); }
  emitRematchGameRequest() { this.socket.emit('rematch-game-request'); }
}
