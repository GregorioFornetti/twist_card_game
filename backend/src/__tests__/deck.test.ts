import { createDeck, cardPoints, isPlayable } from '../functions/deck';
import { Card } from '../interfaces/Lobby';

describe('Deck (108 cards)', () => {
  it('has 108 cards with the standard composition', () => {
    const deck = createDeck();
    expect(deck.length).toBe(108);
    for (const color of ['red', 'yellow', 'green', 'blue'] as const) {
      const ofColor = deck.filter(c => c.color === color);
      expect(ofColor.length).toBe(25);
      expect(ofColor.filter(c => c.kind === 'number' && c.value === 0).length).toBe(1);
      for (let v = 1; v <= 9; v++) expect(ofColor.filter(c => c.kind === 'number' && c.value === v).length).toBe(2);
      for (const k of ['skip', 'reverse', 'draw2'] as const) expect(ofColor.filter(c => c.kind === k).length).toBe(2);
    }
    expect(deck.filter(c => c.kind === 'wild').length).toBe(4);
    expect(deck.filter(c => c.kind === 'wild4').length).toBe(4);
    expect(new Set(deck.map(c => c.id)).size).toBe(108);
  });
  it('scores numbers at face value, actions 20, wilds 50', () => {
    expect(cardPoints({ id: 'a', color: 'red', kind: 'number', value: 7 })).toBe(7);
    expect(cardPoints({ id: 'b', color: 'red', kind: 'skip' })).toBe(20);
    expect(cardPoints({ id: 'c', color: 'wild', kind: 'wild4' })).toBe(50);
  });
  it('matches by colour, number, symbol, or wild', () => {
    const top: Card = { id: 't', color: 'green', kind: 'number', value: 5 };
    expect(isPlayable({ id: '1', color: 'green', kind: 'number', value: 1 }, top, 'green')).toBe(true);
    expect(isPlayable({ id: '2', color: 'red', kind: 'number', value: 5 }, top, 'green')).toBe(true);
    expect(isPlayable({ id: '3', color: 'red', kind: 'number', value: 1 }, top, 'green')).toBe(false);
    expect(isPlayable({ id: '4', color: 'wild', kind: 'wild' }, top, 'green')).toBe(true);
    const skipTop: Card = { id: 's', color: 'blue', kind: 'skip' };
    expect(isPlayable({ id: '5', color: 'red', kind: 'skip' }, skipTop, 'blue')).toBe(true);
    expect(isPlayable({ id: '6', color: 'red', kind: 'reverse' }, skipTop, 'blue')).toBe(false);
  });
});
