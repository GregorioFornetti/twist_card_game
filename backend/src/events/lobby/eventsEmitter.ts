import Lobby, { ClientLobby, GameOptions } from '../../interfaces/Lobby';
import EmitterBase from '../EmitterBase';

export default class LobbyEventsEmitter extends EmitterBase {
  emitJoinLobbySuccess(lobby: ClientLobby) { this.emitToUser('join-lobby-success', lobby); }
  emitJoinLobbyError(type: 'lobby-in-game' | 'inexistent-lobby' | 'no-name' | 'repeated-name' | 'player-already-in-lobby' | 'lobby-full') { this.emitToUser('join-lobby-error', type); }
  emitPlayerJoin(id: string, name: string, emote?: string, color?: string) { this.emitToLobby('player-join', id, name, emote, color); }
  emitPlayerReady(id: string) { this.emitToLobby('player-ready', id); }
  emitPlayerReadyError(type: 'in-game' | 'not-in-lobby' | 'leader') { this.emitToUser('player-ready-error', type); }
  emitPlayerUnready(id: string) { this.emitToLobby('player-unready', id); }
  emitPlayerUnreadyError(type: 'in-game' | 'not-in-lobby' | 'leader') { this.emitToUser('player-unready-error', type); }
  emitStartGameError(type: 'not-leader' | 'not-all-ready' | 'not-in-lobby' | 'already-in-game' | 'not-enough-players' | 'deck-too-small') { this.emitToUser('start-game-error', type); }
  emitReconnect(lobby: ClientLobby) { this.emitToUser('reconnect', lobby); }
  emitOptionsUpdate(options: GameOptions) { this.emitToLobby('options-update', options); }
  emitOptionsError(type: 'not-leader' | 'already-in-game' | 'not-in-lobby' | 'invalid-options') { this.emitToUser('options-error', type); }
  emitBotAdded(bot: Lobby['players'][number]) { this.emitToLobby('bot-added', bot); }
  emitBotRemoved(botId: string) { this.emitToLobby('bot-removed', botId); }
  emitBotError(type: 'not-leader' | 'already-in-game' | 'not-in-lobby' | 'lobby-full' | 'bot-not-found') { this.emitToUser('bot-error', type); }
  emitRematch() { this.emitToLobby('rematch'); }
  emitRematchError(type: 'not-leader' | 'already-in-game' | 'not-in-lobby' | 'not-enough-players') { this.emitToUser('rematch-error', type); }
  emitAppearanceUpdate(playerId: string, emote: string, color: string) { this.emitToLobby('appearance-update', playerId, emote, color); }
  emitAppearanceError(type: 'emote-taken' | 'color-taken' | 'invalid-appearance' | 'already-in-game' | 'not-in-lobby') { this.emitToUser('appearance-error', type); }
  emitLobbyLeft() { this.emitToUser('lobby-left'); }
  emitPlayerLogout(id: string, newLeaderId?: string) { this.emitToLobby('player-logout', id, newLeaderId); }
}
