import { handleCreateLobby } from './handlers/createLobby';
import { handleJoinLobby } from './handlers/joinLobby';
import { handleReady, handleUnready } from './handlers/ready';
import { handleAddBot, handleRemoveBot, handleStartGameRequest, handleRematchRequest, handleRematchGameRequest, handleResetOptions, handleUpdateOptions } from './handlers/botsAndStart';
export default {
  'create-lobby': handleCreateLobby,
  'join-lobby': handleJoinLobby,
  'ready': handleReady,
  'unready': handleUnready,
  'add-bot': handleAddBot,
  'remove-bot': handleRemoveBot,
  'start-game-request': handleStartGameRequest,
  'rematch-request': handleRematchRequest,
  'rematch-game-request': handleRematchGameRequest,
  'update-options': handleUpdateOptions,
  'reset-options': handleResetOptions
};
