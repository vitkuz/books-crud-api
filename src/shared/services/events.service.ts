import { eventBridge } from '../clients/eventbridge/instance';
import logger from '../utils/logger';

const DEFAULT_SOURCE = 'books-api';

export type PublishEventInput = {
  source?: string;
  detailType: string;
  detail: Record<string, unknown>;
};

export type PublishEventResult = {
  eventId: string;
};

export type EventsService = {
  publishEvent: (input: PublishEventInput) => Promise<PublishEventResult>;
};

export const eventsService: EventsService = {
  publishEvent: async (input) => {
    const source = input.source ?? DEFAULT_SOURCE;
    logger.debug('events.service.publishEvent start', {
      source,
      detailType: input.detailType,
    });
    const result: PublishEventResult = await eventBridge.putEvent({
      source,
      detailType: input.detailType,
      detail: input.detail,
    });
    logger.debug('events.service.publishEvent success', { eventId: result.eventId });
    return result;
  },
};
