import Player from '../../../interfaces/Player';
export function handleReady(player: Player) {
  if (!player.lobby) { player.eventsEmitter.Lobby.emitPlayerReadyError('not-in-lobby'); return; }
  if (player.lobby.game) { player.eventsEmitter.Lobby.emitPlayerReadyError('in-game'); return; }
  const me = player.lobby.players.find(p => p.id === player.playerId);
  if (!me) { player.eventsEmitter.Lobby.emitPlayerReadyError('not-in-lobby'); return; }
  if (me.leader) { player.eventsEmitter.Lobby.emitPlayerReadyError('leader'); return; }
  if (me.ready) return;
  me.ready = true;
  player.eventsEmitter.Lobby.emitPlayerReady(player.playerId);
}
export function handleUnready(player: Player) {
  if (!player.lobby) { player.eventsEmitter.Lobby.emitPlayerUnreadyError('not-in-lobby'); return; }
  if (player.lobby.game) { player.eventsEmitter.Lobby.emitPlayerUnreadyError('in-game'); return; }
  const me = player.lobby.players.find(p => p.id === player.playerId);
  if (!me) { player.eventsEmitter.Lobby.emitPlayerUnreadyError('not-in-lobby'); return; }
  if (me.leader) { player.eventsEmitter.Lobby.emitPlayerUnreadyError('leader'); return; }
  if (!me.ready) return;
  me.ready = false;
  player.eventsEmitter.Lobby.emitPlayerUnready(player.playerId);
}
