import { handlePlayCard, handleDrawCard, handlePassTurn, handleChallengeResponse, handlePenaltyAccept, handleSwapChoice, handleSwapCardTarget, handleSwapCardGive, handleGiftTarget, handleGiftGive, handlePeekTarget, handleCancelChoice } from './handlers/playHandlers';
export default {
  'play-card': handlePlayCard,
  'draw-card': handleDrawCard,
  'pass-turn': handlePassTurn,
  'challenge-response': handleChallengeResponse,
  'penalty-accept': handlePenaltyAccept,
  'swap-choice': handleSwapChoice,
  'swapcard-target': handleSwapCardTarget,
  'swapcard-card': handleSwapCardGive,
  'gift-target': handleGiftTarget,
  'gift-card': handleGiftGive,
  'peek-target': handlePeekTarget,
  'cancel-choice': handleCancelChoice
};
