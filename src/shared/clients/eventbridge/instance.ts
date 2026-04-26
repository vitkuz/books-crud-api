import env from '../../config/env';
import logger from '../../utils/logger';
import { createEventBridgeAdapter } from './client';
import { createSdkClient } from './sdk-client';
import { EventBridgeAdapterClient } from './types';

export const eventBridge: EventBridgeAdapterClient = createEventBridgeAdapter({
  eventBusName: env.EVENTBRIDGE_EVENT_BUS_NAME,
  client: createSdkClient({ region: env.AWS_REGION }),
  logger: (msg: string, ctx?: unknown): void => {
    logger.debug(msg, ctx);
  },
});
