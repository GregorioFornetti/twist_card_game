import Lobby, { Card, CardColor, ClientLobby, Game } from '../../../interfaces/Lobby';
import { createDeck, isPlayable, cardPoints, cardLabel } from '../../../functions/deck';
import { WILD_KINDS } from '../../../interfaces/Lobby';
import { shuffle, nextPlayerId } from '../../../functions/shuffle';

/** Default time each player has to act on their turn (play, draw, pass or answer a challenge). */
export const TURN_TIME_MS = 30_000;

/** Turn limit for this lobby in ms, from its options; 0 means no turn timer. */
export function turnTimeMsFor(lobby: Lobby): number {
  const seconds = lobby.options.turnTimeSeconds;
  if (seconds === 0) return 0;
  return typeof seconds === 'number' && seconds > 0 ? seconds * 1000 : TURN_TIME_MS;
}

export const orderOf = (lobby: Lobby) => (lobby.game?.playerOrder?.length ? [...lobby.game.playerOrder] : lobby.players.filter(p => !p.spectator).map(p => p.id));
export const topCard = (game: Game) => game.discardPile[game.discardPile.length - 1];
const nameOf = (lobby: Lobby, id: string) => lobby.players.find(p => p.id === id)?.name ?? id;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
function stamp() { return new Date().toLocaleTimeString('en-GB', { hour12: false }); }
function log(game: Game, msg: string) { game.log = [`[${stamp()}] ${msg}`, ...game.log].slice(0, 100); }

const colorName = (id: string, colors?: { id: string; name: string }[]) => colors?.find(c => c.id === id)?.name ?? cap(id);
let gabsCardSeq = 0;
/** Broadcast a one-shot audio cue (easter egg) to every client. */
export function cueSound(game: Game, name: 'gabs' | 'salvei') {
  game.cueSeq = (game.cueSeq ?? 0) + 1;
  game.soundCue = { name, seq: game.cueSeq };
}
/** "Salvei!": a +2 was just played and the next player holds exactly one card — a +2. */
function cueSalveiIfSaved(lobby: Lobby, game: Game, fromId: string) {
  const nextId = nextPlayerId(orderOf(lobby), fromId, game.direction);
  const hand = game.playersState[nextId]?.hand ?? [];
  if (hand.length === 1 && hand[0].kind === 'draw2') cueSound(game, 'salvei');
}
/** Human-readable card name for the log, e.g. "Red 5", "Blue Skip", "Wild Draw Four (chose Green)". */
export function describeCard(card: Card, chosenColor?: CardColor, colors?: { id: string; name: string }[]): string {
  if (WILD_KINDS.includes(card.kind)) { const label = card.kind === 'wild4' ? 'Wild Draw Four' : card.kind === 'wild2' ? 'Wild Draw Two' : cardLabel(card); return chosenColor ? `${label} (chose ${colorName(chosenColor, colors)})` : label; }
  return `${colorName(card.color, colors)} ${cardLabel(card)}`;
}

/** (Re)start the turn countdown for whoever must act now; clear it when nobody must or the timer is off. */
const MUST_ACT = ['playing', 'challenging', 'penalty', 'swapping', 'swapcard', 'gift', 'peeking'];
export function refreshTurnTimer(lobby: Lobby, game: Game) {
  const limitMs = turnTimeMsFor(lobby);
  game.turnEndsAt = limitMs > 0 && MUST_ACT.includes(game.status) ? Date.now() + limitMs : undefined;
}

export function drawCards(lobby: Lobby, game: Game, playerId: string, n: number): Card[] {
  const st = game.playersState[playerId];
  const drawn: Card[] = [];
  for (let i = 0; i < n; i++) {
    if (game.drawPile.length === 0) {
      const top = game.discardPile.pop();
      game.drawPile = shuffle(game.discardPile);
      game.discardPile = top ? [top] : [];
      log(game, 'Draw pile ran out — discard pile reshuffled.');
      if (game.drawPile.length === 0) break;
    }
    const c = game.drawPile.pop()!;
    st.hand.push(c); drawn.push(c);
  }
  return drawn;
}

export function startGame(lobby: Lobby): Game {
  for (const p of lobby.players) p.spectator = false;
  const playersState: Game['playersState'] = {};
  for (const p of lobby.players) playersState[p.id] = { hand: [], score: 0 };
  const game: Game = {
    playersState, playerOrder: lobby.players.map(p => p.id), drawPile: [], discardPile: [], currentColor: 'red',
    currentPlayerId: lobby.players[0].id, direction: 1, dealerId: lobby.players[0].id,
    handNumber: 0, status: 'playing', lastAction: 'Game started', log: [], peekedBy: {}, cueSeq: 0
  };
  lobby.game = game;
  startHand(lobby);
  return game;
}

