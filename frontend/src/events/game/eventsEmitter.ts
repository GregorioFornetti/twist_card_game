import EventsEmitterBase from '../EventsEmitterBase';
import type { CardColor } from '@/interfaces/Lobby';
export default class GameEventsEmitter extends EventsEmitterBase {
  emitPlayCard(cardId: string, chosenColor?: CardColor) { this.socket.emit('play-card', cardId, chosenColor); }
  emitDrawCard() { this.socket.emit('draw-card'); }
  emitPassTurn() { this.socket.emit('pass-turn'); }
  emitChallengeResponse(challenge: boolean) { this.socket.emit('challenge-response', challenge); }
  emitPenaltyAccept() { this.socket.emit('penalty-accept'); }
  emitSwapChoice(targetId?: string) { this.socket.emit('swap-choice', targetId); }
  emitSwapCardTarget(targetId: string) { this.socket.emit('swapcard-target', targetId); }
  emitSwapCardGive(cardId: string) { this.socket.emit('swapcard-card', cardId); }
  emitGiftTarget(targetId: string) { this.socket.emit('gift-target', targetId); }
  emitGiftGive(cardId: string) { this.socket.emit('gift-card', cardId); }
  emitPeekTarget(targetId?: string) { this.socket.emit('peek-target', targetId); }
  emitCancelChoice() { this.socket.emit('cancel-choice'); }
}
