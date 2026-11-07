/** A suit colour id: 'red' | 'yellow' | 'green' | 'blue' by default, or a custom id from the deck config. */
export type CardColor = string;
export type CardKind = 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4'
  | 'draw1' | 'skipall' | 'reversedraw' | 'wild2' | 'swapcard' | 'peek' | 'gift' | 'shield' | 'discardcolor' | 'copycat' | 'bomb' | 'shuffle' | 'lock';
/** Colourless kinds that are always playable like a Wild. */
export const WILD_KINDS: CardKind[] = ['wild', 'wild4', 'wild2', 'copycat', 'bomb', 'shuffle'];

export interface DeckNumber { value: number; copies: number }
export interface DeckColor {
  id: string; name: string; hex: string; numbers: DeckNumber[];
  /** How many of each special card this colour has. */
  skip: number; reverse: number; draw2: number;
  draw1: number; skipall: number; reversedraw: number; swapcard: number; peek: number; gift: number; shield: number; discardcolor: number; lock: number;
}
export interface DeckConfig {
  colors: DeckColor[];
  wildCount: number; wild4Count: number;
  wild2Count: number; copycatCount: number; bombCount: number; shuffleCount: number;
}

export interface Card {
  id: string;
  color: CardColor | 'wild';
  kind: CardKind;
  /** Face value for number cards, otherwise undefined. */
  value?: number;
}

export interface GamePlayerState {
  hand: Card[];
  score: number;
  /** Set when the player has just drawn and may only play the drawn card or pass. */
  drawnCardId?: string;
}

export interface PendingDrawFour {
  offenderId: string;
  victimId: string;
  /** True if the offender held a card of the previous colour (illegal Wild Draw Four). */
  hadMatchingColor: boolean;
  chosenColor: CardColor;
}

export interface PendingPenalty {
  amount: number;
  victimId: string;
}

export interface Game {
  playersState: { [playerId: string]: GamePlayerState };
  /** Active players in turn order for the current hand (spectators join at the next hand). */
  playerOrder: string[];
  drawPile: Card[];
  discardPile: Card[];
  currentColor: CardColor;
  currentPlayerId: string;
  direction: 1 | -1;
  dealerId: string;
  handNumber: number;
  status: 'playing' | 'challenging' | 'penalty' | 'swapping' | 'swapcard' | 'gift' | 'peeking' | 'hand-over' | 'game-over';
  pendingDrawFour?: PendingDrawFour;
  pendingPenalty?: PendingPenalty;
  pendingSwap?: { chooserId: string };
  pendingSwapCard?: { chooserId: string; targetId?: string };
  pendingGift?: { chooserId: string; targetId?: string };
  pendingPeek?: { chooserId: string };
  peekedBy: { [playerId: string]: string[] };
  lockedColor?: CardColor;
  lockedBy?: string;
  lastAction: string;
  handWinnerId?: string;
  handPoints?: number;
  winnerId?: string;
  log: string[];
  /** Epoch ms when the current player must act by (turn timer). */
  turnEndsAt?: number;
}

export interface LobbyPlayer {
  id: string;
  name: string;
  leader: boolean;
  bot?: boolean;
  ready?: boolean;
  /** Watching a game in progress; becomes a player at the next hand. */
  spectator?: boolean;
  emote?: string;
  color?: string;
}

export interface GameOptions {
  targetScore: number;
  handSize: number;
  /** Seconds each player has to act on a turn; 0 means no turn timer. */
  turnTimeSeconds: number;
  deck: DeckConfig;
  /** Stack Draw Two / Wild Draw Four penalties onto the next player instead of drawing. */
  stackPenalty: boolean;
  /** Keep drawing until you draw a playable card, instead of drawing one. */
  drawUntilPlayable: boolean;
  /** Playing a 7 lets you swap hands with another player. */
  swapOnSeven: boolean;
}

interface Lobby {
  lobbyId: string;
  code: string;
  players: LobbyPlayer[];
  game?: Game;
  gameRanking?: string[];
  options: GameOptions;
}
export default Lobby;

/** Personalised view sent to one client (own hand visible, others only counts). */
export interface ClientGame {
  currentColor: CardColor;
  currentPlayerId: string;
  direction: 1 | -1;
  dealerId: string;
  handNumber: number;
  status: Game['status'];
  topCard?: Card;
  discardCount: number;
  drawPileCount: number;
  currentPlayerCards: Card[];
  drawnCardId?: string;
  players: { [playerId: string]: { numCards: number; score: number } };
  pendingDrawFour?: { offenderId: string; victimId: string; chosenColor: CardColor };
  pendingPenalty?: PendingPenalty;
  pendingSwap?: { chooserId: string };
  pendingSwapCard?: { chooserId: string; targetId?: string };
  pendingGift?: { chooserId: string; targetId?: string };
  pendingPeek?: { chooserId: string };
  revealedHands: { [playerId: string]: Card[] };
  lockedColor?: CardColor;
  lockedBy?: string;
  lastAction: string;
  handWinnerId?: string;
  handPoints?: number;
  winnerId?: string;
  log: string[];
  targetScore: number;
  turnEndsAt?: number;
  turnTimeLimitMs: number;
  turnTimeSeconds: number;
  colors: DeckColor[];
}

export interface ClientLobby {
  lobbyId: string;
  code: string;
  players: LobbyPlayer[];
  options: GameOptions;
  game?: ClientGame;
  gameRanking?: string[];
}
