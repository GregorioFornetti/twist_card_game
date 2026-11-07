import { Server } from 'socket.io';
import Player from '../../../interfaces/Player';
import { lobbys, lobbyByCode, players, OFFLINE_LIMIT_MS } from '../../../global';
import EventsEmitter from '../../Emitter';
import { removePlayerFromGame } from '../../game/functions/engine';
import { emitAll, scheduleNext } from '../../game/functions/broadcast';

export function handleLogout(player: Player) {
  if (!player.lobby) { player.eventsEmitter.General.emitPlayerLogoutError('not-in-lobby'); return; }
  const lobby = player.lobby;
  const wasLeader = lobby.players.find(p => p.id === player.playerId)?.leader;
  const leftGame = removePlayerFromGame(lobby, player.playerId);
  lobby.players = lobby.players.filter(p => p.id !== player.playerId);
  // Keep the player registered (without a lobby): the socket is still connected
  // and must be able to create/join another room. Deleting the entry made every
  // later event throw "Unknown player" and left the client stuck loading.
  players[player.playerId] = { socket: player.socket };
  player.eventsEmitter.Lobby.emitLobbyLeft();
  if (lobby.players.length === 0 || !lobby.players.some(p => !p.bot)) {
    delete lobbys[lobby.lobbyId]; delete lobbyByCode[lobby.code];
    return;
  }
  let newLeaderId: string | undefined;
  if (wasLeader) {
    const next = lobby.players.find(p => !p.bot) ?? lobby.players[0];
    next.leader = true; next.ready = false; newLeaderId = next.id;
  }
  const human = lobby.players.find(p => !p.bot && players[p.id]);
  if (human) new EventsEmitter(player.io, players[human.id].socket, lobby.lobbyId).Lobby.emitPlayerLogout(player.playerId, newLeaderId);
  if (leftGame && lobby.game) { emitAll(player.io, lobby); scheduleNext(player.io, lobby); }
}

const removalTimers = new Map<string, ReturnType<typeof setTimeout>>();
export function handleDisconnect(io: Server, playerId: string, socketId: string) {
  const entry = players[playerId];
  if (!entry || entry.socket.id !== socketId) return;
  entry.offlineSince = Date.now();
  const t = setTimeout(() => {
    const e = players[playerId];
    if (e && e.offlineSince && Date.now() - e.offlineSince >= OFFLINE_LIMIT_MS - 1000) {
      // Reuse logout logic with a synthetic player.
      const lobby = e.lobby;
      if (lobby) {
        const emitter = new EventsEmitter(io, e.socket, lobby.lobbyId);
        handleLogout({ playerId, socket: e.socket, io, lobby, eventsEmitter: emitter });
        delete players[playerId]; // socket is gone for good: drop the entry handleLogout kept
      } else delete players[playerId];
    }
  }, OFFLINE_LIMIT_MS);
  removalTimers.set(playerId, t);
}
export function cancelOfflineRemoval(playerId: string) {
  const t = removalTimers.get(playerId);
  if (t) clearTimeout(t);
  removalTimers.delete(playerId);
}