export function startHand(lobby: Lobby) {
  const game = lobby.game!;
  // Spectators who waited join from this hand.
  for (const p of lobby.players) p.spectator = false;
  game.playerOrder = lobby.players.map(p => p.id);
  const order = game.playerOrder;
  game.handNumber += 1;
  if (game.handNumber > 1 && order.includes(game.dealerId)) game.dealerId = nextPlayerId(order, game.dealerId, 1);
  if (!order.includes(game.dealerId)) game.dealerId = order[0];
  game.direction = 1;
  game.status = 'playing';
  game.pendingDrawFour = undefined;
  game.pendingPenalty = undefined; game.pendingSwap = undefined; game.pendingSwapCard = undefined; game.pendingGift = undefined; game.pendingPeek = undefined;
  game.lockedColor = undefined; game.lockedBy = undefined; game.peekedBy = {};
  game.handWinnerId = undefined; game.handPoints = undefined;
  for (const id of order) {
    if (!game.playersState[id]) game.playersState[id] = { hand: [], score: 0 };
    game.playersState[id].hand = []; game.playersState[id].drawnCardId = undefined;
  }
  let deck = shuffle(createDeck(lobby.options.deck));
  const handSize = lobby.options.handSize;
  for (let r = 0; r < handSize; r++) for (const id of order) game.playersState[id].hand.push(deck.pop()!);
  // Flip starter; Wild Draw Four is returned and reshuffled (official rule).
  let starter = deck.pop()!;
  while (starter.kind === 'wild4') { deck = shuffle([...deck, starter]); starter = deck.pop()!; }
  // Wild starter: first player chooses the colour by playing — reflip to keep one clear state machine.
  while (starter.kind === 'wild' || starter.kind === 'gabs') { deck = shuffle([...deck, starter]); starter = deck.pop()!; }
  game.drawPile = deck;
  game.discardPile = [starter];
  game.currentColor = starter.color as CardColor;
  const first = nextPlayerId(order, game.dealerId, 1);
  game.currentPlayerId = first;
  log(game, `Hand ${game.handNumber} dealt. ${nameOf(lobby, game.dealerId)} deals.`);
  if (starter.kind === 'skip') {
    game.currentPlayerId = nextPlayerId(order, first, 1);
    log(game, `Starter is a Skip — ${nameOf(lobby, first)} is skipped.`);
  } else if (starter.kind === 'reverse') {
    game.direction = -1; game.currentPlayerId = game.dealerId;
    log(game, 'Starter is a Reverse — direction reversed, dealer plays first.');
  } else if (starter.kind === 'draw2') {
    drawCards(lobby, game, first, 2);
    game.currentPlayerId = nextPlayerId(order, first, 1);
    log(game, `Starter is a Draw Two — ${nameOf(lobby, first)} draws 2 and is skipped.`);
  }
  log(game, `Starter card is ${describeCard(starter, undefined, lobby.options.deck.colors)}.`);
  game.lastAction = `Hand ${game.handNumber}: ${nameOf(lobby, game.currentPlayerId)} to play`;
  refreshTurnTimer(lobby, game);
}

function advance(lobby: Lobby, game: Game, fromId: string, steps = 1) {
  game.currentPlayerId = nextPlayerId(orderOf(lobby), fromId, game.direction, steps);
}

export function endHandIfWon(lobby: Lobby, winnerId: string): boolean {
  const game = lobby.game!;
  if (game.playersState[winnerId].hand.length > 0) return false;
  // Final Draw Two / Wild Draw Four still force draws before scoring.
  const last = topCard(game);
  const nxt = nextPlayerId(orderOf(lobby), winnerId, game.direction);
  if (last.kind === 'draw2') { drawCards(lobby, game, nxt, 2); log(game, `${nameOf(lobby, nxt)} draws 2 from the final Draw Two.`); }
  if (last.kind === 'wild4') { drawCards(lobby, game, nxt, 4); log(game, `${nameOf(lobby, nxt)} draws 4 from the final Wild Draw Four.`); }
  let pts = 0;
  for (const id of orderOf(lobby)) if (id !== winnerId) pts += game.playersState[id].hand.reduce((s, c) => s + cardPoints(c), 0);
  game.playersState[winnerId].score += pts;
  game.handWinnerId = winnerId; game.handPoints = pts;
  log(game, `${nameOf(lobby, winnerId)} wins the hand and scores ${pts} points.`);
  if (game.playersState[winnerId].score >= lobby.options.targetScore) {
    game.status = 'game-over'; game.winnerId = winnerId;
    lobby.gameRanking = [...orderOf(lobby)].sort((a, b) => game.playersState[b].score - game.playersState[a].score);
    log(game, `${nameOf(lobby, winnerId)} reaches ${lobby.options.targetScore} and wins the game!`);
  } else {
    game.status = 'hand-over';
  }
  game.lastAction = game.status === 'game-over' ? `${nameOf(lobby, winnerId)} wins the game` : `${nameOf(lobby, winnerId)} wins hand ${game.handNumber} (+${pts})`;
  game.turnEndsAt = undefined;
  return true;
}

export type PlayResult = { ok: true } | { ok: false; error: 'not-your-turn' | 'card-not-in-hand' | 'card-not-playable' | 'must-play-drawn-card' | 'color-required' | 'not-in-game' | 'challenge-pending' | 'color-locked' };

