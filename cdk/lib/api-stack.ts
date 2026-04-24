import * as path from 'node:path';
import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const logGroup: LogGroup = new LogGroup(this, 'ApiFunctionLogs', {
      logGroupName: '/aws/lambda/books-api-fn-dev',
      retention: RetentionDays.ONE_DAY,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const projectRoot: string = path.resolve(__dirname, '..', '..');
    const entry: string = path.join(projectRoot, 'src', 'lambda', 'handler.ts');
    const depsLockFilePath: string = path.join(projectRoot, 'package-lock.json');

    const apiFunction: NodejsFunction = new NodejsFunction(this, 'ApiFunction', {
      functionName: 'books-api-fn-dev',
      entry,
      depsLockFilePath,
      projectRoot,
      handler: 'handler',
      runtime: Runtime.NODEJS_20_X,
      architecture: Architecture.ARM_64,
      memorySize: 512,
      timeout: Duration.seconds(15),
      logGroup,
      environment: {
        NODE_ENV: 'production',
        PORT: '3000',
      },
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'es2022',
        format: OutputFormat.CJS,
        externalModules: [],
      },
    });

    const integration: HttpLambdaIntegration = new HttpLambdaIntegration(
      'ApiIntegration',
      apiFunction,
    );

    const httpApi: HttpApi = new HttpApi(this, 'ApiHttp', {
      apiName: 'books-api-http-dev',
      description: 'HTTP API fronting the books-crud-api Lambda.',
      defaultIntegration: integration,
    });

    httpApi.addRoutes({
      path: '/{proxy+}',
      methods: [HttpMethod.ANY],
      integration,
    });

    new CfnOutput(this, 'ApiUrl', {
      value: httpApi.apiEndpoint,
      description: 'HTTP API endpoint URL',
    });

    new CfnOutput(this, 'FunctionName', {
      value: apiFunction.functionName,
      description: 'Lambda function name',
    });

    new CfnOutput(this, 'FunctionLogGroup', {
      value: logGroup.logGroupName,
      description: 'CloudWatch log group for the Lambda',
    });
  }
}
