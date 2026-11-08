import Lobby, { Card } from '../interfaces/Lobby';
import { createDeck, deckSize, defaultDeckConfig, validateDeckConfig } from '../functions/deck';
import { defaultGameOptions } from '../global';
import { startGame, playCard, buildClientLobby } from '../events/game/functions/engine';
import { handleCreateLobby } from '../events/lobby/handlers/createLobby';
import { handleResetOptions, handleUpdateOptions } from '../events/lobby/handlers/botsAndStart';
import EventsEmitter from '../events/Emitter';
import { lobbys, players } from '../global';

const card = (id: string, color: Card['color'], kind: Card['kind'], value?: number): Card => ({ id, color, kind, value });
function makeLobby(guris = false): Lobby {
  return {
    lobbyId: 'L-guris', code: 'GUR123', guris,
    players: [{ id: 'p1', name: 'P1', leader: true, ready: true }, { id: 'p2', name: 'P2', leader: false, ready: true }],
    options: defaultGameOptions(guris)
  };
}
function fakePlayer(lobby: Lobby, emitted: { event: string; args: any[] }[], playerId = 'p1') {
  lobbys[lobby.lobbyId] = lobby;
  const socket = { id: 's-' + playerId, emit: (event: string, ...args: any[]) => { emitted.push({ event, args }); } } as any;
  const io = { to: () => ({ emit: (event: string, ...args: any[]) => { emitted.push({ event, args }); } }) } as any;
  return { playerId, socket, io, lobby, eventsEmitter: new EventsEmitter(io, socket, lobby.lobbyId) } as any;
}
function rig(lobby: Lobby, hands: Record<string, Card[]>, top: Card, currentId: string) {
  const g = lobby.game!;
  for (const [id, hand] of Object.entries(hands)) g.playersState[id].hand = [...hand];
  g.discardPile = [top]; g.currentColor = top.color as string; g.currentPlayerId = currentId; g.status = 'playing';
  g.drawPile = [card('draw1', 'blue', 'number', 4), card('draw2', 'blue', 'number', 5)];
  return g;
}

describe('guris mode defaults', () => {
  it('classic deck has no Gabs; the guris deck has exactly one', () => {
    expect(createDeck().filter(c => c.kind === 'gabs').length).toBe(0);
    expect(deckSize(defaultDeckConfig())).toBe(108);
    const guris = defaultGameOptions(true);
    expect(guris.deck.gabsCount).toBe(1);
    expect(createDeck(guris.deck).filter(c => c.kind === 'gabs').length).toBe(1);
    expect(deckSize(guris.deck)).toBe(109);
    expect(defaultGameOptions(false).deck.gabsCount).toBe(0);
    const cfg = defaultDeckConfig(); cfg.gabsCount = 3;
    expect(validateDeckConfig(cfg)?.gabsCount).toBe(3);
  });

  it('creating a lobby via /guris marks it and uses guris defaults', () => {
    const emitted: { event: string; args: any[] }[] = [];
    const host: any = { playerId: 'host-1', socket: { id: 'sock-1', emit: (e: string, ...a: any[]) => emitted.push({ event: e, args: a }) }, lobby: undefined };
    host.eventsEmitter = new EventsEmitter({ to: () => ({ emit: () => undefined }) } as any, host.socket as any, 'x');
    handleCreateLobby(host, 'Host', true);
    const created = players['host-1'].lobby!;
    expect(created.guris).toBe(true);
    expect(created.options.deck.gabsCount).toBe(1);
    const view = emitted.find(e => e.event === 'join-lobby-success')!.args[0];
    expect(view.guris).toBe(true);
  });

  it('reset restores guris defaults; Gabs count is stripped outside guris mode', () => {
    const lobby = makeLobby(true);
    const emitted: { event: string; args: any[] }[] = [];
    lobby.options.deck.gabsCount = 9; lobby.options.turnTimeSeconds = 60;
    handleResetOptions(fakePlayer(lobby, emitted));
    expect(lobby.options.deck.gabsCount).toBe(1);
    expect(lobby.options.turnTimeSeconds).toBe(30);

    const normal = makeLobby(false);
    const cfg = defaultDeckConfig(); cfg.gabsCount = 5;
    handleUpdateOptions(fakePlayer(normal, emitted), { deck: cfg });
    expect(normal.options.deck.gabsCount).toBe(0);
    handleResetOptions(fakePlayer(normal, emitted));
    expect(normal.options.deck.gabsCount).toBe(0);
  });
});