export function playCard(lobby: Lobby, playerId: string, cardId: string, chosenColor?: CardColor): PlayResult {
  const game = lobby.game;
  if (!game) return { ok: false, error: 'not-in-game' };
  if (game.status === 'challenging' || game.status === 'penalty') {
    const victim = game.status === 'challenging' ? game.pendingDrawFour?.victimId : game.pendingPenalty?.victimId;
    const held = game.playersState[playerId]?.hand.find(c => c.id === cardId);
    if (victim === playerId && held?.kind === 'shield') return shieldBlock(lobby, playerId, cardId);
    if (game.status === 'challenging') return { ok: false, error: 'challenge-pending' };
    return stackPenaltyCard(lobby, playerId, cardId, chosenColor);
  }
  if (game.status !== 'playing') return { ok: false, error: 'not-in-game' };
  if (game.currentPlayerId !== playerId) return { ok: false, error: 'not-your-turn' };
  const st = game.playersState[playerId];
  const idx = st.hand.findIndex(c => c.id === cardId);
  if (idx < 0) return { ok: false, error: 'card-not-in-hand' };
  if (st.drawnCardId && st.drawnCardId !== cardId) return { ok: false, error: 'must-play-drawn-card' };
  const card = st.hand[idx];
  if (card.kind !== 'gabs' && WILD_KINDS.includes(card.kind) && (!chosenColor || !lobby.options.deck.colors.some(c => c.id === chosenColor))) return { ok: false, error: 'color-required' };
  if (game.lockedColor && game.lockedBy !== playerId && WILD_KINDS.includes(card.kind)) return { ok: false, error: 'color-locked' };
  if (!isPlayable(card, topCard(game), game.currentColor)) return { ok: false, error: 'card-not-playable' };
  if (game.lockedBy === playerId) { game.lockedColor = undefined; game.lockedBy = undefined; log(game, 'Colour lock expired.'); }
  const effectiveKind = card.kind === 'copycat' ? (WILD_KINDS.includes(topCard(game).kind) ? 'wild' : topCard(game).kind) : card.kind;

  const prevColor = game.currentColor;
  const hadMatchingColor = st.hand.some((c, i) => i !== idx && c.color === prevColor);
  st.hand.splice(idx, 1);
  st.drawnCardId = undefined;
  game.discardPile.push(card);
  game.currentColor = card.kind === 'gabs' ? 'green' : WILD_KINDS.includes(card.kind) ? chosenColor! : (card.color as CardColor);
  game.lastAction = `${nameOf(lobby, playerId)} played ${describeCard(card, chosenColor, lobby.options.deck.colors)}`;
  log(game, `${nameOf(lobby, playerId)} played ${describeCard(card, chosenColor, lobby.options.deck.colors)} (${st.hand.length} card${st.hand.length === 1 ? '' : 's'} left).`);
  if (card.kind === 'gabs') cueSound(game, 'gabs');
  if (effectiveKind === 'draw2' && lobby.options.stackPenalty) cueSalveiIfSaved(lobby, game, playerId);

  if (st.hand.length === 1) log(game, `${nameOf(lobby, playerId)} is down to one card.`);
  if (endHandIfWon(lobby, playerId)) return { ok: true };

  const n = orderOf(lobby).length;
  const victimOf = () => nextPlayerId(orderOf(lobby), playerId, game.direction);
  const drawPenalty = (amount: number) => {
    const victim = victimOf();
    if (lobby.options.stackPenalty) {
      game.pendingPenalty = { amount, victimId: victim };
      game.status = 'penalty';
      game.currentPlayerId = victim;
      log(game, `${nameOf(lobby, victim)} may stack a Draw Two or Wild Draw Four, or accept +${amount}.`);
    } else {
      drawCards(lobby, game, victim, amount);
      log(game, `${nameOf(lobby, victim)} draws ${amount} and loses a turn.`);
      advance(lobby, game, playerId, 2);
    }
  };
  switch (effectiveKind) {
    case 'skip': log(game, `${nameOf(lobby, victimOf())} is skipped.`); advance(lobby, game, playerId, 2); break;
    case 'skipall':
      log(game, `Everyone else is skipped — ${nameOf(lobby, playerId)} plays again.`);
      game.currentPlayerId = playerId; break;
    case 'reverse':
      game.direction = (game.direction * -1) as 1 | -1;
      log(game, 'Direction reversed.');
      advance(lobby, game, playerId, n === 2 ? 2 : 1); break;
    case 'reversedraw': {
      game.direction = (game.direction * -1) as 1 | -1;
      const victim = victimOf();
      drawCards(lobby, game, victim, 1);
      log(game, `Direction reversed — ${nameOf(lobby, victim)} draws 1.`);
      game.currentPlayerId = victim; break;
    }
    case 'draw1': {
      const victim = victimOf();
      drawCards(lobby, game, victim, 1);
      log(game, `${nameOf(lobby, victim)} draws 1 and loses a turn.`);
      advance(lobby, game, playerId, 2); break;
    }
    case 'draw2': drawPenalty(2); break;
    case 'wild2': drawPenalty(2); break;
    case 'wild4': {
      const victim = victimOf();
      if (lobby.options.stackPenalty) {
        game.pendingPenalty = { amount: 4, victimId: victim };
        game.status = 'penalty';
        game.currentPlayerId = victim;
        log(game, `${nameOf(lobby, victim)} may stack a Draw Two or Wild Draw Four, or accept +4.`);
      } else {
        game.pendingDrawFour = { offenderId: playerId, victimId: victim, hadMatchingColor, chosenColor: chosenColor! };
        game.status = 'challenging';
        game.currentPlayerId = victim;
        log(game, `${nameOf(lobby, victim)} may accept the Wild Draw Four or challenge it.`);
      }
      break;
    }
    case 'gabs': {
      const victim = victimOf();
      const vst = game.playersState[victim];
      const discarded = vst.hand.length;
      for (const c of vst.hand) game.discardPile.push(c);
      vst.hand = [{ id: `gabs-skip-${++gabsCardSeq}`, color: 'green', kind: 'skip' }];
      vst.drawnCardId = undefined;
      game.currentColor = 'green';
      game.currentPlayerId = victim;
      log(game, `Gabs! ${nameOf(lobby, victim)} discards ${discarded} card${discarded === 1 ? '' : 's'} and is left with a single Green Skip — não pode ser verde!`);
      break;
    }
    case 'bomb': {
      for (const id of orderOf(lobby)) if (id !== playerId) drawCards(lobby, game, id, 2);
      drawCards(lobby, game, playerId, 1);
      log(game, `Bomb! Everyone else draws 2; ${nameOf(lobby, playerId)} draws 1.`);
      advance(lobby, game, playerId, 1); break;
    }
    case 'shuffle': {
      const order = orderOf(lobby);
      const counts = order.map(id => game.playersState[id].hand.length);
      const all = shuffle(order.flatMap(id => game.playersState[id].hand));
      order.forEach((id, i) => { game.playersState[id].hand = all.splice(0, counts[i]); game.playersState[id].drawnCardId = undefined; });
      log(game, 'All hands were shuffled and redealt.');
      advance(lobby, game, playerId, 1); break;
    }
    case 'lock':
      game.lockedColor = card.color as CardColor; game.lockedBy = playerId;
      log(game, `Colour locked to ${colorName(card.color, lobby.options.deck.colors)} until play returns to ${nameOf(lobby, playerId)}. No Wilds can be played.`);
      advance(lobby, game, playerId, 1); break;
    case 'discardcolor': {
      const mine = st.hand.filter(c => c.color === card.color);
      st.hand = st.hand.filter(c => c.color !== card.color);
      for (const c of mine) game.discardPile.push(c);
      log(game, `${nameOf(lobby, playerId)} discarded ${mine.length} more ${colorName(card.color, lobby.options.deck.colors)} card${mine.length === 1 ? '' : 's'}.`);
      advance(lobby, game, playerId, 1); break;
    }
    case 'swapcard':
      game.pendingSwapCard = { chooserId: playerId }; game.status = 'swapcard'; game.currentPlayerId = playerId;
      log(game, `${nameOf(lobby, playerId)} may swap a card with another player.`); break;
    case 'gift':
      game.pendingGift = { chooserId: playerId }; game.status = 'gift'; game.currentPlayerId = playerId;
      log(game, `${nameOf(lobby, playerId)} may give a card to another player.`); break;
    case 'peek':
      game.pendingPeek = { chooserId: playerId }; game.status = 'peeking'; game.currentPlayerId = playerId;
      log(game, `${nameOf(lobby, playerId)} may peek at a hand.`); break;
    default:
      if (card.kind === 'number' && card.value === 7 && lobby.options.swapOnSeven) {
        game.pendingSwap = { chooserId: playerId };
        game.status = 'swapping';
        game.currentPlayerId = playerId;
        log(game, `${nameOf(lobby, playerId)} may swap hands with another player.`);
      } else advance(lobby, game, playerId, 1);
  }
  if (effectiveKind === 'discardcolor' && st.hand.length === 0) { endHandIfWon(lobby, playerId); return { ok: true }; }
  refreshTurnTimer(lobby, game);
  return { ok: true };
}

