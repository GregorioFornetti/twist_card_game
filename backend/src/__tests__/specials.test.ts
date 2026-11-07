import Lobby, { Card } from '../interfaces/Lobby';
import { startGame, playCard, acceptPenalty, challengeResponse, swapCardTarget, swapCardGive, giftTarget, giftGive, peekTarget, buildClientLobby } from '../events/game/functions/engine';
import { createDeck, defaultDeckConfig, validateDeckConfig } from '../functions/deck';

const card = (id: string, color: Card['color'], kind: Card['kind'], value?: number): Card => ({ id, color, kind, value });
function makeLobby(n = 3): Lobby {
  return {
    lobbyId: 'L-special', code: 'SPC123',
    players: Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}`, leader: i === 0, ready: true })),
    options: { targetScore: 500, handSize: 7, turnTimeSeconds: 30, deck: defaultDeckConfig(), stackPenalty: false, drawUntilPlayable: false, swapOnSeven: false }
  };
}
function rig(lobby: Lobby, hands: Record<string, Card[]>, top: Card, currentId: string, draw: Card[] = []) {
  const g = lobby.game!;
  for (const [id, hand] of Object.entries(hands)) g.playersState[id].hand = [...hand];
  g.discardPile = [top]; g.currentColor = top.color as string; g.currentPlayerId = currentId; g.status = 'playing';
  g.drawPile = [...draw];
  return g;
}
const filler = (id: string): Card => card(id, 'blue', 'number', 2);

describe('new special cards', () => {
  it('deck builds new kinds only when configured', () => {
    const cfg = defaultDeckConfig();
    expect(createDeck(cfg).some(c => c.kind === 'bomb')).toBe(false);
    cfg.colors[0].draw1 = 2; cfg.colors[0].shield = 1; cfg.wild2Count = 3; cfg.copycatCount = 1; cfg.bombCount = 1; cfg.shuffleCount = 1;
    const deck = createDeck(cfg);
    expect(deck.filter(c => c.kind === 'draw1').length).toBe(2);
    expect(deck.filter(c => c.kind === 'wild2').length).toBe(3);
    expect(deck.filter(c => c.kind === 'bomb').length).toBe(1);
    expect(validateDeckConfig(cfg)).not.toBeNull();
  });

  it('Draw One and Skip All and Reverse Draw apply their effects', () => {
    const lobby = makeLobby(3); startGame(lobby);
    let g = rig(lobby, { p1: [card('a', 'red', 'draw1'), filler('x')], p2: [filler('b')], p3: [filler('c')] }, card('t', 'red', 'number', 9), 'p1', [filler('d')]);
    playCard(lobby, 'p1', 'a');
    expect(g.playersState.p2.hand.length).toBe(2);
    expect(g.currentPlayerId).toBe('p3');

    g = rig(lobby, { p1: [card('a', 'red', 'skipall'), filler('x'), filler('y')], p2: [filler('b')], p3: [filler('c')] }, card('t', 'red', 'number', 9), 'p1');
    playCard(lobby, 'p1', 'a');
    expect(g.currentPlayerId).toBe('p1');

    g = rig(lobby, { p1: [card('a', 'red', 'reversedraw'), filler('x')], p2: [filler('b')], p3: [filler('c')] }, card('t', 'red', 'number', 9), 'p1', [filler('d')]);
    playCard(lobby, 'p1', 'a');
    expect(g.direction).toBe(-1);
    expect(g.playersState.p3.hand.length).toBe(2);
    expect(g.currentPlayerId).toBe('p3');
  });

  it('Wild Draw Two mirrors Draw Two; Bomb hits everyone; Shuffle keeps hand sizes', () => {
    const lobby = makeLobby(3); startGame(lobby);
    let g = rig(lobby, { p1: [card('a', 'wild', 'wild2'), filler('x')], p2: [filler('b')], p3: [filler('c')] }, card('t', 'red', 'number', 9), 'p1', [filler('d1'), filler('d2')]);
    playCard(lobby, 'p1', 'a', 'blue');
    expect(g.playersState.p2.hand.length).toBe(3);
    expect(g.currentColor).toBe('blue');

    g = rig(lobby, { p1: [card('a', 'wild', 'bomb'), filler('x')], p2: [filler('b')], p3: [filler('c')] }, card('t', 'red', 'number', 9), 'p1',
      [filler('d1'), filler('d2'), filler('d3'), filler('d4'), filler('d5')]);
    playCard(lobby, 'p1', 'a', 'red');
    expect(g.playersState.p2.hand.length).toBe(3);
    expect(g.playersState.p3.hand.length).toBe(3);
    expect(g.playersState.p1.hand.length).toBe(2); // played bomb, kept filler, drew 1

    g = rig(lobby, { p1: [card('a', 'wild', 'shuffle'), filler('x')], p2: [filler('b'), filler('z')], p3: [filler('c')] }, card('t', 'red', 'number', 9), 'p1');
    const before = ['x', 'b', 'z', 'c'].sort();
    playCard(lobby, 'p1', 'a', 'red');
    const after = [...g.playersState.p1.hand, ...g.playersState.p2.hand, ...g.playersState.p3.hand].map(c => c.id).sort();
    expect(after).toEqual(before);
    expect(g.playersState.p1.hand.length).toBe(1);
  });

  it('Discard Colour drops the rest of that colour and can win the hand', () => {
    const lobby = makeLobby(2); startGame(lobby);
    const g = rig(lobby, { p1: [card('a', 'red', 'discardcolor'), card('r1', 'red', 'number', 3)], p2: [filler('b')] }, card('t', 'red', 'number', 9), 'p1');
    playCard(lobby, 'p1', 'a');
    expect(g.status).toBe('hand-over');
    expect(g.handWinnerId).toBe('p1');
  });

  it('Colour Lock blocks Wilds until play returns to the locker', () => {
    const lobby = makeLobby(3); startGame(lobby);
    const g = rig(lobby, { p1: [card('a', 'red', 'lock'), card('x', 'red', 'number', 1)], p2: [card('w', 'wild', 'wild'), filler('b')], p3: [filler('c')] }, card('t', 'red', 'number', 9), 'p1');
    playCard(lobby, 'p1', 'a');
    expect(g.lockedColor).toBe('red');
    playCard(lobby, 'p2', 'w', 'blue');
    expect(g.playersState.p2.hand.some(c => c.id === 'w')).toBe(true);
    g.currentPlayerId = 'p1';
    playCard(lobby, 'p1', 'x');
    expect(g.lockedColor).toBeUndefined();
  });

  it('Copycat copies the top card effect', () => {
    const lobby = makeLobby(3); startGame(lobby);
    const g = rig(lobby, { p1: [card('a', 'wild', 'copycat'), filler('x')], p2: [filler('b')], p3: [filler('c')] }, card('t', 'red', 'skip'), 'p1');
    playCard(lobby, 'p1', 'a', 'green');
    expect(g.currentColor).toBe('green');
    expect(g.currentPlayerId).toBe('p3'); // copied Skip
  });

  it('Swap Card and Gift move one card; Peek reveals only to the peeker', () => {
    const lobby = makeLobby(3); startGame(lobby);
    let g = rig(lobby, { p1: [card('a', 'red', 'swapcard'), card('g1', 'green', 'number', 5)], p2: [card('b1', 'blue', 'number', 6)], p3: [filler('c')] }, card('t', 'red', 'number', 9), 'p1');
    playCard(lobby, 'p1', 'a');
    expect(g.status).toBe('swapcard');
    swapCardTarget(lobby, 'p1', 'p2');
    swapCardGive(lobby, 'p1', 'g1');
    expect(g.playersState.p1.hand.map(c => c.id)).toEqual(['b1']);
    expect(g.playersState.p2.hand.map(c => c.id)).toEqual(['g1']);

    g = rig(lobby, { p1: [card('a', 'red', 'gift'), card('g1', 'green', 'number', 5)], p2: [filler('b')], p3: [filler('c')] }, card('t', 'red', 'number', 9), 'p1');
    playCard(lobby, 'p1', 'a');
    giftTarget(lobby, 'p1', 'p3');
    giftGive(lobby, 'p1', 'g1');
    expect(g.playersState.p3.hand.map(c => c.id)).toContain('g1');
    expect(g.playersState.p1.hand.length).toBe(0 + 0); // gift card played, g1 given: hand empty check below
  });

  it('Peek records a private reveal', () => {
    const lobby = makeLobby(3); startGame(lobby);
    const g = rig(lobby, { p1: [card('a', 'red', 'peek'), filler('x')], p2: [card('secret', 'blue', 'number', 4)], p3: [filler('c')] }, card('t', 'red', 'number', 9), 'p1');
    playCard(lobby, 'p1', 'a');
    peekTarget(lobby, 'p1', 'p2');
    expect(buildClientLobby(lobby, 'p1').game!.revealedHands.p2.map(c => c.id)).toEqual(['secret']);
    expect(buildClientLobby(lobby, 'p3').game!.revealedHands.p2).toBeUndefined();
  });

  it('Shield blocks a challenge and a stacked penalty', () => {
    const lobby = makeLobby(3); startGame(lobby);
    let g = rig(lobby, { p1: [card('w', 'wild', 'wild4'), filler('x')], p2: [card('s', 'blue', 'shield'), filler('b')], p3: [filler('c')] }, card('t', 'red', 'number', 9), 'p1');
    playCard(lobby, 'p1', 'w', 'red');
    expect(g.status).toBe('challenging');
    expect(playCard(lobby, 'p2', 's').ok).toBe(true);
    expect(g.status).toBe('playing');
    expect(g.playersState.p2.hand.length).toBe(1); // shield spent, no draws
    expect(g.currentPlayerId).toBe('p2');

    const lobby2 = makeLobby(3); lobby2.options.stackPenalty = true; startGame(lobby2);
    g = rig(lobby2, { p1: [card('a', 'red', 'draw2'), filler('x')], p2: [card('s', 'blue', 'shield'), filler('b')], p3: [filler('c')] }, card('t', 'red', 'number', 9), 'p1');
    playCard(lobby2, 'p1', 'a');
    expect(g.status).toBe('penalty');
    expect(playCard(lobby2, 'p2', 's').ok).toBe(true);
    expect(g.playersState.p2.hand.length).toBe(1);
    expect(acceptPenalty(lobby2, 'p2').ok).toBe(false);
  });
});
