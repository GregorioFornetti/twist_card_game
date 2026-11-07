import { lobbys, lobbyByCode, players } from '../global';
import Lobby from '../interfaces/Lobby';
import { createPlayer } from '../events/functions/createPlayer';
import { handleLogout } from '../events/general/handlers/general';
import { handleCreateLobby } from '../events/lobby/handlers/createLobby';
import { DEFAULT_GAME_OPTIONS } from '../global';

function fakeSocket(id: string, emitted: { event: string; args: any[] }[]) {
  return { id, emit: (event: string, ...args: any[]) => { emitted.push({ event, args }); } } as any;
}
const fakeIo = { to: () => ({ emit: () => {} }) } as any;

describe('leave then create again', () => {
  it('keeps the player registered after logout so a new lobby can be created', () => {
    const emitted: { event: string; args: any[] }[] = [];
    const socket = fakeSocket('s1', emitted);
    const lobby: Lobby = {
      lobbyId: 'L-old', code: 'OLD123',
      players: [{ id: 'p1', name: 'Alice', leader: true, ready: false }],
      options: { ...DEFAULT_GAME_OPTIONS, deck: JSON.parse(JSON.stringify(DEFAULT_GAME_OPTIONS.deck)) }
    };
    lobbys[lobby.lobbyId] = lobby; lobbyByCode[lobby.code] = lobby;
    players['p1'] = { socket, lobby };

    handleLogout(createPlayer(fakeIo, 'p1'));
    expect(emitted.some(e => e.event === 'lobby-left')).toBe(true);
    // The bug: logout deleted players['p1'], so createPlayer threw and the
    // client sat on the loading "..." forever.
    expect(players['p1']).toBeDefined();
    expect(players['p1'].lobby).toBeUndefined();
    expect(lobbyByCode['OLD123']).toBeUndefined();

    handleCreateLobby(createPlayer(fakeIo, 'p1'), 'Alice');
    const success = emitted.find(e => e.event === 'join-lobby-success');
    expect(success).toBeDefined();
    expect(success!.args[0].code).toMatch(/^[A-Z0-9]{6}$/);
    expect(success!.args[0].code).not.toBe('OLD123');
    expect(players['p1'].lobby?.code).toBe(success!.args[0].code);
  });
});