export function drawCardAction(lobby: Lobby, playerId: string): PlayResult & { drawnPlayable?: boolean } {
  const game = lobby.game;
  if (!game || game.status !== 'playing') return { ok: false, error: 'not-in-game' };
  if (game.currentPlayerId !== playerId) return { ok: false, error: 'not-your-turn' };
  const st = game.playersState[playerId];
  if (st.drawnCardId) return { ok: false, error: 'must-play-drawn-card' };
  if (lobby.options.drawUntilPlayable) {
    let drawn: Card | undefined;
    let count = 0;
    while (true) {
      const [c] = drawCards(lobby, game, playerId, 1);
      if (!c) break;
      drawn = c; count += 1;
      if (isPlayable(c, topCard(game), game.currentColor)) break;
    }
    game.lastAction = `${nameOf(lobby, playerId)} drew ${count} card${count === 1 ? '' : 's'}`;
    log(game, `${nameOf(lobby, playerId)} drew ${count} card${count === 1 ? '' : 's'} until a playable one (${st.hand.length} cards).`);
    if (drawn && isPlayable(drawn, topCard(game), game.currentColor)) {
      st.drawnCardId = drawn.id;
      log(game, `${nameOf(lobby, playerId)} may play the drawn card or pass.`);
      return { ok: true, drawnPlayable: true };
    }
    advance(lobby, game, playerId, 1);
    refreshTurnTimer(lobby, game);
    return { ok: true, drawnPlayable: false };
  }
  const [drawn] = drawCards(lobby, game, playerId, 1);
  game.lastAction = `${nameOf(lobby, playerId)} drew a card`;
  log(game, `${nameOf(lobby, playerId)} drew a card (${st.hand.length} cards).`);
  if (drawn && isPlayable(drawn, topCard(game), game.currentColor)) {
    st.drawnCardId = drawn.id;
    log(game, `${nameOf(lobby, playerId)} may play the drawn card or pass.`);
    return { ok: true, drawnPlayable: true };
  }
  if (drawn) log(game, `${nameOf(lobby, playerId)} could not play it — turn passes.`);
  advance(lobby, game, playerId, 1);
  refreshTurnTimer(lobby, game);
  return { ok: true, drawnPlayable: false };
}

