import type { Socket } from 'socket.io-client';
import EventsListenersAdderBase from '../EventsListenersAdderBase';
import type { GameOptions, Lobby } from '@/interfaces/Lobby';
import { lobby } from '@/connection';

export class LobbyEventsHandlersAdder extends EventsListenersAdderBase {
  joinLobbySuccess(handler: (lobby: Lobby) => void) { this.socket.on('join-lobby-success', handler); }
  joinLobbyError(handler: (type: string) => void) { this.socket.on('join-lobby-error', handler); }
  startGameError(handler: (type: string) => void) { this.socket.on('start-game-error', handler); }
}

export default function addDefaultLobbyEventsHandlers(socket: Socket) {
  socket.on('join-lobby-success', (l: Lobby) => { lobby.value = l; });
  socket.on('reconnect', (l: Lobby) => { lobby.value = l; });
  socket.on('game-state', (l: Lobby) => { lobby.value = l; });
  socket.on('start-game', (l: Lobby) => { lobby.value = l; });
  socket.on('player-join', (id: string, name: string, emote?: string, color?: string) => {
    if (lobby.value && !lobby.value.players.find(p => p.id === id)) lobby.value.players.push({ id, name, leader: false, ready: false, emote, color });
  });
  socket.on('player-ready', (id: string) => { const p = lobby.value?.players.find(p => p.id === id); if (p) p.ready = true; });
  socket.on('player-unready', (id: string) => { const p = lobby.value?.players.find(p => p.id === id); if (p) p.ready = false; });
  socket.on('options-update', (options: GameOptions) => { if (lobby.value) lobby.value.options = options; });
  socket.on('bot-added', (bot: Lobby['players'][number]) => { if (lobby.value && !lobby.value.players.find(p => p.id === bot.id)) lobby.value.players.push(bot); });
  socket.on('bot-removed', (botId: string) => { if (lobby.value) lobby.value.players = lobby.value.players.filter(p => p.id !== botId); });
  socket.on('player-logout', (id: string, newLeaderId?: string) => {
    if (!lobby.value) return;
    lobby.value.players = lobby.value.players.filter(p => p.id !== id);
    if (newLeaderId) { const p = lobby.value.players.find(p => p.id === newLeaderId); if (p) { p.leader = true; p.ready = false; } }
  });
  socket.on('lobby-left', () => { lobby.value = null; });
  socket.on('rematch', () => {
    if (!lobby.value) return;
    lobby.value.game = undefined; lobby.value.gameRanking = undefined;
    for (const p of lobby.value.players) if (!p.bot) p.ready = false;
  });
}
