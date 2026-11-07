export type CardColor = string;
export type CardKind = 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4'
  | 'draw1' | 'skipall' | 'reversedraw' | 'wild2' | 'swapcard' | 'peek' | 'gift' | 'shield' | 'discardcolor' | 'copycat' | 'bomb' | 'shuffle' | 'lock';
export interface Card { id: string; color: CardColor | 'wild'; kind: CardKind; value?: number }
export interface LobbyPlayer { id: string; name: string; leader: boolean; bot?: boolean; ready?: boolean; spectator?: boolean; emote?: string; color?: string }
export interface DeckNumber { value: number; copies: number }
export interface DeckColor {
  id: string; name: string; hex: string; numbers: DeckNumber[];
  skip: number; reverse: number; draw2: number;
  draw1: number; skipall: number; reversedraw: number; swapcard: number; peek: number; gift: number; shield: number; discardcolor: number; lock: number;
}
export interface DeckConfig {
  colors: DeckColor[];
  wildCount: number; wild4Count: number;
  wild2Count: number; copycatCount: number; bombCount: number; shuffleCount: number;
}
export interface GameOptions { targetScore: number; handSize: number; turnTimeSeconds: number; deck: DeckConfig; stackPenalty: boolean; drawUntilPlayable: boolean; swapOnSeven: boolean }
export interface ClientGame {
  currentColor: CardColor; currentPlayerId: string; direction: 1 | -1; dealerId: string;
  handNumber: number; status: 'playing' | 'challenging' | 'penalty' | 'swapping' | 'swapcard' | 'gift' | 'peeking' | 'hand-over' | 'game-over';
  topCard?: Card; discardCount: number; drawPileCount: number;
  currentPlayerCards: Card[]; drawnCardId?: string;
  players: { [playerId: string]: { numCards: number; score: number } };
  pendingDrawFour?: { offenderId: string; victimId: string; chosenColor: CardColor };
  pendingPenalty?: { amount: number; victimId: string };
  pendingSwap?: { chooserId: string };
  pendingSwapCard?: { chooserId: string; targetId?: string };
  pendingGift?: { chooserId: string; targetId?: string };
  pendingPeek?: { chooserId: string };
  revealedHands: { [playerId: string]: Card[] };
  lockedColor?: CardColor;
  lockedBy?: string;
  lastAction: string; handWinnerId?: string; handPoints?: number; winnerId?: string; log: string[]; targetScore: number;
  turnEndsAt?: number; turnTimeLimitMs: number; turnTimeSeconds: number; colors: DeckColor[];
}
export interface Lobby {
  lobbyId: string; code: string; players: LobbyPlayer[]; options: GameOptions;
  game?: ClientGame; gameRanking?: string[];
}