export function passTurn(lobby: Lobby, playerId: string): PlayResult {
  const game = lobby.game;
  if (!game || game.status !== 'playing') return { ok: false, error: 'not-in-game' };
  if (game.currentPlayerId !== playerId) return { ok: false, error: 'not-your-turn' };
  const st = game.playersState[playerId];
  if (!st.drawnCardId) return { ok: false, error: 'must-play-drawn-card' };
  st.drawnCardId = undefined;
  game.lastAction = `${nameOf(lobby, playerId)} passed`;
  log(game, `${nameOf(lobby, playerId)} passed.`);
  advance(lobby, game, playerId, 1);
  refreshTurnTimer(lobby, game);
  return { ok: true };
}

export function challengeResponse(lobby: Lobby, playerId: string, challenge: boolean): PlayResult {
  const game = lobby.game;
  if (!game || game.status !== 'challenging' || !game.pendingDrawFour) return { ok: false, error: 'not-in-game' };
  const p = game.pendingDrawFour;
  if (p.victimId !== playerId) return { ok: false, error: 'not-your-turn' };
  game.pendingDrawFour = undefined;
  game.status = 'playing';
  if (!challenge) {
    drawCards(lobby, game, playerId, 4);
    log(game, `${nameOf(lobby, playerId)} accepts and draws 4.`);
    advance(lobby, game, playerId, 1);
  } else if (p.hadMatchingColor) {
    drawCards(lobby, game, p.offenderId, 4);
    log(game, `Challenge succeeds — ${nameOf(lobby, p.offenderId)} had a matching colour and draws 4.`);
    game.currentPlayerId = playerId;
  } else {
    drawCards(lobby, game, playerId, 6);
    log(game, `Challenge fails — ${nameOf(lobby, playerId)} draws 6 and loses a turn.`);
    advance(lobby, game, playerId, 1);
  }
  refreshTurnTimer(lobby, game);
  return { ok: true };
}

export function shieldBlock(lobby: Lobby, playerId: string, cardId: string): PlayResult {
  const game = lobby.game;
  if (!game) return { ok: false, error: 'not-in-game' };
  const st = game.playersState[playerId];
  const idx = st.hand.findIndex(c => c.id === cardId && c.kind === 'shield');
  if (idx < 0) return { ok: false, error: 'card-not-playable' };
  const [card] = st.hand.splice(idx, 1);
  game.discardPile.push(card);
  game.pendingDrawFour = undefined;
  game.pendingPenalty = undefined;
  game.status = 'playing';
  game.currentPlayerId = playerId;
  game.lastAction = `${nameOf(lobby, playerId)} blocked with a Shield`;
  log(game, `${nameOf(lobby, playerId)} played a Shield and blocked the penalty.`);
  if (st.hand.length === 1) log(game, `${nameOf(lobby, playerId)} is down to one card.`);
  if (endHandIfWon(lobby, playerId)) return { ok: true };
  refreshTurnTimer(lobby, game);
  return { ok: true };
}

function finishChoice(lobby: Lobby, chooserId: string) {
  const game = lobby.game!;
  game.pendingSwapCard = undefined; game.pendingGift = undefined; game.pendingPeek = undefined;
  game.status = 'playing';
  advance(lobby, game, chooserId, 1);
  refreshTurnTimer(lobby, game);
}

export function swapCardTarget(lobby: Lobby, playerId: string, targetId: string): PlayResult {
  const game = lobby.game;
  if (!game || game.status !== 'swapcard' || game.pendingSwapCard?.chooserId !== playerId) return { ok: false, error: 'not-your-turn' };
  if (!game.playerOrder.includes(targetId) || targetId === playerId) return { ok: false, error: 'card-not-playable' };
  game.pendingSwapCard.targetId = targetId;
  return { ok: true };
}

export function swapCardGive(lobby: Lobby, playerId: string, cardId: string): PlayResult {
  const game = lobby.game;
  if (!game || game.status !== 'swapcard' || game.pendingSwapCard?.chooserId !== playerId || !game.pendingSwapCard.targetId) return { ok: false, error: 'not-your-turn' };
  const targetId = game.pendingSwapCard.targetId;
  const mine = game.playersState[playerId];
  const idx = mine.hand.findIndex(c => c.id === cardId);
  if (idx < 0) return { ok: false, error: 'card-not-in-hand' };
  const theirs = game.playersState[targetId];
  if (!theirs.hand.length) return { ok: false, error: 'card-not-playable' };
  const [given] = mine.hand.splice(idx, 1);
  const takenIdx = Math.floor(Math.random() * theirs.hand.length);
  const [taken] = theirs.hand.splice(takenIdx, 1);
  mine.hand.push(taken); theirs.hand.push(given);
  game.lastAction = `${nameOf(lobby, playerId)} swapped a card with ${nameOf(lobby, targetId)}`;
  log(game, `${nameOf(lobby, playerId)} swapped a card with ${nameOf(lobby, targetId)}.`);
  finishChoice(lobby, playerId);
  return { ok: true };
}