describe('gabs card', () => {
  it('leaves the next player with a single green Skip, sets green, and cues the audio', () => {
    const lobby = makeLobby(true); startGame(lobby);
    const g = rig(lobby, {
      p1: [card('g', 'wild', 'gabs'), card('x', 'red', 'number', 3)],
      p2: [card('a', 'red', 'number', 1), card('b', 'blue', 'number', 2), card('c', 'yellow', 'skip')]
    }, card('t', 'red', 'number', 9), 'p1');
    expect(playCard(lobby, 'p1', 'g').ok).toBe(true);
    expect(g.playersState.p2.hand).toEqual([expect.objectContaining({ color: 'green', kind: 'skip' })]);
    expect(g.discardPile.some(c => c.id === 'a') && g.discardPile.some(c => c.id === 'b')).toBe(true);
    expect(g.currentColor).toBe('green');
    expect(g.currentPlayerId).toBe('p2');
    expect(g.soundCue?.name).toBe('gabs');
    expect(buildClientLobby(lobby, 'p1').game!.soundCue?.name).toBe('gabs');

    // The set-up card is playable on green and empties the hand: p2 wins the hand.
    const skipId = g.playersState.p2.hand[0].id;
    expect(playCard(lobby, 'p2', skipId).ok).toBe(true);
    expect(g.status === 'hand-over' || g.status === 'game-over').toBe(true);
    expect(g.handWinnerId).toBe('p2');
  });

  it('salvei cue fires only in stack mode, when the next player holds only a +2', () => {
    const lobby = makeLobby(false); lobby.options.stackPenalty = true; startGame(lobby);
    const g = rig(lobby, {
      p1: [card('d', 'red', 'draw2'), card('x', 'red', 'number', 3)],
      p2: [card('only', 'blue', 'draw2')]
    }, card('t', 'red', 'number', 9), 'p1');
    expect(playCard(lobby, 'p1', 'd').ok).toBe(true);
    expect(g.status).toBe('penalty');
    expect(g.soundCue?.name).toBe('salvei');
    expect(buildClientLobby(lobby, 'p2').game!.soundCue?.name).toBe('salvei');

    // Two cards (even with a +2 among them) means he cannot win outright: no cue.
    rig(lobby, {
      p1: [card('d', 'red', 'draw2'), card('x', 'red', 'number', 3)],
      p2: [card('only', 'blue', 'draw2'), card('extra', 'blue', 'number', 2)]
    }, card('t', 'red', 'number', 9), 'p1');
    g.soundCue = undefined;
    expect(playCard(lobby, 'p1', 'd').ok).toBe(true);
    expect(g.soundCue).toBeUndefined();
  });

  it('salvei does not fire with stacking off, and fires mid-chain before the winning stack', () => {
    const off = makeLobby(false); startGame(off);
    const gOff = rig(off, {
      p1: [card('d', 'red', 'draw2'), card('x', 'red', 'number', 3)],
      p2: [card('only', 'blue', 'draw2')]
    }, card('t', 'red', 'number', 9), 'p1');
    expect(playCard(off, 'p1', 'd').ok).toBe(true);
    expect(gOff.soundCue).toBeUndefined();

    const lobby = makeLobby(false);
    lobby.players.push({ id: 'p3', name: 'P3', leader: false, ready: true });
    lobby.options.stackPenalty = true; startGame(lobby);
    const g = rig(lobby, {
      p1: [card('d', 'red', 'draw2'), card('x', 'red', 'number', 3)],
      p2: [card('s', 'blue', 'draw2'), card('extra', 'blue', 'number', 2)],
      p3: [card('only', 'green', 'draw2')]
    }, card('t', 'red', 'number', 9), 'p1');
    expect(playCard(lobby, 'p1', 'd').ok).toBe(true);
    expect(g.soundCue).toBeUndefined(); // p2 holds two cards
    expect(playCard(lobby, 'p2', 's').ok).toBe(true); // stacks onto p3, who holds only a +2
    expect(g.soundCue?.name).toBe('salvei');
    expect(playCard(lobby, 'p3', 'only').ok).toBe(true); // stacks his last card and wins
    expect(g.handWinnerId).toBe('p3');
  });
});
