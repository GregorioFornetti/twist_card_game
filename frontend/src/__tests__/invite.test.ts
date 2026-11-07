import { buildInviteLink, inviteCodeFromUrl, normalizeRoomCode } from '../invite';

describe('invite links', () => {
  it('normalizes room codes', () => {
    expect(normalizeRoomCode(' abc123 ')).toBe('ABC123');
    expect(normalizeRoomCode('abc')).toBe('');
    expect(normalizeRoomCode(null)).toBe('');
    expect(normalizeRoomCode('ABC-123')).toBe('');
  });

  it('builds a /join/CODE link', () => {
    expect(buildInviteLink('abc123', 'http://localhost:3000')).toBe('http://localhost:3000/join/ABC123');
    expect(buildInviteLink('ABC123', 'http://localhost:3000/')).toBe('http://localhost:3000/join/ABC123');
  });

  it('reads the code back from path, query and hash links', () => {
    expect(inviteCodeFromUrl('http://localhost:3000/join/ABC123')).toBe('ABC123');
    expect(inviteCodeFromUrl('http://localhost:3000/join/abc123/')).toBe('ABC123');
    expect(inviteCodeFromUrl('http://localhost:3000/?code=ABC123')).toBe('ABC123');
    expect(inviteCodeFromUrl('http://localhost:3000/#/join/ABC123')).toBe('ABC123');
    expect(inviteCodeFromUrl(buildInviteLink('XYZ789', 'https://example.com'))).toBe('XYZ789');
  });

  it('returns empty for non-invite or malformed URLs', () => {
    expect(inviteCodeFromUrl('http://localhost:3000/')).toBe('');
    expect(inviteCodeFromUrl('http://localhost:3000/join/toolongcode')).toBe('');
    expect(inviteCodeFromUrl('not a url')).toBe('');
  });
});