export function giftTarget(lobby: Lobby, playerId: string, targetId: string): PlayResult {
  const game = lobby.game;
  if (!game || game.status !== 'gift' || game.pendingGift?.chooserId !== playerId) return { ok: false, error: 'not-your-turn' };
  if (!game.playerOrder.includes(targetId) || targetId === playerId) return { ok: false, error: 'card-not-playable' };
  game.pendingGift.targetId = targetId;
  return { ok: true };
}

export function giftGive(lobby: Lobby, playerId: string, cardId: string): PlayResult {
  const game = lobby.game;
  if (!game || game.status !== 'gift' || game.pendingGift?.chooserId !== playerId || !game.pendingGift.targetId) return { ok: false, error: 'not-your-turn' };
  const targetId = game.pendingGift.targetId;
  const mine = game.playersState[playerId];
  const idx = mine.hand.findIndex(c => c.id === cardId);
  if (idx < 0) return { ok: false, error: 'card-not-in-hand' };
  const [given] = mine.hand.splice(idx, 1);
  game.playersState[targetId].hand.push(given);
  game.lastAction = `${nameOf(lobby, playerId)} gave a card to ${nameOf(lobby, targetId)}`;
  log(game, `${nameOf(lobby, playerId)} gave a card to ${nameOf(lobby, targetId)}.`);
  if (mine.hand.length === 0) { game.pendingGift = undefined; game.status = 'playing'; endHandIfWon(lobby, playerId); return { ok: true }; }
  finishChoice(lobby, playerId);
  return { ok: true };
}

export function peekTarget(lobby: Lobby, playerId: string, targetId?: string): PlayResult {
  const game = lobby.game;
  if (!game || game.status !== 'peeking' || game.pendingPeek?.chooserId !== playerId) return { ok: false, error: 'not-your-turn' };
  if (targetId && game.playerOrder.includes(targetId) && targetId !== playerId) {
    game.peekedBy[playerId] = [...(game.peekedBy[playerId] ?? []), targetId];
    game.lastAction = `${nameOf(lobby, playerId)} peeked at a hand`;
    log(game, `${nameOf(lobby, playerId)} peeked at ${nameOf(lobby, targetId)}'s hand.`);
  }
  finishChoice(lobby, playerId);
  return { ok: true };
}

export function cancelChoice(lobby: Lobby, playerId: string): PlayResult {
  const game = lobby.game;
  if (!game || !['swapcard', 'gift', 'peeking'].includes(game.status)) return { ok: false, error: 'not-in-game' };
  const chooser = game.pendingSwapCard?.chooserId ?? game.pendingGift?.chooserId ?? game.pendingPeek?.chooserId;
  if (chooser !== playerId) return { ok: false, error: 'not-your-turn' };
  finishChoice(lobby, playerId);
  return { ok: true };
}

export function stackPenaltyCard(lobby: Lobby, playerId: string, cardId: string, chosenColor?: CardColor): PlayResult {
  const game = lobby.game;
  if (!game || game.status !== 'penalty' || !game.pendingPenalty) return { ok: false, error: 'not-in-game' };
  if (game.pendingPenalty.victimId !== playerId || game.currentPlayerId !== playerId) return { ok: false, error: 'not-your-turn' };
  const st = game.playersState[playerId];
  const idx = st.hand.findIndex(c => c.id === cardId);
  if (idx < 0) return { ok: false, error: 'card-not-in-hand' };
  const card = st.hand[idx];
  if (card.kind !== 'draw2' && card.kind !== 'wild4') return { ok: false, error: 'card-not-playable' };
  if (card.kind === 'wild4' && (!chosenColor || !lobby.options.deck.colors.some(c => c.id === chosenColor))) return { ok: false, error: 'color-required' };
  st.hand.splice(idx, 1);
  game.discardPile.push(card);
  if (card.kind === 'wild4') game.currentColor = chosenColor!;
  else game.currentColor = card.color as CardColor;
  if (card.kind === 'draw2') cueSalveiIfSaved(lobby, game, playerId);
  const add = card.kind === 'wild4' ? 4 : 2;
  game.pendingPenalty.amount += add;
  game.lastAction = `${nameOf(lobby, playerId)} stacked ${describeCard(card, chosenColor, lobby.options.deck.colors)} (+${game.pendingPenalty.amount})`;
  log(game, `${nameOf(lobby, playerId)} stacked ${describeCard(card, chosenColor, lobby.options.deck.colors)} — penalty is now +${game.pendingPenalty.amount}.`);
  if (st.hand.length === 1) log(game, `${nameOf(lobby, playerId)} is down to one card.`);
  if (st.hand.length === 0) {
    game.pendingPenalty = undefined;
    game.status = 'playing';
    endHandIfWon(lobby, playerId);
    return { ok: true };
  }
  const pending = game.pendingPenalty;
  const next = nextPlayerId(orderOf(lobby), playerId, game.direction);
  pending.victimId = next;
  game.currentPlayerId = next;
  log(game, `${nameOf(lobby, next)} may stack or accept +${pending.amount}.`);
  refreshTurnTimer(lobby, game);
  return { ok: true };
}

