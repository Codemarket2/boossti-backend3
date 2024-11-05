import * as sst from "sst/constructs";
import { AuthorizationType, UserPoolDefaultAction } from 'aws-cdk-lib/aws-appsync';
import * as cdk from "aws-cdk-lib";
import dataSources from './dataSources';
import resolvers from './resolvers';
import schemas from './schemas';
import { Cognito } from "sst/constructs";
import { DATABASE, DISTRIBUTION_ID, EMAIL_VERIFICATION_API, FRONTEND_URL, ONESIGNAL_API_KEY, ONESIGNAL_APP_ID, SENDER_EMAIL, SNS_ORIGINAL_NUMBER, USERS_FORM_SLUG } from "../path";
import { StringParameter } from "aws-cdk-lib/aws-ssm";

export function MyStack({ stack, app }: sst.StackContext) {
  // Define your stack
  // const SENDER_EMAIL = StringParameter.valueForStringParameter(this, '/boossti/sender-email');
  const GRAPHQL_API_URL = StringParameter.valueForStringParameter(
    this,
    `/boossti/graphql-api-url/${app.stage}`,
  );
  const GRAPHQL_API_KEY = StringParameter.valueForStringParameter(
    this,
    `/boossti/graphql-api-key/${app.stage}`,
  );
  // const DISTRIBUTION_ID = StringParameter.valueForStringParameter(
  //   this,
  //   `/boossti/frontend/master/distribution-id`,
  // );
  // const FRONTEND_URL = StringParameter.valueForStringParameter(this, '/boossti/frontend-url');
  // const EMAIL_VERIFICATION_API = StringParameter.valueForStringParameter(
  //   this,
  //   '/boossti/emailverification/apiKey',
  // );
  // const SNS_ORIGINAL_NUMBER = StringParameter.valueForStringParameter(
  //   this,
  //   '/codemarket/sns/originalNumber',
  // );
  // const USERS_FORM_SLUG = StringParameter.valueForStringParameter(
  //   this,
  //   '/boossti/form-slug/users',
  // );
  const USER_POOL_ID = StringParameter.valueForStringParameter(this, `/boossti/userpool-id/${app.stage}`);


  const auth = new Cognito(stack, "UserPool");

  const api = new sst.AppSyncApi(stack, 'graphql', {
    schema: schemas,
    dataSources: dataSources,
    resolvers: { ...resolvers },

    cdk: {
      graphqlApi: {
        authorizationConfig: {
          defaultAuthorization: {
            authorizationType: AuthorizationType.USER_POOL,
            userPoolConfig: {
              userPool: auth.cdk.userPool,
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
          SENDER_EMAIL,
          DATABASE,
          USER_POOL_ID,
          SNS_ORIGINAL_NUMBER,
          GRAPHQL_API_URL,
          GRAPHQL_API_KEY,
          ONESIGNAL_API_KEY,
          ONESIGNAL_APP_ID,
          DISTRIBUTION_ID,
          FRONTEND_URL,
          USERS_FORM_SLUG,
          STAGE: app.stage,
        },
      }
    },
  });

  const csvFunction = new sst.Function(stack, 'MyApiLambda', {
    functionName: `${app.stage}-write-csv-to-mongodb`,
    handler: 'src/contact/csvFileLambda.handler',
    memorySize: 3008,
    timeout: 900,
    environment: {
      EMAIL_VERIFICATION_API,
      DATABASE,
    },
  });

  api.attachPermissions("*");
  csvFunction.attachPermissions("*");

  stack.addOutputs({
    ApiId: api.apiId,
    GraphqlUrl: api.url,

    ApiKey: api.cdk.graphqlApi.apiKey,
    FunctionName: csvFunction.functionName,
  });
}
