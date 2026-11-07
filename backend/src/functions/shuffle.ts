export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function nextPlayerId(order: string[], currentId: string, direction: 1 | -1, steps = 1): string {
  const i = order.indexOf(currentId);
  const n = order.length;
  return order[(((i + direction * steps) % n) + n) % n];
}