export function acceptPenalty(lobby: Lobby, playerId: string): PlayResult {
  const game = lobby.game;
  if (!game || game.status !== 'penalty' || !game.pendingPenalty) return { ok: false, error: 'not-in-game' };
  if (game.pendingPenalty.victimId !== playerId) return { ok: false, error: 'not-your-turn' };
  const amount = game.pendingPenalty.amount;
  game.pendingPenalty = undefined;
  game.status = 'playing';
  drawCards(lobby, game, playerId, amount);
  game.lastAction = `${nameOf(lobby, playerId)} accepted +${amount}`;
  log(game, `${nameOf(lobby, playerId)} accepts and draws ${amount}, losing a turn.`);
  advance(lobby, game, playerId, 1);
  refreshTurnTimer(lobby, game);
  return { ok: true };
}

export function swapHandsChoice(lobby: Lobby, playerId: string, targetId?: string): PlayResult {
  const game = lobby.game;
  if (!game || game.status !== 'swapping' || !game.pendingSwap) return { ok: false, error: 'not-in-game' };
  if (game.pendingSwap.chooserId !== playerId) return { ok: false, error: 'not-your-turn' };
  game.pendingSwap = undefined;
  game.status = 'playing';
  if (targetId && targetId !== playerId && game.playerOrder.includes(targetId)) {
    const mine = game.playersState[playerId].hand;
    game.playersState[playerId].hand = game.playersState[targetId].hand;
    game.playersState[targetId].hand = mine;
    game.playersState[playerId].drawnCardId = undefined;
    game.playersState[targetId].drawnCardId = undefined;
    game.lastAction = `${nameOf(lobby, playerId)} swapped hands with ${nameOf(lobby, targetId)}`;
    log(game, `${nameOf(lobby, playerId)} swapped hands with ${nameOf(lobby, targetId)}.`);
  } else {
    game.lastAction = `${nameOf(lobby, playerId)} kept their hand`;
    log(game, `${nameOf(lobby, playerId)} kept their hand.`);
  }
  advance(lobby, game, playerId, 1);
  refreshTurnTimer(lobby, game);
  return { ok: true };
}

/** Auto-action when the turn timer expires: pending decisions default to accepting / keeping, otherwise draw (and pass if the drawn card could be played). */
export function applyTurnTimeout(lobby: Lobby): boolean {
  const game = lobby.game;
  if (!game || !MUST_ACT.includes(game.status)) return false;
  const playerId = game.currentPlayerId;
  log(game, `⏰ ${nameOf(lobby, playerId)} ran out of time.`);
  game.lastAction = `${nameOf(lobby, playerId)} ran out of time`;
  if (game.status === 'challenging') return challengeResponse(lobby, playerId, false).ok;
  if (game.status === 'penalty') return acceptPenalty(lobby, playerId).ok;
  if (game.status === 'swapping') return swapHandsChoice(lobby, playerId, undefined).ok;
  if (game.status === 'swapcard' || game.status === 'gift' || game.status === 'peeking') return cancelChoice(lobby, playerId).ok;
  if (game.playersState[playerId]?.drawnCardId) return passTurn(lobby, playerId).ok;
  const r = drawCardAction(lobby, playerId);
  if (!r.ok) return false;
  if (r.drawnPlayable) passTurn(lobby, playerId);
  return true;
}

/** Remove a player who left mid-game, keeping the hand playable for everyone else. */
export function removePlayerFromGame(lobby: Lobby, playerId: string): boolean {
  const game = lobby.game;
  if (!game || !game.playerOrder.includes(playerId)) return false;
  const name = nameOf(lobby, playerId);
  const handPointsById: Record<string, number> = {};
  for (const id of game.playerOrder) handPointsById[id] = (game.playersState[id]?.hand ?? []).reduce((s, c) => s + cardPoints(c), 0);
  if (game.status === 'challenging' && game.pendingDrawFour) {
    const victim = game.pendingDrawFour.victimId;
    if (victim === playerId || game.pendingDrawFour.offenderId === playerId) {
      game.pendingDrawFour = undefined;
      game.status = 'playing';
      game.currentPlayerId = victim === playerId ? game.currentPlayerId : victim;
    }
  }
  if (game.status === 'penalty' && game.pendingPenalty?.victimId === playerId) { game.pendingPenalty = undefined; game.status = 'playing'; }
  if (game.status === 'swapping' && game.pendingSwap?.chooserId === playerId) { game.pendingSwap = undefined; game.status = 'playing'; }
  if (['swapcard', 'gift', 'peeking'].includes(game.status)) {
    const chooser = game.pendingSwapCard?.chooserId ?? game.pendingGift?.chooserId ?? game.pendingPeek?.chooserId;
    if (chooser === playerId) { game.pendingSwapCard = undefined; game.pendingGift = undefined; game.pendingPeek = undefined; game.status = 'playing'; }
  }
  const wasCurrent = game.currentPlayerId === playerId;
  const idx = game.playerOrder.indexOf(playerId);
  game.playerOrder.splice(idx, 1);
  delete game.playersState[playerId];
  log(game, `${name} left the game.`);
  game.lastAction = `${name} left the game`;
  if (game.status === 'playing' || game.status === 'challenging') {
    game.status = 'playing';
    if (game.playerOrder.length === 1) {
      const winnerId = game.playerOrder[0];
      const pts = Object.entries(handPointsById).filter(([id]) => id !== winnerId).reduce((s, [, v]) => s + v, 0);
      game.playersState[winnerId].score += pts;
      game.handWinnerId = winnerId; game.handPoints = pts;
      log(game, `${nameOf(lobby, winnerId)} wins the hand and scores ${pts} points.`);
      if (game.playersState[winnerId].score >= lobby.options.targetScore) {
        game.status = 'game-over'; game.winnerId = winnerId;
        lobby.gameRanking = [...game.playerOrder].sort((a, b) => game.playersState[b].score - game.playersState[a].score);
        log(game, `${nameOf(lobby, winnerId)} reaches ${lobby.options.targetScore} and wins the game!`);
      } else game.status = 'hand-over';
      game.turnEndsAt = undefined;
    } else if (wasCurrent) {
      game.currentPlayerId = game.playerOrder[idx % game.playerOrder.length];
      refreshTurnTimer(lobby, game);
    } else refreshTurnTimer(lobby, game);
  }
  return true;
}

