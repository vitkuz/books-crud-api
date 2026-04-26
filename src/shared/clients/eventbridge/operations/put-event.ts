import {
  PutEventsCommand,
  PutEventsCommandOutput,
  PutEventsResultEntry,
} from '@aws-sdk/client-eventbridge';
import { EventBridgeAdapterClient, EventBridgeAdapterSettings } from '../types';

export const putEventFactory = (
  settings: EventBridgeAdapterSettings,
): EventBridgeAdapterClient['putEvent'] => {
  return async ({ source, detailType, detail }) => {
    settings.logger?.('eventbridge.putEvent start', {
      eventBusName: settings.eventBusName,
      source,
      detailType,
    });

    const command: PutEventsCommand = new PutEventsCommand({
      Entries: [
        {
          EventBusName: settings.eventBusName,
          Source: source,
          DetailType: detailType,
          Detail: JSON.stringify(detail),
        },
      ],
    });

    const response: PutEventsCommandOutput = await settings.client.send(command);
    const entry: PutEventsResultEntry | undefined = response.Entries?.[0];

    if ((response.FailedEntryCount ?? 0) > 0 || !entry?.EventId) {
      settings.logger?.('eventbridge.putEvent failed', {
        errorCode: entry?.ErrorCode,
        errorMessage: entry?.ErrorMessage,
      });
      throw new Error(
        `EventBridge PutEvents failed: ${entry?.ErrorCode ?? 'UNKNOWN'} ${entry?.ErrorMessage ?? ''}`.trim(),
      );
    }

    settings.logger?.('eventbridge.putEvent success', { eventId: entry.EventId });
    return { eventId: entry.EventId };
  };
};
