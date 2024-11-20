import * as AWS from 'aws-sdk';
import { DB } from '../../utils/DB';
import { User } from './userModel';
import { UserFormConfig } from '../../form/utils/userFormConfig';
import { FormModel } from '../../form/utils/formModel';
import { ResponseModel } from '../../form/utils/responseModel';
import { IValue as ResponseValueType } from '../../form/types/response';
import { PostAuthenticationTriggerEvent } from 'aws-lambda';

const { USER_POOL_ID } = process.env;

const cognitoIdp = new AWS.CognitoIdentityServiceProvider();

export const listUsersByEmail = async ({
  userPoolId,
  email,
}: {
  userPoolId: string;
  email: string;
}) => {
  const params = {
    UserPoolId: userPoolId,
    Filter: `email = "${email}"`,
  };

  return cognitoIdp.listUsers(params).promise();
};

export const adminLinkUserAccounts = async ({
  username,
  userPoolId,
  providerName,
  providerUserId,
}: {
  username: any;
  userPoolId: string;
  providerName: any;
  providerUserId: string;
}) => {
  const params = {
    DestinationUser: {
      ProviderAttributeValue: username,
      ProviderName: 'Cognito',
    },
    SourceUser: {
      ProviderAttributeName: 'Cognito_Subject',
      ProviderAttributeValue: providerUserId,
      ProviderName: providerName,
    },
    UserPoolId: userPoolId,
  };

  return cognitoIdp.adminLinkProviderForUser(params).promise();
};

export const adminCreateUser = async ({
  userPoolId,
  email,
  name,
  picture,
}: {
  userPoolId: string;
  email: string;
  name: string;
  picture: string;
}): Promise<AWS.CognitoIdentityServiceProvider.AdminCreateUserResponse> => {
  const params = {
    UserPoolId: userPoolId,
    // SUPRESS prevents sending an email with the temporary password
    // to the user on account creation
    MessageAction: 'SUPPRESS',
    Username: email,
    UserAttributes: [
      {
        Name: 'name',
        Value: name,
      },
      {
        Name: 'picture',
        Value: picture,
      },
      {
        Name: 'email',
        Value: email,
      },
      {
        Name: 'email_verified',
        Value: 'true',
      },
    ],
  };

  return cognitoIdp.adminCreateUser(params).promise();
};

function generatePassword(): string {
  return `${Math.random() // Generate random number, eg: 0.123456
    .toString(36) // Convert  to base-36 : "0.4fzyo82mvyr"
    .slice(-8)}42`; // Cut off last 8 characters : "yo82mvyr" and add a number, because the cognito password policy requires a number
}

export const adminSetUserPassword = async ({
  userPoolId,
  email,
}: {
  userPoolId: string;
  email: string;
}) => {
  const params = {
    Password: generatePassword(),
    UserPoolId: userPoolId,
    Username: email,
    Permanent: true,
  };

  return cognitoIdp.adminSetUserPassword(params).promise();
};

export const markUserEmailAsVerified = async (username: string, userPoolId: string) => {
  const params = {
    UserAttributes: [
      {
        Name: 'email_verified',
        Value: 'true',
      },
    ],
    UserPoolId: userPoolId,
    Username: username,
  };

  return cognitoIdp.adminUpdateUserAttributes(params).promise();
};

export const adminToggleUserStatus = (username: string, status: boolean) => {
  const params: any = {
    UserPoolId: USER_POOL_ID,
    Username: username,
  };
  if (status) {
    return cognitoIdp.adminEnableUser(params).promise();
  }
  return cognitoIdp.adminDisableUser(params).promise();
};

export const adminUpdateUserAttribute = (
  username = '',
  attribute: { Name: string; Value: string },
) => {
  const params = {
    UserPoolId: USER_POOL_ID || '',
    Username: username,
    UserAttributes: [attribute],
  };

  return cognitoIdp.adminUpdateUserAttributes(params).promise();
};

export const adminConfirmSignUp = (username = '') => {
  const params = {
    UserPoolId: USER_POOL_ID || '',
    Username: username,
  };
  return cognitoIdp.adminConfirmSignUp(params).promise();
};

/**
 * updates the emailVerified field of the User in Database
 * @param userAttributes AWS Cognito User's user attribute.
 *
 * Links :
 * - User Pool Attributes : https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html
 * */
export const updateEmailVerified = async (event: PostAuthenticationTriggerEvent) => {
  const { userAttributes } = event.request;

  // if (!userAttributes['custom:email_verified'] || userAttributes['custom:email_verified'] === '0') {
  //   await cognitoIdp
  //     .adminUpdateUserAttributes({
  //       UserAttributes: [
  //         {
  //           Name: 'custom:email_verified',
  //           Value: '1',
  //         },
  //       ],
  //       UserPoolId: event.userPoolId,
  //       Username: userAttributes.email,
  //     })
  //     .promise();
  // }

  await DB();
  const userForm = await FormModel.findOne({
    slug: UserFormConfig.slug,
  });

  if (!userForm) {
    throw new Error('Users Form Now Found');
  }

  const userResponseId = userAttributes['custom:_id'];
  const isEmailVerifiedinCongito = userAttributes['cognito:user_status'] === 'CONFIRMED';

  const emailVerifiedFieldId = userForm.fields
    .find((val) => val.label === UserFormConfig.fields.emailVerified)
    ?._id.toString();

  if (!emailVerifiedFieldId) {
    throw new Error(
      `'${UserFormConfig.fields.emailVerified}' field not found in the user's form in database`,
    );
  }

  const userResponse = await ResponseModel.findOne({
    _id: userResponseId,
  });

  if (!userResponse) {
    throw new Error('User not present in database but the user is present in AWS Cognito');
  }

  const EmailVerifiedField = userResponse.values.find(
    (value) => value.field === emailVerifiedFieldId,
  );

  const defaultResponseValue = {
    field: '',
    value: '',
    valueNumber: null,
    valueBoolean: null,
    valueDate: null,
    media: [],
    values: [],
    template: null,
    page: null,
    form: null,
    response: null,
    options: { option: false },
    tempMedia: [],
    tempMediaFiles: [],
  };

  if (!EmailVerifiedField) {
    // Email Verified Field is not present. so create the field and push it in values array
    const newResponseValue: Partial<ResponseValueType> = {
      ...defaultResponseValue,
      field: emailVerifiedFieldId,
      valueBoolean: isEmailVerifiedinCongito,
    };

    await userResponse.updateOne({
      $push: {
        values: newResponseValue,
      },
    });
  } else if (EmailVerifiedField.valueBoolean !== isEmailVerifiedinCongito) {
    await ResponseModel.updateOne(
      {
        _id: userResponseId,
        'values.field': emailVerifiedFieldId,
      },
      {
        $set: {
          'values.$.valueBoolean': isEmailVerifiedinCongito,
          'values.$.value': '',
          'values.$.valueNumber': null,
          'values.$.valueDate': null,
          'values.$.media': [],
          'values.$.values': [],
          'values.$.template': null,
          'values.$.page': null,
          'values.$.form': null,
          'values.$.response': null,
          'values.$.options': { option: false },
        },
      },
    );
  }
};