export function buildClientLobby(lobby: Lobby, viewerId: string): ClientLobby {
  const base: ClientLobby = { lobbyId: lobby.lobbyId, code: lobby.code, players: lobby.players, options: lobby.options, gameRanking: lobby.gameRanking, guris: lobby.guris };
  const game = lobby.game;
  if (!game) return base;
  const players: ClientLobby['game'] extends infer G ? { [k: string]: { numCards: number; score: number } } : never = {};
  for (const p of lobby.players) players[p.id] = { numCards: game.playersState[p.id]?.hand.length ?? 0, score: game.playersState[p.id]?.score ?? 0 };
  base.game = {
    currentColor: game.currentColor, currentPlayerId: game.currentPlayerId, direction: game.direction,
    dealerId: game.dealerId, handNumber: game.handNumber, status: game.status,
    topCard: topCard(game), discardCount: game.discardPile.length, drawPileCount: game.drawPile.length,
    currentPlayerCards: [...(game.playersState[viewerId]?.hand ?? [])],
    drawnCardId: game.playersState[viewerId]?.drawnCardId,
    players,
    pendingDrawFour: game.pendingDrawFour ? { offenderId: game.pendingDrawFour.offenderId, victimId: game.pendingDrawFour.victimId, chosenColor: game.pendingDrawFour.chosenColor } : undefined,
    pendingPenalty: game.pendingPenalty ? { ...game.pendingPenalty } : undefined,
    pendingSwap: game.pendingSwap ? { ...game.pendingSwap } : undefined,
    pendingSwapCard: game.pendingSwapCard ? { ...game.pendingSwapCard } : undefined,
    pendingGift: game.pendingGift ? { ...game.pendingGift } : undefined,
    pendingPeek: game.pendingPeek ? { ...game.pendingPeek } : undefined,
    revealedHands: Object.fromEntries((game.peekedBy[viewerId] ?? []).filter(id => game.playersState[id]).map(id => [id, [...game.playersState[id].hand]])),
    lockedColor: game.lockedColor, lockedBy: game.lockedBy,
    soundCue: game.soundCue ? { ...game.soundCue } : undefined,
    lastAction: game.lastAction, handWinnerId: game.handWinnerId, handPoints: game.handPoints,
    winnerId: game.winnerId, log: game.log, targetScore: lobby.options.targetScore,
    turnEndsAt: game.turnEndsAt, turnTimeLimitMs: turnTimeMsFor(lobby),
    turnTimeSeconds: lobby.options.turnTimeSeconds, colors: lobby.options.deck.colors
  };
  return base;
}

export function buildAllViews(lobby: Lobby): { [playerId: string]: ClientLobby } {
  const views: { [playerId: string]: ClientLobby } = {};
  for (const p of lobby.players) if (!p.bot) views[p.id] = buildClientLobby(lobby, p.id);
  return views;
}
export function chooseBotColor(hand: Card[]): CardColor {
  const counts: Record<string, number> = {};
  for (const c of hand) if (c.color !== 'wild') counts[c.color] = (counts[c.color] ?? 0) + 1;
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as CardColor) ?? 'red';
}
export function chooseBotCard(lobby: Lobby, botId: string): { card: Card; color: CardColor } | null {
  const game = lobby.game!;
  const hand = game.playersState[botId].hand;
  const playable = hand.filter(c => isPlayable(c, topCard(game), game.currentColor));
  if (!playable.length) return null;
  const pref = [...playable].sort((a, b) => {
    const rank = (c: Card) => c.kind === 'number' ? 0 : c.kind === 'wild' ? 2 : c.kind === 'wild4' ? 3 : 1;
    return rank(b) - rank(a);
  });
  // Keep wilds for later unless desperate.
  const nonWild = pref.filter(c => c.kind !== 'wild' && c.kind !== 'wild4');
  const card = (nonWild[0] ?? pref[0]);
  return { card, color: chooseBotColor(hand) };
}
