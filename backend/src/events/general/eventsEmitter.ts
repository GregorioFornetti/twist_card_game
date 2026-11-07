import EmitterBase from '../EmitterBase';
export default class GeneralEventsEmitter extends EmitterBase {
  emitInternalServerError() { this.emitToUser('internal-server-error'); }
  emitPlayerLogoutError(type: 'not-in-lobby') { this.emitToUser('player-logout-error', type); }
}
