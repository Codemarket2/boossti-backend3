import * as sst from "sst/constructs";
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { AuthorizationType, UserPoolDefaultAction } from 'aws-cdk-lib/aws-appsync';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import * as cdk from 'aws-cdk-lib';
import events from 'events'
import dataSources from './dataSources';
import resolvers from './resolvers';
import schemas from './schemas';
events.defaultMaxListeners = 20;

export function MyStack({ stack, app }: sst.StackContext) {
  // Define your stack
  const SENDER_EMAIL = StringParameter.valueForStringParameter(this, '/boossti/sender-email');
  // const GRAPHQL_API_URL = StringParameter.valueForStringParameter(
  //   this,
  //   `/boossti/graphql-api-url/${scope.stage}`,
  // );
  // const GRAPHQL_API_KEY = StringParameter.valueForStringParameter(
  //   this,
  //   `/boossti/graphql-api-key/${scope.stage}`,
  // );
  const DISTRIBUTION_ID = StringParameter.valueForStringParameter(
    this,
    `/boossti/frontend/master/distribution-id`,
  );
  const FRONTEND_URL = StringParameter.valueForStringParameter(this, '/boossti/frontend-url');
  const EMAIL_VERIFICATION_API = StringParameter.valueForStringParameter(
    this,
    '/boossti/emailverification/apiKey',
  );
  const SNS_ORIGINAL_NUMBER = StringParameter.valueForStringParameter(
    this,
    '/codemarket/sns/originalNumber',
  );
  const USERS_FORM_SLUG = StringParameter.valueForStringParameter(
    this,
    '/boossti/form-slug/users',
  );
  const USER_POOL_ID = StringParameter.valueForStringParameter(this, '/boossti/userpool-id');
  const userPool = UserPool.fromUserPoolId(this, 'UserPool', USER_POOL_ID);

  const api = new sst.AppSyncApi(stack, 'graphql', {
    schema: schemas,
    cdk: {
      graphqlApi: {
        authorizationConfig: {
          defaultAuthorization: {
            authorizationType: AuthorizationType.USER_POOL,
            userPoolConfig: {
              userPool: userPool,
              defaultAction: UserPoolDefaultAction.ALLOW,
            },
          },
          additionalAuthorizationModes: [
            {
              authorizationType: AuthorizationType.API_KEY,
              apiKeyConfig: {
                expires: cdk.Expiration.after(cdk.Duration.days(365)),
              },
            },
          ],
        },
      }
    },

    defaults: {
      function: {
        timeout: 60,
        environment: {
          SENDER_EMAIL: SENDER_EMAIL || '',
          // DATABASE: `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@codemarket-staging.k16z7.mongodb.net/${app.stage}?retryWrites=true&w=majority`,
          DATABASE: `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@cluster0.e5fyv.mongodb.net/lavpreetsandhu?retryWrites=true&w=majority`,
          USER_POOL_ID: USER_POOL_ID,
          SNS_ORIGINAL_NUMBER: SNS_ORIGINAL_NUMBER,
          GRAPHQL_API_URL: process.env.GRAPHQL_API_URL || '',
          GRAPHQL_API_KEY: process.env.GRAPHQL_API_KEY || '',
          ONESIGNAL_API_KEY: process.env.ONESIGNAL_API_KEY || '',
          ONESIGNAL_APP_ID: process.env.ONESIGNAL_APP_ID || '',
          DISTRIBUTION_ID: DISTRIBUTION_ID || '',
          FRONTEND_URL,
          STAGE: app.stage,
          USERS_FORM_SLUG,
        },
      }
    },
    dataSources: dataSources,
    resolvers: { ...resolvers },
  });

  const csvFunction = new sst.Function(stack, 'MyApiLambda', {
    functionName: `${app.stage}-write-csv-to-mongodb`,
    handler: 'src/contact/csvFileLambda.handler',
    memorySize: 3008,
    timeout: 900,
    environment: {
      EMAIL_VERIFICATION_API: EMAIL_VERIFICATION_API,
      DATABASE: `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@cluster0.e5fyv.mongodb.net/lavpreetsandhu?retryWrites=false&w=majority`,
    },
  });

  api.attachPermissions("*");
  csvFunction.attachPermissions("*");

  stack.addOutputs({
    ApiId: api.apiId,
    GraphqlUrl: api.url,

    ApiKey: api.cdk.graphqlApi.apiKey,
    FunctionName: csvFunction.functionName,
    // graphqlURL: graphqlURL.stringValue,
  });

}
