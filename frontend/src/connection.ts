import { io } from 'socket.io-client';
import { ref } from 'vue';
import EventsEmitter from './events/EventsEmitter';
import EventsListenersAdder from './events/EventsListenersAdder';
import type { Lobby } from './interfaces/Lobby';
import addDefaultEventsListeners from './events/addDefaultEventsListeners';

const PLAYER_ID_STORAGE_KEY = 'twist-player-id';
const createPlayerId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `player-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};
const getOrCreatePlayerId = (): string => {
  if (typeof window === 'undefined') return createPlayerId();
  try {
    const stored = window.localStorage.getItem(PLAYER_ID_STORAGE_KEY);
    if (stored) return stored;
    const id = createPlayerId();
    window.localStorage.setItem(PLAYER_ID_STORAGE_KEY, id);
    return id;
  } catch { return createPlayerId(); }
};
const playerId = getOrCreatePlayerId();
const rootUrl: string = import.meta.env.DEV ? 'localhost:3000' : window.location.host;
const socket = io(rootUrl, { autoConnect: false, auth: { playerId }, path: `${import.meta.env.VITE_SERVER_PATH || ''}/socket.io/` });
socket.connect();
const eventsEmitter = new EventsEmitter(socket);
const eventsListenersAdder = new EventsListenersAdder(socket);
const lobby = ref<Lobby | null>(null);
addDefaultEventsListeners(socket);
export { socket, eventsEmitter, eventsListenersAdder, lobby, playerId };
