import Lobby, { Card } from '../interfaces/Lobby';
import { startGame, playCard, acceptPenalty, stackPenaltyCard, drawCardAction, swapHandsChoice } from '../events/game/functions/engine';
import { defaultDeckConfig } from '../functions/deck';

const card = (id: string, color: Card['color'], kind: Card['kind'], value?: number): Card => ({ id, color, kind, value });
function makeLobby(n: number, opts: Partial<Lobby['options']> = {}): Lobby {
  return {
    lobbyId: 'L-house', code: 'HOU123',
    players: Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}`, leader: i === 0, ready: true })),
    options: { targetScore: 500, handSize: 7, turnTimeSeconds: 30, deck: defaultDeckConfig(), stackPenalty: false, drawUntilPlayable: false, swapOnSeven: false, ...opts }
  };
}
function rig(lobby: Lobby, hands: Record<string, Card[]>, top: Card, currentId: string) {
  const g = lobby.game!;
  for (const [id, hand] of Object.entries(hands)) g.playersState[id].hand = [...hand];
  g.discardPile = [top]; g.currentColor = top.color as string; g.currentPlayerId = currentId; g.status = 'playing';
  return g;
}

describe('house rules', () => {
  it('stacks Draw Two penalties until someone accepts', () => {
    const lobby = makeLobby(3, { stackPenalty: true });
    startGame(lobby);
    const g = rig(lobby, {
      p1: [card('a', 'red', 'draw2'), card('x', 'red', 'number', 1)],
      p2: [card('b', 'blue', 'draw2'), card('y', 'red', 'number', 2)],
      p3: [card('c', 'red', 'number', 3)]
    }, card('t', 'red', 'number', 9), 'p1');
    g.drawPile = [card('d1', 'green', 'number', 1), card('d2', 'green', 'number', 2), card('d3', 'green', 'number', 3), card('d4', 'green', 'number', 4), card('d5', 'green', 'number', 5)];
    playCard(lobby, 'p1', 'a');
    expect(g.status).toBe('penalty');
    expect(g.pendingPenalty).toEqual({ amount: 2, victimId: 'p2' });
    expect(playCard(lobby, 'p2', 'y').ok).toBe(false); // only draw cards stack
    expect(stackPenaltyCard(lobby, 'p2', 'b').ok).toBe(true);
    expect(g.pendingPenalty).toEqual({ amount: 4, victimId: 'p3' });
    expect(g.playersState.p3.hand.length).toBe(1);
    expect(acceptPenalty(lobby, 'p3').ok).toBe(true);
    expect(g.playersState.p3.hand.length).toBe(5);
    expect(g.status).toBe('playing');
    expect(g.currentPlayerId).toBe('p1'); // victim loses a turn
  });

  it('with stacking off, Draw Two still draws immediately', () => {
    const lobby = makeLobby(2);
    startGame(lobby);
    const g = rig(lobby, { p1: [card('a', 'red', 'draw2'), card('x', 'red', 'number', 1)], p2: [card('b', 'red', 'number', 2)] }, card('t', 'red', 'number', 9), 'p1');
    playCard(lobby, 'p1', 'a');
    expect(g.status).toBe('playing');
    expect(g.playersState.p2.hand.length).toBe(3);
  });

  it('draws until a playable card when the rule is on', () => {
    const lobby = makeLobby(2, { drawUntilPlayable: true });
    startGame(lobby);
    const g = rig(lobby, { p1: [card('a', 'blue', 'number', 1)], p2: [card('b', 'red', 'number', 2)] }, card('t', 'red', 'number', 9), 'p1');
    g.drawPile = [card('d3', 'red', 'number', 5), card('d2', 'green', 'number', 4), card('d1', 'blue', 'number', 3)]; // popped from the end: d1, d2, then playable d3
    const r = drawCardAction(lobby, 'p1');
    expect(r.drawnPlayable).toBe(true);
    expect(g.playersState.p1.hand.map(c => c.id)).toEqual(['a', 'd1', 'd2', 'd3']);
    expect(g.playersState.p1.drawnCardId).toBe('d3');
  });

  it('playing a 7 offers a hand swap', () => {
    const lobby = makeLobby(3, { swapOnSeven: true });
    startGame(lobby);
    const g = rig(lobby, {
      p1: [card('a', 'red', 'number', 7), card('x', 'red', 'number', 1)],
      p2: [card('b', 'blue', 'number', 2)],
      p3: [card('c', 'green', 'number', 3), card('z', 'green', 'number', 4)]
    }, card('t', 'red', 'number', 9), 'p1');
    playCard(lobby, 'p1', 'a');
    expect(g.status).toBe('swapping');
    expect(swapHandsChoice(lobby, 'p2', 'p3').ok).toBe(false); // only the chooser decides
    expect(swapHandsChoice(lobby, 'p1', 'p2').ok).toBe(true);
    expect(g.playersState.p1.hand.map(c => c.id)).toEqual(['b']);
    expect(g.playersState.p2.hand.map(c => c.id)).toEqual(['x']);
    expect(g.status).toBe('playing');
    expect(g.currentPlayerId).toBe('p2');
  });

  it('keeping your hand after a 7 just passes the turn', () => {
    const lobby = makeLobby(2, { swapOnSeven: true });
    startGame(lobby);
    const g = rig(lobby, { p1: [card('a', 'red', 'number', 7), card('x', 'red', 'number', 1)], p2: [card('b', 'blue', 'number', 2)] }, card('t', 'red', 'number', 9), 'p1');
    playCard(lobby, 'p1', 'a');
    expect(swapHandsChoice(lobby, 'p1', undefined).ok).toBe(true);
    expect(g.playersState.p1.hand.map(c => c.id)).toEqual(['x']);
    expect(g.currentPlayerId).toBe('p2');
  });
});
