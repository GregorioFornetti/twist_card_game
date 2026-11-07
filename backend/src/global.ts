import { Socket } from 'socket.io';
import Lobby, { GameOptions } from './interfaces/Lobby';
import { defaultDeckConfig } from './functions/deck';

export const lobbys: { [lobbyId: string]: Lobby } = {};
export const lobbyByCode: { [code: string]: Lobby } = {};
export const players: { [playerId: string]: { socket: Socket; lobby?: Lobby; offlineSince?: number } } = {};

export const MAX_LOBBY_PLAYERS = 10;
export const MIN_LOBBY_PLAYERS = 2;
export const OFFLINE_LIMIT_MS = 10 * 60 * 1000;
export const APPEARANCE_EMOTES = ['🦊', '🐼', '🦁', '🐸', '🦉', '🐙', '🦄', '🐯', '🦋', '🐳'];
export const APPEARANCE_COLORS = ['#e63946', '#f4a261', '#2a9d8f', '#4361ee', '#9b5de5', '#ef476f', '#06d6a0', '#118ab2', '#e9c46a', '#b08968'];
/** Selectable turn times in seconds; 0 means no turn timer. */
export const TURN_TIME_SECONDS_OPTIONS = [0, 10, 15, 20, 30, 45, 60];
export const DEFAULT_GAME_OPTIONS: GameOptions = { targetScore: 500, handSize: 7, turnTimeSeconds: 30, deck: defaultDeckConfig(), stackPenalty: false, drawUntilPlayable: false, swapOnSeven: false };
