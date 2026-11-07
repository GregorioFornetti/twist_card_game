import { ClientLobby } from '../../interfaces/Lobby';
import EmitterBase from '../EmitterBase';

export default class GameEventsEmitter extends EmitterBase {
  /** Sends each player their own personalised lobby/game view. */
  emitGameState(views: { [playerId: string]: ClientLobby }) { this.emitToSpecificLobbyPlayers('game-state', views); }
  emitPlayError(type: 'not-your-turn' | 'card-not-in-hand' | 'card-not-playable' | 'must-play-drawn-card' | 'color-required' | 'not-in-game' | 'challenge-pending' | 'color-locked') { this.emitToUser('play-error', type); }
  emitStartGame(views: { [playerId: string]: ClientLobby }) { this.emitToSpecificLobbyPlayers('start-game', views); }
}
