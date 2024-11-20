import { DB } from '../utils/DB';
import { getCurrentUser } from '../utils/authentication';
import { AppSyncEvent } from '../utils/customTypes';
import { User } from '../user/utils/userModel';
import { StarRating } from './utils/starRatingModel';
import * as mongoose from 'mongoose';

export const handler = async (event: AppSyncEvent): Promise<any> => {
  try {
    await DB();
    const { fieldName } = event.info;
    const { identity } = event;
    let args = { ...event.arguments };
    const user = await getCurrentUser(identity);
    const userSelect = 'name picture _id';
    let data: any = [];
    const { page = 1, limit = 10 } = args;
    let tempStarRatings: any;
    const userPopulate = {
      path: 'createdBy',
      select: userSelect,
    };
    if (fieldName.toLocaleLowerCase().includes('create') && user && user._id) {
      args = { ...args, createdBy: user._id };
    } else if (fieldName.toLocaleLowerCase().includes('update') && user && user._id) {
      args = { ...args, updatedBy: user._id };
    }

    switch (fieldName) {
      case 'createStarRating': {
        const rating = await StarRating.create({
          ...args,
          starRating: args.starRating,
        });
        const populated = await rating.populate(userPopulate); //.execPopulate();
        return populated;
      }
      case 'updateStarRating': {
        tempStarRatings = await StarRating.findOneAndUpdate(
          { _id: args._id, createdBy: user._id },
          { starRating: args.starRating, updatedAt: new Date(), updatedBy: user._id },
          {
            new: true,
            runValidators: true,
          },
        );
        return await tempStarRatings.populate(userPopulate); //.execPopulate();
      }
      case 'getStarRating': {
        const getStarRating = await StarRating.findById(args._id).populate(userPopulate);
        return await getStarRating;
      }
      case 'getRatingCounts': {
        const userStarRating = await StarRating.findOne({
          parentId: args.parentId,
          createdBy: user._id,
        }).populate(userPopulate);
        const averageStarRating = await StarRating.aggregate([
          {
            $match: {
              parentId: new mongoose.Types.ObjectId(args.parentId),
            },
          },
          {
            $group: {
              _id: '$parentId',
              avgRating: { $avg: { $ifNull: ['$starRating', 0] } },
            },
          },
          {
            $project: { avgRating: { $round: ['$avgRating', 1] } },
          },
        ]);
        const ratingCount = await StarRating.countDocuments({
          parentId: args.parentId,
        });
        return {
          userStarRating,
          averageStarRating: averageStarRating[0]?.avgRating,
          ratingCount,
        };
      }
      case 'getStarRatingsByParentId': {
        await User.findById(args.userId);
        data = await StarRating.find({
          parentId: args.parentId,
        })
          .populate(userPopulate)
          .limit(limit * 1)
          .skip((page - 1) * limit);
        const count = await StarRating.countDocuments({
          parentId: args.parentId,
        });
        return {
          data,
          count,
        };
      }
      case 'deleteStarRating': {
        await StarRating.findOneAndDelete({
          parentId: args.parentId,
          createdBy: user._id,
        });
        return true;
      }
      default:
        await StarRating.findOne();
        await User.findOne();
        throw new Error('Something went wrong! Please check your Query or Mutation');
    }
  } catch (error) {
    const error2 = error;
    throw error2;
  }
};
