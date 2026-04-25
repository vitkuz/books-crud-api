import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

type CreateSdkDocClientParams = {
  region?: string;
};

export const createSdkDocClient = (params?: CreateSdkDocClientParams): DynamoDBDocumentClient => {
  const baseClient: DynamoDBClient = new DynamoDBClient({
    region: params?.region ?? process.env.AWS_REGION ?? 'us-east-1',
  });
  return DynamoDBDocumentClient.from(baseClient, {
    marshallOptions: {
      removeUndefinedValues: true,
      convertClassInstanceToMap: false,
    },
  });
};
