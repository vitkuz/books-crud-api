import { EventBridgeClient } from '@aws-sdk/client-eventbridge';

type CreateSdkClientParams = {
  region: string;
};

export const createSdkClient = (params: CreateSdkClientParams): EventBridgeClient =>
  new EventBridgeClient({ region: params.region });
