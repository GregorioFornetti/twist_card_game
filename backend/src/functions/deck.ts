import { Card, CardColor, DeckColor, DeckConfig, WILD_KINDS } from '../interfaces/Lobby';

export const COLORS: CardColor[] = ['red', 'yellow', 'green', 'blue'];
const CLASSIC_HEX: Record<string, string> = { red: '#dc2626', yellow: '#facc15', green: '#16a34a', blue: '#2563eb' };
const CLASSIC_NAME: Record<string, string> = { red: 'Red', yellow: 'Yellow', green: 'Green', blue: 'Blue' };
const classicNumbers = () => [{ value: 0, copies: 1 }, ...Array.from({ length: 9 }, (_, i) => ({ value: i + 1, copies: 2 }))];

export const COLORED_SPECIALS = ['skip', 'reverse', 'draw2', 'draw1', 'skipall', 'reversedraw', 'swapcard', 'peek', 'gift', 'shield', 'discardcolor', 'lock'] as const;
export function defaultDeckConfig(): DeckConfig {
  return {
    colors: COLORS.map(id => ({
      id, name: CLASSIC_NAME[id], hex: CLASSIC_HEX[id], numbers: classicNumbers(),
      skip: 2, reverse: 2, draw2: 2, draw1: 0, skipall: 0, reversedraw: 0, swapcard: 0, peek: 0, gift: 0, shield: 0, discardcolor: 0, lock: 0
    })),
    wildCount: 4, wild4Count: 4, wild2Count: 0, copycatCount: 0, bombCount: 0, shuffleCount: 0, gabsCount: 0
  };
}

let seq = 0;
const mk = (color: Card['color'], kind: Card['kind'], value?: number): Card => ({ id: `c${seq++}`, color, kind, value });

/** Build a deck from a deck config (classic 108-card deck when none is given). */
export function createDeck(config?: DeckConfig): Card[] {
  seq = 0;
  const cfg = config ?? defaultDeckConfig();
  const deck: Card[] = [];
  for (const color of cfg.colors) {
    for (const n of color.numbers) for (let i = 0; i < n.copies; i++) deck.push(mk(color.id, 'number', n.value));
    for (const kind of COLORED_SPECIALS) for (let i = 0; i < color[kind]; i++) deck.push(mk(color.id, kind));
  }
  for (let i = 0; i < cfg.wildCount; i++) deck.push(mk('wild', 'wild'));
  for (let i = 0; i < cfg.wild4Count; i++) deck.push(mk('wild', 'wild4'));
  for (let i = 0; i < cfg.wild2Count; i++) deck.push(mk('wild', 'wild2'));
  for (let i = 0; i < cfg.copycatCount; i++) deck.push(mk('wild', 'copycat'));
  for (let i = 0; i < cfg.bombCount; i++) deck.push(mk('wild', 'bomb'));
  for (let i = 0; i < cfg.shuffleCount; i++) deck.push(mk('wild', 'shuffle'));
  for (let i = 0; i < cfg.gabsCount; i++) deck.push(mk('wild', 'gabs'));
  return deck;
}

export function deckSize(config: DeckConfig): number {
  return config.colors.reduce((sum, c) => sum + c.numbers.reduce((s, n) => s + n.copies, 0) + COLORED_SPECIALS.reduce((a, k) => a + c[k], 0), 0)
    + config.wildCount + config.wild4Count + config.wild2Count + config.copycatCount + config.bombCount + config.shuffleCount + config.gabsCount;
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const ID_RE = /^[a-z0-9][a-z0-9-]{0,31}$/;
/** Validate and normalize a deck config from a client; returns null when invalid. */
export function validateDeckConfig(input: any): DeckConfig | null {
  if (!input || !Array.isArray(input.colors) || input.colors.length < 2 || input.colors.length > 8) return null;
  const ids = new Set<string>();
  const colors = [];
  for (const raw of input.colors) {
    const id = String(raw?.id ?? '');
    const name = String(raw?.name ?? '').trim();
    const hex = String(raw?.hex ?? '');
    if (!ID_RE.test(id) || id === 'wild' || ids.has(id)) return null;
    if (!name || name.length > 20 || !HEX_RE.test(hex)) return null;
    if (!Array.isArray(raw.numbers)) return null;
    const seen = new Set<number>();
    const numbers = [];
    for (const n of raw.numbers) {
      const value = Number(n?.value); const copies = Number(n?.copies);
      if (!Number.isInteger(value) || value < 0 || value > 9 || seen.has(value)) return null;
      if (!Number.isInteger(copies) || copies < 1 || copies > 99) return null;
      seen.add(value); numbers.push({ value, copies });
    }
    numbers.sort((a, b) => a.value - b.value);
    const specials = (v: any) => { const n = Number(v ?? 0); return Number.isInteger(n) && n >= 0 && n <= 99 ? n : null; };
    const counts = {} as Record<string, number>;
    for (const k of COLORED_SPECIALS) { const v = specials(raw[k]); if (v === null) return null; counts[k] = v; }
    ids.add(id);
    colors.push({ id, name, hex: hex.toLowerCase(), numbers, ...(counts as unknown as Pick<DeckColor, typeof COLORED_SPECIALS[number]>) } as DeckColor);
  }
  const count = (v: any, max: number) => { const n = Number(v ?? 0); return Number.isInteger(n) && n >= 0 && n <= max ? n : null; };
  const wildCount = count(input.wildCount, 99);
  const wild4Count = count(input.wild4Count, 99);
  const wild2Count = count(input.wild2Count, 99);
  const copycatCount = count(input.copycatCount, 99);
  const bombCount = count(input.bombCount, 99);
  const shuffleCount = count(input.shuffleCount, 99);
  const gabsCount = count(input.gabsCount, 99);
  if ([wildCount, wild4Count, wild2Count, copycatCount, bombCount, shuffleCount, gabsCount].some(v => v === null)) return null;
  const cfg: DeckConfig = { colors, wildCount: wildCount!, wild4Count: wild4Count!, wild2Count: wild2Count!, copycatCount: copycatCount!, bombCount: bombCount!, shuffleCount: shuffleCount!, gabsCount: gabsCount! };
  const size = deckSize(cfg);
  if (size < 30 || size > 5000) return null;
  if (cfg.colors.some(c => c.numbers.length === 0 && COLORED_SPECIALS.reduce((a, k) => a + c[k], 0) === 0)) return null;
  return cfg;
}

export function cardPoints(card: Card): number {
  if (card.kind === 'number') return card.value ?? 0;
  if (WILD_KINDS.includes(card.kind)) return 50;
  return 20;
}

export function isPlayable(card: Card, top: Card, currentColor: CardColor): boolean {
  if (WILD_KINDS.includes(card.kind)) return true;
  if (card.color === currentColor) return true;
  if (card.kind === 'number' && top.kind === 'number') return card.value === top.value;
  return card.kind !== 'number' && card.kind === top.kind;
}

export function cardLabel(card: Card): string {
  if (card.kind === 'number') return String(card.value);
  return {
    skip: 'Skip', reverse: 'Reverse', draw2: '+2', wild: 'Wild', wild4: 'Wild +4',
    draw1: '+1', skipall: 'Skip All', reversedraw: 'Reverse +1', wild2: 'Wild +2', swapcard: 'Swap Card',
    peek: 'Peek', gift: 'Gift', shield: 'Shield', discardcolor: 'Discard Colour', copycat: 'Copycat', bomb: 'Bomb', shuffle: 'Shuffle Hands', lock: 'Colour Lock', gabs: 'Gabs'
  }[card.kind];
}
