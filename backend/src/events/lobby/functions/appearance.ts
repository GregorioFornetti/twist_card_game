import Lobby from '../../../interfaces/Lobby';
import { APPEARANCE_COLORS, APPEARANCE_EMOTES } from '../../../global';
export function assignFreeAppearance(lobby: Lobby, player: Lobby['players'][number]) {
  const usedE = new Set(lobby.players.map(p => p.emote));
  const usedC = new Set(lobby.players.map(p => p.color));
  player.emote = APPEARANCE_EMOTES.find(e => !usedE.has(e)) ?? APPEARANCE_EMOTES[0];
  player.color = APPEARANCE_COLORS.find(c => !usedC.has(c)) ?? APPEARANCE_COLORS[0];
}
export function makeLobbyCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}
