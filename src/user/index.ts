/* eslint-disable no-case-declarations */
import { DB } from '../utils/DB';
import { User } from './utils/userModel';
import { adminToggleUserStatus } from './utils/helper';
import { AppSyncEvent } from '../utils/customTypes';
import { getCurrentUser } from '../utils/authentication';

export const handler = async (event: AppSyncEvent): Promise<any> => {
  try {
    await DB();
    const { fieldName } = event.info;
    const { arguments: args, identity } = event;
    const tempFilter: any = {};
    let tempSubscription = {};
    let users: any = [];
    let count = 0;

    const authUser = await getCurrentUser(identity);

    switch (fieldName) {
      case 'getUsers':
        const {
          page = 1,
          limit = 10,
          search = '',
          lowerRange = null,
          higherRange = null,
          sortBy = '-createdAtDate',
          active = null,
        } = args;

        if (active !== null) {
          tempFilter.active = active;
        }

        if (lowerRange !== null && higherRange !== null) {
          tempFilter.createdAt = {
            $gte: lowerRange,
            $lte: higherRange,
          };
        }

        users = await User.find({
          ...tempFilter,
          $or: [
            {
              email: { $regex: search, $options: 'i' },
            },
            {
              name: { $regex: search, $options: 'i' },
            },
          ],
        })
          .limit(limit * 1)
          .skip((page - 1) * limit)
          .sort(sortBy)
          .exec();

        count = await User.countDocuments({
          ...tempFilter,
          $or: [
            {
              email: { $regex: search, $options: 'i' },
            },
            {
              name: { $regex: search, $options: 'i' },
            },
          ],
        });

        return {
          users,
          count,
        };
      case 'getUser':
        return await User.findById(args._id);
      case 'getUserByCognitoUserId':
        return await User.findOne({
          userId: args.userId,
        });
      case 'createUser':
        return await User.create({
          ...args,
          createdBy: authUser._id,
        });
      case 'updateUserStatus':
        await adminToggleUserStatus(args.userId, args.status);
        return await User.findOneAndUpdate(
          {
            userId: args.userId,
          },
          {
            updatedBy: authUser._id,
            active: args.status,
            updatedAt: new Date(),
          },
          {
            new: true,
            runValidators: true,
          },
        );
      case 'cancelUserSubscription':
        tempSubscription = {
          active: false,
          subscriptionType: null,
          description: null,
          amount: null,
          subscribedOn: null,
          expiringOn: null,
        };
        return await User.findOneAndUpdate(
          {
            userId: args.userId,
          },
          {
            subscription: tempSubscription,
            updatedBy: authUser._id,
            updatedAt: new Date(),
          },
          {
            new: true,
            runValidators: false,
          },
        );
      case 'updateUser':
        return await User.findOneAndUpdate(
          {
            userId: args.userId,
          },
          { ...args, updatedAt: new Date() },
          {
            new: true,
            runValidators: true,
          },
        );
      default:
        throw new Error('Something went wrong! Please check your resolver mapping template');
    }
  } catch (error) {
    throw error;
  }
};
