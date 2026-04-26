import { EventBridgeClient } from '@aws-sdk/client-eventbridge';

export type EventBridgeLogger = (msg: string, ctx?: unknown) => void;

export type EventBridgeAdapterSettings = {
  eventBusName: string;
  client: EventBridgeClient;
  logger?: EventBridgeLogger;
};

export type PutEventInput = {
  source: string;
  detailType: string;
  detail: Record<string, unknown>;
};

export type PutEventResult = {
  eventId: string;
};

export type EventBridgeAdapterClient = {
  putEvent: (input: PutEventInput) => Promise<PutEventResult>;
};
