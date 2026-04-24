import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Phase 2 will add the Lambda wrapping the Express app.
    // Phase 3 will front it with an API Gateway HTTP API.
  }
}
