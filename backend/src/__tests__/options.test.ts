import Lobby from '../interfaces/Lobby';
import { createDeck, deckSize, defaultDeckConfig, validateDeckConfig } from '../functions/deck';
import { startGame, buildClientLobby } from '../events/game/functions/engine';
import { handleResetOptions, handleUpdateOptions } from '../events/lobby/handlers/botsAndStart';
import EventsEmitter from '../events/Emitter';
import { lobbys } from '../global';

function makeLobby(options?: Partial<Lobby['options']>): Lobby {
  return {
    lobbyId: 'L-opt', code: 'OPT123',
    players: [{ id: 'p1', name: 'P1', leader: true, ready: true }, { id: 'p2', name: 'P2', leader: false, ready: true }],
    options: { targetScore: 500, handSize: 7, turnTimeSeconds: 30, deck: defaultDeckConfig(), stackPenalty: false, drawUntilPlayable: false, swapOnSeven: false, ...options }
  };
}
function fakePlayer(lobby: Lobby, emitted: { event: string; args: any[] }[], playerId = 'p1') {
  lobbys[lobby.lobbyId] = lobby;
  const socket = { id: 's-' + playerId, emit: (event: string, ...args: any[]) => { emitted.push({ event, args }); } } as any;
  const io = { to: () => ({ emit: (event: string, ...args: any[]) => { emitted.push({ event, args }); } }) } as any;
  return { playerId, socket, io, lobby, eventsEmitter: new EventsEmitter(io, socket, lobby.lobbyId) } as any;
}

describe('turn time option', () => {
  it('uses the configured seconds for the deadline and client view', () => {
    const lobby = makeLobby({ turnTimeSeconds: 10 });
    startGame(lobby);
    const g = lobby.game!;
    expect(g.turnEndsAt! - Date.now()).toBeGreaterThan(0);
    expect(g.turnEndsAt! - Date.now()).toBeLessThanOrEqual(10_000);
    const view = buildClientLobby(lobby, 'p1');
    expect(view.game!.turnTimeLimitMs).toBe(10_000);
    expect(view.game!.turnTimeSeconds).toBe(10);
  });

  it('0 disables the turn timer', () => {
    const lobby = makeLobby({ turnTimeSeconds: 0 });
    startGame(lobby);
    expect(lobby.game!.turnEndsAt).toBeUndefined();
    expect(buildClientLobby(lobby, 'p1').game!.turnTimeLimitMs).toBe(0);
  });
});

describe('custom deck', () => {
  it('builds the classic 108-card deck by default', () => {
    expect(createDeck().length).toBe(108);
    expect(deckSize(defaultDeckConfig())).toBe(108);
  });

  it('adds a custom colour and respects numbers and special counts', () => {
    const cfg = defaultDeckConfig();
    cfg.colors.forEach(c => { c.skip = 0; c.reverse = 0; c.draw2 = 0; });
    cfg.colors.push({ id: 'purple', name: 'Purple', hex: '#7c3aed', numbers: [{ value: 5, copies: 1 }], skip: 3, reverse: 0, draw2: 0, draw1: 0, skipall: 0, reversedraw: 0, swapcard: 0, peek: 0, gift: 0, shield: 0, discardcolor: 0, lock: 0 });
    cfg.wildCount = 0;
    const deck = createDeck(cfg);
    expect(deck.filter(c => c.color === 'purple' && c.kind === 'number')).toEqual([expect.objectContaining({ kind: 'number', value: 5 })]);
    expect(deck.filter(c => c.color === 'purple' && c.kind === 'skip').length).toBe(3);
    expect(deck.filter(c => c.color === 'red' && c.kind === 'skip').length).toBe(0);
    expect(deck.some(c => c.kind === 'wild')).toBe(false);
    expect(deck.length).toBe(deckSize(cfg));

    const lobby = makeLobby({ deck: cfg });
    startGame(lobby);
    const view = buildClientLobby(lobby, 'p1');
    expect(view.game!.colors.map(c => c.id)).toContain('purple');
    expect(view.game!.drawPileCount).toBe(deckSize(cfg) - 14 - 1);
  });

  it('validates deck configs', () => {
    expect(validateDeckConfig(defaultDeckConfig())?.colors.length).toBe(4);
    const badHex = defaultDeckConfig(); badHex.colors[0].hex = 'red';
    expect(validateDeckConfig(badHex)).toBeNull();
    const oneColor = defaultDeckConfig(); oneColor.colors = oneColor.colors.slice(0, 1);
    expect(validateDeckConfig(oneColor)).toBeNull();
    const badCopies = defaultDeckConfig(); badCopies.colors[0].numbers = [{ value: 1, copies: 100 }];
    expect(validateDeckConfig(badCopies)).toBeNull();
    const manyCopies = defaultDeckConfig(); manyCopies.colors[0].numbers = [{ value: 1, copies: 99 }];
    expect(validateDeckConfig(manyCopies)).not.toBeNull();
    expect(createDeck(manyCopies).filter(c => c.color === 'red' && c.kind === 'number' && c.value === 1).length).toBe(99);
    const tiny = defaultDeckConfig(); tiny.colors.forEach(c => { c.numbers = [{ value: 1, copies: 1 }]; c.skip = 0; c.reverse = 0; c.draw2 = 0; }); tiny.wildCount = 0; tiny.wild4Count = 0;
    expect(validateDeckConfig(tiny)).toBeNull(); // only 4 cards
  });
});

