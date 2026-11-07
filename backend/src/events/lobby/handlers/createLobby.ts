import { randomUUID } from 'node:crypto';
import Player from '../../../interfaces/Player';
import Lobby from '../../../interfaces/Lobby';
import { DEFAULT_GAME_OPTIONS, lobbys, lobbyByCode, players } from '../../../global';
import { assignFreeAppearance, makeLobbyCode } from '../functions/appearance';
import { buildClientLobby } from '../../game/functions/engine';

export function handleCreateLobby(player: Player, name: string) {
  const formatted = (name ?? '').trim();
  if (!formatted) { player.eventsEmitter.Lobby.emitJoinLobbyError('no-name'); return; }
  if (player.lobby) { player.eventsEmitter.Lobby.emitJoinLobbyError('player-already-in-lobby'); return; }
  let code = makeLobbyCode();
  while (lobbyByCode[code]) code = makeLobbyCode();
  const lobby: Lobby = { lobbyId: randomUUID(), code, players: [{ id: player.playerId, name: formatted, leader: true, ready: false }], options: { ...DEFAULT_GAME_OPTIONS } };
  assignFreeAppearance(lobby, lobby.players[0]);
  lobbys[lobby.lobbyId] = lobby; lobbyByCode[code] = lobby;
  players[player.playerId] = { socket: player.socket, lobby };
  player.eventsEmitter.Lobby.emitJoinLobbySuccess(buildClientLobby(lobby, player.playerId));
}
