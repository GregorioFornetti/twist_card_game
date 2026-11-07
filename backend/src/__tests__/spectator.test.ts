import Lobby, { Card } from '../interfaces/Lobby';
import { startGame, startHand, playCard, removePlayerFromGame, buildClientLobby } from '../events/game/functions/engine';
import { defaultDeckConfig } from '../functions/deck';
import { handleRematchGameRequest } from '../events/lobby/handlers/botsAndStart';
import EventsEmitter from '../events/Emitter';
import { lobbys } from '../global';

function makeLobby(n = 3): Lobby {
  return {
    lobbyId: 'L-spec', code: 'SPEC12',
    players: Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}`, leader: i === 0, ready: true })),
    options: { targetScore: 500, handSize: 7, turnTimeSeconds: 30, deck: defaultDeckConfig(), stackPenalty: false, drawUntilPlayable: false, swapOnSeven: false }
  };
}
const card = (id: string, color: Card['color'], kind: Card['kind'], value?: number): Card => ({ id, color, kind, value });

describe('spectators', () => {
  it('watch without cards, then join from the next hand', () => {
    const lobby = makeLobby(2);
    startGame(lobby);
    lobby.players.push({ id: 'p3', name: 'P3', leader: false, ready: true, spectator: true });
    const view = buildClientLobby(lobby, 'p3');
    expect(view.game!.currentPlayerCards).toEqual([]);
    expect(view.game!.players.p3.numCards).toBe(0);
    // The current hand is undisturbed.
    expect(lobby.game!.playerOrder).toEqual(['p1', 'p2']);
    startHand(lobby);
    expect(lobby.players.find(p => p.id === 'p3')?.spectator).toBe(false);
    expect(lobby.game!.playerOrder).toContain('p3');
    expect(lobby.game!.playersState.p3.hand.length).toBe(7);
  });
});

describe('leaving mid-game', () => {
  it('removes the leaver and advances the turn when they were current', () => {
    const lobby = makeLobby(3);
    const g = startGame(lobby);
    g.playersState.p1.hand = [card('a', 'red', 'number', 1), card('x', 'red', 'number', 2)];
    g.playersState.p2.hand = [card('b', 'red', 'number', 3)];
    g.playersState.p3.hand = [card('c', 'red', 'number', 4)];
    g.discardPile = [card('t', 'red', 'number', 9)]; g.currentColor = 'red'; g.currentPlayerId = 'p1'; g.status = 'playing';
    expect(removePlayerFromGame(lobby, 'p1')).toBe(true);
    expect(g.playerOrder).toEqual(['p2', 'p3']);
    expect(g.playersState.p1).toBeUndefined();
    expect(g.currentPlayerId).toBe('p2');
    expect(g.log.some(l => l.includes('P1 left the game'))).toBe(true);
  });

  it('last remaining player wins the hand', () => {
    const lobby = makeLobby(2);
    const g = startGame(lobby);
    g.playersState.p1.hand = [card('a', 'red', 'number', 9)];
    g.playersState.p2.hand = [card('s', 'blue', 'skip'), card('n', 'blue', 'number', 3)];
    g.discardPile = [card('t', 'red', 'number', 9)]; g.currentPlayerId = 'p1'; g.status = 'playing';
    removePlayerFromGame(lobby, 'p1');
    expect(g.status).toBe('hand-over');
    expect(g.handWinnerId).toBe('p2');
    expect(g.playersState.p2.score).toBe(9); // the leaver's remaining card
  });
});

describe('one-click rematch', () => {
  it('leader restarts a finished game with fresh scores', () => {
    const lobby = makeLobby(2);
    lobbys[lobby.lobbyId] = lobby;
    const g = startGame(lobby);
    g.status = 'game-over'; g.winnerId = 'p1'; lobby.gameRanking = ['p1', 'p2'];
    g.playersState.p1.score = 500;
    const emitted: { event: string; args: any[] }[] = [];
    const socket = { id: 's1', emit: (event: string, ...args: any[]) => { emitted.push({ event, args }); } } as any;
    const io = { to: () => ({ emit: (event: string, ...args: any[]) => { emitted.push({ event, args }); } }) } as any;
    const player = { playerId: 'p1', socket, io, lobby, eventsEmitter: new EventsEmitter(io, socket, lobby.lobbyId) } as any;
    handleRematchGameRequest(player);
    expect(lobby.gameRanking).toBeUndefined();
    expect(lobby.game!.status).toBe('playing');
    expect(lobby.game!.handNumber).toBe(1);
    expect(lobby.game!.playersState.p1.score).toBe(0);
    // Non-leader cannot rematch.
    lobby.game!.status = 'game-over';
    const player2 = { ...player, playerId: 'p2' };
    handleRematchGameRequest(player2);
    expect(lobby.game!.status).toBe('game-over');
  });
});
