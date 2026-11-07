import { Server } from 'socket.io';
import Lobby from '../../../interfaces/Lobby';
import { players } from '../../../global';
import EventsEmitter from '../../Emitter';
import { acceptPenalty, applyTurnTimeout, buildAllViews, cancelChoice, challengeResponse, chooseBotCard, chooseBotColor, drawCardAction, giftGive, giftTarget, passTurn, peekTarget, playCard, stackPenaltyCard, startHand, swapCardGive, swapCardTarget, swapHandsChoice } from './engine';

export function emitAll(io: Server, lobby: Lobby) {
  const human = lobby.players.find(p => !p.bot && players[p.id]);
  if (!human) return;
  const emitter = new EventsEmitter(io, players[human.id].socket, lobby.lobbyId);
  emitter.Game.emitGameState(buildAllViews(lobby));
}

let timers = new Set<ReturnType<typeof setTimeout>>();
const turnTimers = new Map<string, ReturnType<typeof setTimeout>>();
function scheduleTurnTimeout(io: Server, lobby: Lobby) {
  const prev = turnTimers.get(lobby.lobbyId);
  if (prev) clearTimeout(prev);
  const game = lobby.game;
  if (!game?.turnEndsAt || !['playing', 'challenging', 'penalty', 'swapping', 'swapcard', 'gift', 'peeking'].includes(game.status)) return;
  const endsAt = game.turnEndsAt;
  const playerId = game.currentPlayerId;
  const status = game.status;
  const t = setTimeout(() => {
    turnTimers.delete(lobby.lobbyId);
    const g = lobby.game;
    if (!g || g.turnEndsAt !== endsAt || g.currentPlayerId !== playerId || g.status !== status) return;
    if (!applyTurnTimeout(lobby)) return;
    emitAll(io, lobby);
    scheduleNext(io, lobby);
  }, Math.max(0, endsAt - Date.now()));
  turnTimers.set(lobby.lobbyId, t);
}
export function scheduleNext(io: Server, lobby: Lobby) {
  const game = lobby.game;
  if (!game) return;
  if (game.status === 'hand-over') {
    scheduleTurnTimeout(io, lobby);
    const t = setTimeout(() => { if (lobby.game?.status === 'hand-over') { startHand(lobby); emitAll(io, lobby); scheduleNext(io, lobby); } }, 5000);
    timers.add(t); return;
  }
  if (!['playing', 'challenging', 'penalty', 'swapping', 'swapcard', 'gift', 'peeking'].includes(game.status)) { scheduleTurnTimeout(io, lobby); return; }
  scheduleTurnTimeout(io, lobby);
  const current = lobby.players.find(p => p.id === game.currentPlayerId);
  if (!current?.bot) return;
  const t = setTimeout(() => {
    timers.delete(t);
    const g = lobby.game; if (!g) return;
    if (g.status === 'challenging' && g.pendingDrawFour?.victimId === current.id) {
      challengeResponse(lobby, current.id, Math.random() < 0.25);
    } else if (g.status === 'penalty' && g.pendingPenalty?.victimId === current.id) {
      const stack = g.playersState[current.id].hand.find(c => c.kind === 'draw2' || c.kind === 'wild4');
      if (stack && Math.random() < 0.7) stackPenaltyCard(lobby, current.id, stack.id, stack.kind === 'wild4' ? pickColor(lobby, current.id) : undefined);
      else acceptPenalty(lobby, current.id);
    } else if (g.status === 'swapping' && g.pendingSwap?.chooserId === current.id) {
      const myCount = g.playersState[current.id].hand.length;
      const target = g.playerOrder.filter(id => id !== current.id).sort((a, b) => g.playersState[a].hand.length - g.playersState[b].hand.length)[0];
      swapHandsChoice(lobby, current.id, target && g.playersState[target].hand.length < myCount ? target : undefined);
    } else if ((g.status === 'swapcard' || g.status === 'gift' || g.status === 'peeking') && g.currentPlayerId === current.id) {
      const others = g.playerOrder.filter(id => id !== current.id);
      const target = others.sort((a, b) => g.playersState[a].hand.length - g.playersState[b].hand.length)[0];
      if (g.status === 'peeking') peekTarget(lobby, current.id, target);
      else if (g.status === 'swapcard') { if (target && swapCardTarget(lobby, current.id, target).ok) { const give = g.playersState[current.id].hand[0]; if (give) swapCardGive(lobby, current.id, give.id); } else cancelChoice(lobby, current.id); }
      else { if (target && giftTarget(lobby, current.id, target).ok) { const give = g.playersState[current.id].hand[0]; if (give) giftGive(lobby, current.id, give.id); } else cancelChoice(lobby, current.id); }
    } else if (g.status === 'playing' && g.currentPlayerId === current.id) {
      const pick = chooseBotCard(lobby, current.id);
      if (!pick) {
        const r = drawCardAction(lobby, current.id);
        if (r.ok && r.drawnPlayable) {
          const drawn = g.playersState[current.id].hand.find(c => c.id === g.playersState[current.id].drawnCardId);
          if (drawn) playCard(lobby, current.id, drawn.id, drawn.kind === 'wild' || drawn.kind === 'wild4' ? pickColor(lobby, current.id) : undefined);
          else passTurn(lobby, current.id);
        }
      } else {
        playCard(lobby, current.id, pick.card.id, (pick.card.kind === 'wild' || pick.card.kind === 'wild4') ? pick.color : undefined);
      }
    }
    emitAll(io, lobby);
    scheduleNext(io, lobby);
  }, 900);
  timers.add(t);
}
function pickColor(lobby: Lobby, botId: string) {
  return chooseBotColor(lobby.game!.playersState[botId].hand);
}
export function afterChange(io: Server, lobby: Lobby) { emitAll(io, lobby); scheduleNext(io, lobby); }
