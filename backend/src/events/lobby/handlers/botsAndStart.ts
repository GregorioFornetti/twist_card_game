import { randomUUID } from 'node:crypto';
import Player from '../../../interfaces/Player';
import { DEFAULT_GAME_OPTIONS, MAX_LOBBY_PLAYERS, MIN_LOBBY_PLAYERS, TURN_TIME_SECONDS_OPTIONS } from '../../../global';
import { assignFreeAppearance } from '../functions/appearance';
import { createDeck, defaultDeckConfig, validateDeckConfig } from '../../../functions/deck';
import { startGame } from '../../game/functions/engine';
import { afterChange, emitAll } from '../../game/functions/broadcast';

const BOT_NAMES = ['Nova', 'Pixel', 'Comet', 'Echo', 'Orbit', 'Quasar', 'Vega', 'Ziggy', 'Mango'];
export function handleAddBot(player: Player) {
  if (!player.lobby) { player.eventsEmitter.Lobby.emitBotError('not-in-lobby'); return; }
  const me = player.lobby.players.find(p => p.id === player.playerId);
  if (!me?.leader) { player.eventsEmitter.Lobby.emitBotError('not-leader'); return; }
  if (player.lobby.game) { player.eventsEmitter.Lobby.emitBotError('already-in-game'); return; }
  if (player.lobby.players.length >= MAX_LOBBY_PLAYERS) { player.eventsEmitter.Lobby.emitBotError('lobby-full'); return; }
  const used = new Set(player.lobby.players.map(p => p.name));
  const name = BOT_NAMES.find(n => !used.has(n)) ?? `Bot ${player.lobby.players.length}`;
  const bot = { id: `bot-${randomUUID()}`, name, leader: false, bot: true, ready: true, emote: undefined as string | undefined, color: undefined as string | undefined };
  assignFreeAppearance(player.lobby, bot);
  player.lobby.players.push(bot);
  player.eventsEmitter.Lobby.emitBotAdded(bot);
}
export function handleRemoveBot(player: Player, botId: string) {
  if (!player.lobby) { player.eventsEmitter.Lobby.emitBotError('not-in-lobby'); return; }
  const me = player.lobby.players.find(p => p.id === player.playerId);
  if (!me?.leader) { player.eventsEmitter.Lobby.emitBotError('not-leader'); return; }
  if (player.lobby.game) { player.eventsEmitter.Lobby.emitBotError('already-in-game'); return; }
  const idx = player.lobby.players.findIndex(p => p.id === botId && p.bot);
  if (idx < 0) { player.eventsEmitter.Lobby.emitBotError('bot-not-found'); return; }
  player.lobby.players.splice(idx, 1);
  player.eventsEmitter.Lobby.emitBotRemoved(botId);
}
export function handleStartGameRequest(player: Player) {
  if (!player.lobby) { player.eventsEmitter.Lobby.emitStartGameError('not-in-lobby'); return; }
  const me = player.lobby.players.find(p => p.id === player.playerId);
  if (!me?.leader) { player.eventsEmitter.Lobby.emitStartGameError('not-leader'); return; }
  if (player.lobby.game) { player.eventsEmitter.Lobby.emitStartGameError('already-in-game'); return; }
  if (player.lobby.players.length < MIN_LOBBY_PLAYERS) { player.eventsEmitter.Lobby.emitStartGameError('not-enough-players'); return; }
  if (!player.lobby.players.every(p => p.leader || p.bot || p.ready)) { player.eventsEmitter.Lobby.emitStartGameError('not-all-ready'); return; }
  if (createDeck(player.lobby.options.deck).length < player.lobby.players.length * player.lobby.options.handSize + 1) { player.eventsEmitter.Lobby.emitStartGameError('deck-too-small'); return; }
  lobby_gameRankingReset(player.lobby);
  startGame(player.lobby);
  afterChange(player.io, player.lobby);
}
function lobby_gameRankingReset(lobby: import('../../../interfaces/Lobby').default) { lobby.gameRanking = undefined; }
export function handleRematchGameRequest(player: Player) {
  if (!player.lobby) { player.eventsEmitter.Lobby.emitRematchError('not-in-lobby'); return; }
  const me = player.lobby.players.find(p => p.id === player.playerId);
  if (!me?.leader) { player.eventsEmitter.Lobby.emitRematchError('not-leader'); return; }
  if (!player.lobby.game || player.lobby.game.status !== 'game-over') { player.eventsEmitter.Lobby.emitRematchError('already-in-game'); return; }
  if (player.lobby.players.length < MIN_LOBBY_PLAYERS) { player.eventsEmitter.Lobby.emitRematchError('not-enough-players'); return; }
  if (createDeck(player.lobby.options.deck).length < player.lobby.players.length * player.lobby.options.handSize + 1) { player.eventsEmitter.Lobby.emitRematchError('already-in-game'); return; }
  lobby_gameRankingReset(player.lobby);
  startGame(player.lobby);
  afterChange(player.io, player.lobby);
}
export function handleRematchRequest(player: Player) {
  if (!player.lobby) { player.eventsEmitter.Lobby.emitRematchError('not-in-lobby'); return; }
  const me = player.lobby.players.find(p => p.id === player.playerId);
  if (!me?.leader) { player.eventsEmitter.Lobby.emitRematchError('not-leader'); return; }
  if (player.lobby.game && player.lobby.game.status !== 'game-over') { player.eventsEmitter.Lobby.emitRematchError('already-in-game'); return; }
  player.lobby.game = undefined; player.lobby.gameRanking = undefined;
  for (const p of player.lobby.players) if (!p.bot) p.ready = false;
  player.eventsEmitter.Lobby.emitRematch();
}
export function handleResetOptions(player: Player) {
  if (!player.lobby) { player.eventsEmitter.Lobby.emitOptionsError('not-in-lobby'); return; }
  const me = player.lobby.players.find(p => p.id === player.playerId);
  if (!me?.leader) { player.eventsEmitter.Lobby.emitOptionsError('not-leader'); return; }
  if (player.lobby.game) { player.eventsEmitter.Lobby.emitOptionsError('already-in-game'); return; }
  player.lobby.options = { ...DEFAULT_GAME_OPTIONS, deck: defaultDeckConfig() };
  player.eventsEmitter.Lobby.emitOptionsUpdate(player.lobby.options);
}
export function handleUpdateOptions(player: Player, options: { targetScore?: number; turnTimeSeconds?: number; deck?: unknown; stackPenalty?: boolean; drawUntilPlayable?: boolean; swapOnSeven?: boolean }) {
  if (!player.lobby) { player.eventsEmitter.Lobby.emitOptionsError('not-in-lobby'); return; }
  const me = player.lobby.players.find(p => p.id === player.playerId);
  if (!me?.leader) { player.eventsEmitter.Lobby.emitOptionsError('not-leader'); return; }
  if (player.lobby.game) { player.eventsEmitter.Lobby.emitOptionsError('already-in-game'); return; }
  const hasTarget = options?.targetScore !== undefined;
  const hasTurnTime = options?.turnTimeSeconds !== undefined;
  const hasDeck = options?.deck !== undefined;
  const ruleKeys = ['stackPenalty', 'drawUntilPlayable', 'swapOnSeven'] as const;
  const hasRules = ruleKeys.some(k => options?.[k] !== undefined);
  if (!hasTarget && !hasTurnTime && !hasDeck && !hasRules) { player.eventsEmitter.Lobby.emitOptionsError('invalid-options'); return; }
  if (hasTarget && ![100, 200, 300, 500].includes(Number(options.targetScore))) { player.eventsEmitter.Lobby.emitOptionsError('invalid-options'); return; }
  if (hasTurnTime && !TURN_TIME_SECONDS_OPTIONS.includes(Number(options.turnTimeSeconds))) { player.eventsEmitter.Lobby.emitOptionsError('invalid-options'); return; }
  if (ruleKeys.some(k => options?.[k] !== undefined && typeof options[k] !== 'boolean')) { player.eventsEmitter.Lobby.emitOptionsError('invalid-options'); return; }
  const deck = hasDeck ? validateDeckConfig(options.deck) : null;
  if (hasDeck && !deck) { player.eventsEmitter.Lobby.emitOptionsError('invalid-options'); return; }
  if (hasTarget) player.lobby.options.targetScore = Number(options.targetScore);
  if (hasTurnTime) player.lobby.options.turnTimeSeconds = Number(options.turnTimeSeconds);
  if (deck) player.lobby.options.deck = deck;
  for (const k of ruleKeys) if (options?.[k] !== undefined) player.lobby.options[k] = options[k] as boolean;
  player.eventsEmitter.Lobby.emitOptionsUpdate(player.lobby.options);
}
