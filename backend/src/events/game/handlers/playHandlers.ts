import Player from '../../../interfaces/Player';
import { CardColor } from '../../../interfaces/Lobby';
import { acceptPenalty, cancelChoice, challengeResponse, drawCardAction, giftGive, giftTarget, passTurn, peekTarget, playCard, swapCardGive, swapCardTarget, swapHandsChoice } from '../functions/engine';
import { afterChange } from '../functions/broadcast';

export function handlePlayCard(player: Player, cardId: string, chosenColor?: CardColor) {
  if (!player.lobby?.game) { player.eventsEmitter.Game.emitPlayError('not-in-game'); return; }
  const r = playCard(player.lobby, player.playerId, cardId, chosenColor);
  if (!r.ok) { player.eventsEmitter.Game.emitPlayError(r.error); return; }
  afterChange(player.io, player.lobby);
}
export function handleDrawCard(player: Player) {
  if (!player.lobby?.game) { player.eventsEmitter.Game.emitPlayError('not-in-game'); return; }
  const r = drawCardAction(player.lobby, player.playerId);
  if (!r.ok) { player.eventsEmitter.Game.emitPlayError(r.error); return; }
  afterChange(player.io, player.lobby);
}
export function handlePassTurn(player: Player) {
  if (!player.lobby?.game) { player.eventsEmitter.Game.emitPlayError('not-in-game'); return; }
  const r = passTurn(player.lobby, player.playerId);
  if (!r.ok) { player.eventsEmitter.Game.emitPlayError(r.error); return; }
  afterChange(player.io, player.lobby);
}
export function handlePenaltyAccept(player: Player) {
  if (!player.lobby?.game) { player.eventsEmitter.Game.emitPlayError('not-in-game'); return; }
  const r = acceptPenalty(player.lobby, player.playerId);
  if (!r.ok) { player.eventsEmitter.Game.emitPlayError(r.error); return; }
  afterChange(player.io, player.lobby);
}
export function handleSwapChoice(player: Player, targetId?: string) {
  if (!player.lobby?.game) { player.eventsEmitter.Game.emitPlayError('not-in-game'); return; }
  const r = swapHandsChoice(player.lobby, player.playerId, targetId);
  if (!r.ok) { player.eventsEmitter.Game.emitPlayError(r.error); return; }
  afterChange(player.io, player.lobby);
}
export function handleSwapCardTarget(player: Player, targetId: string) {
  if (!player.lobby?.game) { player.eventsEmitter.Game.emitPlayError('not-in-game'); return; }
  const r = swapCardTarget(player.lobby, player.playerId, targetId);
  if (!r.ok) { player.eventsEmitter.Game.emitPlayError(r.error); return; }
  afterChange(player.io, player.lobby);
}
export function handleSwapCardGive(player: Player, cardId: string) {
  if (!player.lobby?.game) { player.eventsEmitter.Game.emitPlayError('not-in-game'); return; }
  const r = swapCardGive(player.lobby, player.playerId, cardId);
  if (!r.ok) { player.eventsEmitter.Game.emitPlayError(r.error); return; }
  afterChange(player.io, player.lobby);
}
export function handleGiftTarget(player: Player, targetId: string) {
  if (!player.lobby?.game) { player.eventsEmitter.Game.emitPlayError('not-in-game'); return; }
  const r = giftTarget(player.lobby, player.playerId, targetId);
  if (!r.ok) { player.eventsEmitter.Game.emitPlayError(r.error); return; }
  afterChange(player.io, player.lobby);
}
export function handleGiftGive(player: Player, cardId: string) {
  if (!player.lobby?.game) { player.eventsEmitter.Game.emitPlayError('not-in-game'); return; }
  const r = giftGive(player.lobby, player.playerId, cardId);
  if (!r.ok) { player.eventsEmitter.Game.emitPlayError(r.error); return; }
  afterChange(player.io, player.lobby);
}
export function handlePeekTarget(player: Player, targetId?: string) {
  if (!player.lobby?.game) { player.eventsEmitter.Game.emitPlayError('not-in-game'); return; }
  const r = peekTarget(player.lobby, player.playerId, targetId);
  if (!r.ok) { player.eventsEmitter.Game.emitPlayError(r.error); return; }
  afterChange(player.io, player.lobby);
}
export function handleCancelChoice(player: Player) {
  if (!player.lobby?.game) { player.eventsEmitter.Game.emitPlayError('not-in-game'); return; }
  const r = cancelChoice(player.lobby, player.playerId);
  if (!r.ok) { player.eventsEmitter.Game.emitPlayError(r.error); return; }
  afterChange(player.io, player.lobby);
}
export function handleChallengeResponse(player: Player, challenge: boolean) {
  if (!player.lobby?.game) { player.eventsEmitter.Game.emitPlayError('not-in-game'); return; }
  const r = challengeResponse(player.lobby, player.playerId, !!challenge);
  if (!r.ok) { player.eventsEmitter.Game.emitPlayError(r.error); return; }
  afterChange(player.io, player.lobby);
}
