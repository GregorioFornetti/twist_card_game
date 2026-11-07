/** Room codes are 6 letters/digits (see makeLobbyCode on the server). */
export function normalizeRoomCode(raw: string | null | undefined): string {
  const code = (raw ?? '').trim().toUpperCase();
  return /^[A-Z0-9]{6}$/.test(code) ? code : '';
}

/** Shareable invite link for a room, e.g. buildInviteLink('ABC123', 'http://localhost:3000/') -> 'http://localhost:3000/join/ABC123'. */
export function buildInviteLink(code: string, baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  return `${base}/join/${normalizeRoomCode(code)}`;
}

/**
 * Room code carried by an invite URL, or '' when there is none.
 * Accepts /join/ABC123, ?code=ABC123 and #/join/ABC123 so links keep
 * working however they were shared or pasted.
 */
export function inviteCodeFromUrl(url: string): string {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return ''; }
  const fromPath = parsed.pathname.match(/\/join\/([A-Za-z0-9]+)\/?$/);
  if (fromPath) return normalizeRoomCode(fromPath[1]);
  const fromQuery = normalizeRoomCode(parsed.searchParams.get('code'));
  if (fromQuery) return fromQuery;
  const fromHash = parsed.hash.match(/\/join\/([A-Za-z0-9]+)\/?$/);
  return fromHash ? normalizeRoomCode(fromHash[1]) : '';
}
