/* eslint-disable no-prototype-builtins */
import {
  PreSignUpTriggerEvent,
  PostConfirmationTriggerEvent,
  PostAuthenticationTriggerEvent,
  PostConfirmationConfirmSignUpTriggerEvent,
} from 'aws-lambda';
import {
  listUsersByEmail,
  adminLinkUserAccounts,
  adminCreateUser,
  adminSetUserPassword,
  markUserEmailAsVerified,
  adminUpdateUserAttribute,
  adminConfirmSignUp,
  updateEmailVerified,
} from './helper';

import { postAuthenticationTrigger } from './PostAuthenticationTrigger';

import { User } from './userModel';
import { DB } from '../../utils/DB';

export { postAuthenticationTrigger };

export const preSignUpTrigger = async (
  event: PreSignUpTriggerEvent | PostConfirmationTriggerEvent | PostAuthenticationTriggerEvent,
) => {
  await DB();
  event.request.userAttributes['custom:role'] = 'user';
  if (event.userName.includes('facebook')) {
    event.request.userAttributes.picture = JSON.parse(
      event.request.userAttributes.picture,
    ).data.url;
  }

  const {
    triggerSource,
    userPoolId,
    userName,
    request: {
      userAttributes: { email, name, picture },
    },
  } = event;

  const EXTERNAL_AUTHENTICATION_PROVIDER = 'PreSignUp_ExternalProvider';

  if (triggerSource === EXTERNAL_AUTHENTICATION_PROVIDER) {
    // --> User has registered with Google/Facebook external providers
    const usersFilteredByEmail = await listUsersByEmail({
      userPoolId,
      email,
    });

    // userName example: "facebook_12324325436" or "google_1237823478"
    let providerName: any = userName.split('_')[0];
    const providerUserId = userName.split('_')[1];
    providerName = ['Google', 'Facebook'].find(
      (val) => providerName.toUpperCase() === val.toUpperCase(),
    );

    if (usersFilteredByEmail.Users && usersFilteredByEmail.Users.length > 0) {
      // user already has cognito account
      const cognitoUsername = usersFilteredByEmail.Users[0].Username || 'username-not-found';

      if (usersFilteredByEmail.Users[0].UserStatus === 'UNCONFIRMED') {
        await adminConfirmSignUp(cognitoUsername);
      }
      // if they have access to the Google / Facebook account of email X, verify their email.
      // even if their cognito native account is not verified
      await adminLinkUserAccounts({
        username: cognitoUsername,
        userPoolId,
        providerName,
        providerUserId,
      });
    } else {
      /* --> user does not have a cognito native account ->
              1. create a native cognito account
              2. change the password, to change status from FORCE_CHANGE_PASSWORD to CONFIRMED
              3. merge the social and the native accounts
              4. add the user to a group - OPTIONAL
          */

      const createdCognitoUser = await adminCreateUser({
        userPoolId,
        email,
        name,
        picture,
      });

      await adminSetUserPassword({ userPoolId, email });

      const cognitoNativeUsername = createdCognitoUser.User
        ? createdCognitoUser.User.Username
        : 'username-not-found';

      await adminLinkUserAccounts({
        username: cognitoNativeUsername,
        userPoolId,
        providerName,
        providerUserId,
      });

      // @ts-expect-error event.response.autoConfirmUser can be {}
      event.response.autoConfirmUser = true;
      // @ts-expect-error event.response.autoVerifyEmail can be {}
      event.response.autoVerifyEmail = true;
    }
  }

  if (triggerSource === 'PreSignUp_SignUp' || triggerSource === 'PreSignUp_AdminCreateUser') {
    const newUser = await User.create({
      userId: userName,
      name,
      email,
      picture,
      createdBy: event.triggerSource,
    });
    if (newUser) {
      event.request.userAttributes['custom:_id'] = newUser._id;
    }
  }

  if (triggerSource === 'PreSignUp_ExternalProvider') {
    const providerName = userName.split('_')[0].toUpperCase();
    throw new Error(`${providerName}_ACCOUNT_LINKED`);
  }

  return event;
};

export const postConfirmationSignupTrigger = async (
  event: PostConfirmationConfirmSignUpTriggerEvent,
) => {
  console.log('Post Confirmation Signup Triggered');
  // if the email is verified in cognito then also make emailVerified = true property of User in the Database
  // await updateEmailVerified(event);

  return event;
};
