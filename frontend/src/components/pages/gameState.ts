import type { Card, CardColor } from '@/interfaces/Lobby';
export const WILD_KINDS: Card['kind'][] = ['wild', 'wild4', 'wild2', 'copycat', 'bomb', 'shuffle'];
export function isPlayable(card: Card, top?: Card, currentColor?: CardColor): boolean {
  if (!top || !currentColor) return false;
  if (WILD_KINDS.includes(card.kind)) return true;
  if (card.color === currentColor) return true;
  if (card.kind === 'number' && top.kind === 'number') return card.value === top.value;
  return card.kind !== 'number' && card.kind === top.kind;
}
export const WILD_HEX = '#171717';
