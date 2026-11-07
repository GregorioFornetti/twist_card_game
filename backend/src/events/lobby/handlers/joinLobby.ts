import Player from '../../../interfaces/Player';
import { MAX_LOBBY_PLAYERS, lobbyByCode, players } from '../../../global';
import EventsEmitter from '../../Emitter';
import { assignFreeAppearance } from '../functions/appearance';
import { buildClientLobby } from '../../game/functions/engine';
import { emitAll, scheduleNext } from '../../game/functions/broadcast';

export function handleJoinLobby(player: Player, code: string, name: string) {
  const lobby = lobbyByCode[(code ?? '').trim().toUpperCase()];
  if (!lobby) { player.eventsEmitter.Lobby.emitJoinLobbyError('inexistent-lobby'); return; }
  // Joining while a game is running makes you a spectator until the next hand.
  const spectating = !!lobby.game && lobby.game.status !== 'game-over';
  const formatted = (name ?? '').trim();
  if (!formatted) { player.eventsEmitter.Lobby.emitJoinLobbyError('no-name'); return; }
  if (lobby.players.find(p => p.name === formatted)) { player.eventsEmitter.Lobby.emitJoinLobbyError('repeated-name'); return; }
  if (player.lobby) { player.eventsEmitter.Lobby.emitJoinLobbyError('player-already-in-lobby'); return; }
  if (lobby.players.length >= MAX_LOBBY_PLAYERS) { player.eventsEmitter.Lobby.emitJoinLobbyError('lobby-full'); return; }
  const newPlayer = { id: player.playerId, name: formatted, leader: false, ready: spectating, spectator: spectating || undefined, emote: undefined as string | undefined, color: undefined as string | undefined };
  assignFreeAppearance(lobby, newPlayer);
  lobby.players.push(newPlayer);
  players[player.playerId] = { lobby, socket: player.socket };
  player.eventsEmitter = new EventsEmitter(player.io, player.socket, lobby.lobbyId);
  // Send success with the full list (including the new player), then notify everyone.
  player.eventsEmitter.Lobby.emitJoinLobbySuccess(buildClientLobby(lobby, player.playerId));
  player.eventsEmitter.Lobby.emitPlayerJoin(player.playerId, formatted, newPlayer.emote, newPlayer.color);
  if (spectating) { emitAll(player.io, lobby); scheduleNext(player.io, lobby); }
}
