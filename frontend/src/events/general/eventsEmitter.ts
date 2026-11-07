import EventsEmitterBase from '../EventsEmitterBase';
export default class GeneralEventsEmitter extends EventsEmitterBase {
  emitLogout() { this.socket.emit('logout'); }
}
