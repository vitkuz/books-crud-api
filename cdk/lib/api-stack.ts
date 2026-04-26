import * as path from 'node:path';
import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { CorsHttpMethod, HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { AttributeType, BillingMode, ProjectionType, Table } from 'aws-cdk-lib/aws-dynamodb';
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

    const dataTable: Table = new Table(this, 'DataTable', {
      tableName: 'books-api-data-dev',
      partitionKey: { name: 'pk', type: AttributeType.STRING },
      sortKey: { name: 'sk', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    dataTable.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'sk', type: AttributeType.STRING },
      sortKey: { name: 'pk', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    dataTable.addGlobalSecondaryIndex({
      indexName: 'GSI2',
      partitionKey: { name: 'sk', type: AttributeType.STRING },
      sortKey: { name: 'updatedAt', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    dataTable.addGlobalSecondaryIndex({
      indexName: 'GSI3',
      partitionKey: { name: 'sk', type: AttributeType.STRING },
      sortKey: { name: 'createdAt', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
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
        DYNAMODB_TABLE_NAME: dataTable.tableName,
      },
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'es2022',
        format: OutputFormat.CJS,
        externalModules: [],
      },
    });

    dataTable.grantReadWriteData(apiFunction);

    const integration: HttpLambdaIntegration = new HttpLambdaIntegration(
      'ApiIntegration',
      apiFunction,
    );

    const httpApi: HttpApi = new HttpApi(this, 'ApiHttp', {
      apiName: 'books-api-http-dev',
      description: 'HTTP API fronting the books-crud-api Lambda.',
      defaultIntegration: integration,
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [CorsHttpMethod.ANY],
        allowHeaders: ['Authorization', 'Content-Type', 'x-request-id'],
        maxAge: Duration.hours(1),
      },
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

    new CfnOutput(this, 'DataTableName', {
      value: dataTable.tableName,
      description: 'DynamoDB single-table name',
    });
  }
}
