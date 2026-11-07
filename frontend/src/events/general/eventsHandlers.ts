import type { Socket } from 'socket.io-client';
import EventsListenersAdderBase from '../EventsListenersAdderBase';
export class GeneralEventsHandlersAdder extends EventsListenersAdderBase {}
export default function addDefaultGeneralEventsHandlers(_socket: Socket) {}
