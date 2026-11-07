import Lobby, { Card } from '../interfaces/Lobby';
import { startGame, playCard, drawCardAction, passTurn, challengeResponse, buildClientLobby, applyTurnTimeout, describeCard, TURN_TIME_MS } from '../events/game/functions/engine';
import { defaultDeckConfig } from '../functions/deck';

function makeLobby(n = 3): Lobby {
  return {
    lobbyId: 'L1', code: 'ABC123',
    players: Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}`, leader: i === 0, ready: true })),
    options: { targetScore: 500, handSize: 7, turnTimeSeconds: 30, deck: defaultDeckConfig(), stackPenalty: false, drawUntilPlayable: false, swapOnSeven: false }
  };
}
const card = (id: string, color: Card['color'], kind: Card['kind'], value?: number): Card => ({ id, color, kind, value });

function rig(lobby: Lobby, hands: Record<string, Card[]>, top: Card, current: string, color: Card['color'] = 'red') {
  startGame(lobby);
  const g = lobby.game!;
  for (const [pid, h] of Object.entries(hands)) g.playersState[pid].hand = h;
  g.discardPile = [top];
  g.currentColor = color as any;
  g.currentPlayerId = current;
  g.status = 'playing';
  g.direction = 1;
  return g;
}

describe('Game engine', () => {
  it('deals 7 cards each and flips a starter', () => {
    const lobby = makeLobby(3);
    startGame(lobby);
    const g = lobby.game!;
    for (const p of lobby.players) expect(g.playersState[p.id].hand.length).toBe(7);
    expect(g.drawPile.length).toBe(108 - 21 - 1);
    expect(g.discardPile.length).toBe(1);
    expect(g.discardPile[0].kind).not.toBe('wild4');
  });

  it('rejects out-of-turn and non-matching plays', () => {
    const lobby = makeLobby(2);
    rig(lobby, { p1: [card('a', 'blue', 'number', 1)], p2: [card('b', 'red', 'number', 2)] }, card('t', 'red', 'number', 9), 'p1');
    expect(playCard(lobby, 'p2', 'b')).toEqual({ ok: false, error: 'not-your-turn' });
    expect(playCard(lobby, 'p1', 'a')).toEqual({ ok: false, error: 'card-not-playable' });
  });

  it('skip skips the next player; reverse flips direction (and acts as skip with 2 players)', () => {
    const lobby = makeLobby(3);
    const g = rig(lobby, { p1: [card('a', 'red', 'skip'), card('x', 'red', 'number', 1)], p2: [card('b', 'red', 'number', 2)], p3: [card('c', 'red', 'number', 3)] }, card('t', 'red', 'number', 9), 'p1');
    expect(playCard(lobby, 'p1', 'a', undefined).ok).toBe(true);
    expect(g.currentPlayerId).toBe('p3');
    const lobby2 = makeLobby(2);
    const g2 = rig(lobby2, { p1: [card('a', 'red', 'reverse'), card('x', 'red', 'number', 1)], p2: [card('b', 'red', 'number', 2)] }, card('t', 'red', 'number', 9), 'p1');
    playCard(lobby2, 'p1', 'a', undefined);
    expect(g2.direction).toBe(-1);
    expect(g2.currentPlayerId).toBe('p1');
  });

  it('draw two forces 2 draws and a lost turn', () => {
    const lobby = makeLobby(3);
    const g = rig(lobby, { p1: [card('a', 'red', 'draw2'), card('x', 'red', 'number', 1)], p2: [card('b', 'red', 'number', 2)], p3: [card('c', 'red', 'number', 3)] }, card('t', 'red', 'number', 9), 'p1');
    const before = g.playersState.p2.hand.length;
    playCard(lobby, 'p1', 'a', undefined);
    expect(g.playersState.p2.hand.length).toBe(before + 2);
    expect(g.currentPlayerId).toBe('p3');
  });

  it('playing down to one card needs no call and draws no penalty', () => {
    const lobby = makeLobby(2);
    const g = rig(lobby, { p1: [card('a', 'red', 'number', 9), card('x', 'red', 'number', 1)], p2: [card('b', 'red', 'number', 2)] }, card('t', 'red', 'number', 9), 'p1');
    playCard(lobby, 'p1', 'a', undefined);
    expect(g.playersState.p1.hand.length).toBe(1);
    expect(g.log.some(l => l.includes('is down to one card'))).toBe(true);
  });

  it('wild draw four: accept draws 4; failed challenge draws 6; successful challenge makes offender draw 4', () => {
    const setup = (offenderExtra: Card) => {
      const lobby = makeLobby(3);
      const g = rig(lobby, { p1: [card('w', 'wild', 'wild4'), offenderExtra], p2: [card('b', 'blue', 'number', 2)], p3: [card('c', 'red', 'number', 3)] }, card('t', 'red', 'number', 9), 'p1');
      playCard(lobby, 'p1', 'w', 'blue');
      return { lobby, g };
    };
    let { lobby, g } = setup(card('x', 'blue', 'number', 1)); // no red -> innocent
    expect(g.status).toBe('challenging');
    challengeResponse(lobby, 'p2', false);
    expect(g.playersState.p2.hand.length).toBe(5);
    expect(g.currentPlayerId).toBe('p3');

    ({ lobby, g } = setup(card('x', 'blue', 'number', 1)));
    challengeResponse(lobby, 'p2', true); // fails
    expect(g.playersState.p2.hand.length).toBe(7);
    expect(g.currentPlayerId).toBe('p3');

    ({ lobby, g } = setup(card('x', 'red', 'number', 1))); // held red -> guilty
    challengeResponse(lobby, 'p2', true);
    expect(g.playersState.p1.hand.length).toBe(5); // offender had 1 left +4
    expect(g.currentPlayerId).toBe('p2');
  });

  it('draw-then-pass flow: drawn playable may be played, otherwise pass', () => {
    const lobby = makeLobby(2);
    const g = rig(lobby, { p1: [card('a', 'blue', 'number', 1)], p2: [card('b', 'red', 'number', 2)] }, card('t', 'red', 'number', 9), 'p1');
    g.drawPile = [card('d', 'red', 'number', 3)];
    const r = drawCardAction(lobby, 'p1');
    expect(r.ok && (r as any).drawnPlayable).toBe(true);
    expect(passTurn(lobby, 'p1').ok).toBe(true);
    expect(g.currentPlayerId).toBe('p2');
  });

  it('ending a hand scores the other hands (actions 20, wilds 50)', () => {
    const lobby = makeLobby(2);
    const g = rig(lobby, { p1: [card('a', 'red', 'number', 9)], p2: [card('s', 'blue', 'skip'), card('w', 'wild', 'wild'), card('n', 'blue', 'number', 3)] }, card('t', 'red', 'number', 9), 'p1');
    playCard(lobby, 'p1', 'a', undefined);
    expect(g.playersState.p1.score).toBe(20 + 50 + 3);
    expect(g.status).toBe('hand-over');
  });

  it('logs who played which card, draws and passes', () => {
    const lobby = makeLobby(2);
    const g = rig(lobby, { p1: [card('a', 'red', 'number', 5), card('x', 'red', 'number', 1)], p2: [card('b', 'red', 'number', 2)] }, card('t', 'red', 'number', 9), 'p1');
    playCard(lobby, 'p1', 'a', undefined);
    expect(g.log.some(l => l.includes('P1 played Red 5'))).toBe(true);
    expect(describeCard(card('w', 'wild', 'wild4'), 'green')).toBe('Wild Draw Four (chose Green)');
    const view = buildClientLobby(lobby, 'p1');
    expect(view.game!.log.some(l => l.includes('P1 played Red 5'))).toBe(true);
  });

  it('sets a turn deadline and timeout draws a card and passes the turn', () => {
    const lobby = makeLobby(2);
    startGame(lobby);
    const g = lobby.game!;
    expect(g.turnEndsAt).toBeGreaterThan(Date.now());
    expect(g.turnEndsAt! - Date.now()).toBeLessThanOrEqual(TURN_TIME_MS);
    expect(buildClientLobby(lobby, 'p1').game!.turnTimeLimitMs).toBe(TURN_TIME_MS);
    // Rig a player with no playable card so the timeout draw cannot be played.
    const rigged = rig(lobby, { p1: [card('a', 'blue', 'number', 1)], p2: [card('b', 'red', 'number', 2)] }, card('t', 'red', 'number', 9), 'p1');
    rigged.drawPile = [card('d', 'blue', 'number', 3)];
    expect(applyTurnTimeout(lobby)).toBe(true);
    expect(rigged.playersState.p1.hand.length).toBe(2);
    expect(rigged.currentPlayerId).toBe('p2');
    expect(rigged.log.some(l => l.includes('ran out of time'))).toBe(true);
    expect(rigged.turnEndsAt).toBeGreaterThan(Date.now());
  });

  it('timeout on a Wild Draw Four challenge counts as accepting', () => {
    const lobby = makeLobby(3);
    const g = rig(lobby, { p1: [card('w', 'wild', 'wild4'), card('x', 'blue', 'number', 1)], p2: [card('b', 'blue', 'number', 2)], p3: [card('c', 'red', 'number', 3)] }, card('t', 'red', 'number', 9), 'p1');
    playCard(lobby, 'p1', 'w', 'blue');
    expect(g.status).toBe('challenging');
    expect(applyTurnTimeout(lobby)).toBe(true);
    expect(g.playersState.p2.hand.length).toBe(5);
    expect(g.status).toBe('playing');
  });

  it('client view hides other hands', () => {
    const lobby = makeLobby(2);
    startGame(lobby);
    const view = buildClientLobby(lobby, 'p1');
    expect(view.game!.currentPlayerCards.length).toBe(7);
    expect((view.game as any).playersState).toBeUndefined();
    expect(view.game!.players.p2.numCards).toBe(7);
  });
});