describe('update options handler', () => {
  it('leader can set turn time and deck; invalid values are rejected', () => {
    const lobby = makeLobby();
    const emitted: { event: string; args: any[] }[] = [];
    handleUpdateOptions(fakePlayer(lobby, emitted), { turnTimeSeconds: 15 });
    expect(lobby.options.turnTimeSeconds).toBe(15);
    expect(emitted.some(e => e.event === 'options-update')).toBe(true);

    handleUpdateOptions(fakePlayer(lobby, emitted), { turnTimeSeconds: 12 });
    expect(lobby.options.turnTimeSeconds).toBe(15);
    expect(emitted.some(e => e.event === 'options-error')).toBe(true);

    const cfg = defaultDeckConfig(); cfg.wildCount = 2;
    handleUpdateOptions(fakePlayer(lobby, emitted), { deck: cfg });
    expect(lobby.options.deck.wildCount).toBe(2);

    const notLeader: { event: string; args: any[] }[] = [];
    handleUpdateOptions(fakePlayer(lobby, notLeader, 'p2'), { turnTimeSeconds: 60 });
    expect(lobby.options.turnTimeSeconds).toBe(15);
  });

  it('leader can reset all options to the defaults; non-leaders cannot', () => {
    const customDeck = defaultDeckConfig();
    customDeck.colors = customDeck.colors.slice(0, 2);
    customDeck.colors[0].name = 'Crimson';
    const lobby = makeLobby({ targetScore: 100, turnTimeSeconds: 60, deck: customDeck, stackPenalty: true, drawUntilPlayable: true, swapOnSeven: true });
    const emitted: { event: string; args: any[] }[] = [];

    handleResetOptions(fakePlayer(lobby, emitted, 'p2'));
    expect(lobby.options.targetScore).toBe(100);
    expect(emitted.some(e => e.event === 'options-error')).toBe(true);

    handleResetOptions(fakePlayer(lobby, emitted));
    expect(lobby.options.targetScore).toBe(500);
    expect(lobby.options.turnTimeSeconds).toBe(30);
    expect(lobby.options.handSize).toBe(7);
    expect(lobby.options.stackPenalty).toBe(false);
    expect(lobby.options.drawUntilPlayable).toBe(false);
    expect(lobby.options.swapOnSeven).toBe(false);
    expect(lobby.options.deck).toEqual(defaultDeckConfig());
    expect(deckSize(lobby.options.deck)).toBe(108);
    expect(emitted.some(e => e.event === 'options-update')).toBe(true);

    lobby.options.deck.colors[0].skip = 99;
    handleResetOptions(fakePlayer(lobby, emitted));
    expect(lobby.options.deck.colors[0].skip).toBe(2);
  });
});
