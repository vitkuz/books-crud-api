import { putEventFactory } from './operations/put-event';
import { EventBridgeAdapterClient, EventBridgeAdapterSettings } from './types';

export const createEventBridgeAdapter = (
  settings: EventBridgeAdapterSettings,
): EventBridgeAdapterClient => ({
  putEvent: putEventFactory(settings),
});
