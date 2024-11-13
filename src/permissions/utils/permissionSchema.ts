import { Schema, model } from 'mongoose';
import { ISchema } from '../../utils/customTypes';

export interface IPermissionGroup extends ISchema {
  name: string;
  userPoolId: string;
  description: string;
  precedence?: number;
  view?: boolean; // Changed to boolean to match the schema
  create?: boolean; // Changed to boolean to match the schema 
  update?: boolean; // Changed to boolean to match the schema 
  delete?: boolean; // Changed to boolean to match the schema 
  viewAll: boolean; 
  createAll: boolean; // Added to interface 
  updateAll: boolean; // Added to interface 
  deleteAll: boolean; // Added to interface
  
}
const permissionGroupSchema = new Schema<IPermissionGroup>(
  {
    name: {
      type: String,
      unique: true,
      max: 128,
      min: 1,
      validate: /[\p{L}\p{M}\p{S}\p{N}\p{P}]+/u,
      // {
      //   validator: (v) => {
      //     const re = /[\p{L}\p{M}\p{S}\p{N}\p{P}]+/u;
      //     return re.test(v);
      //   },
      //   message: 'Invalid Group name',
      // },
    },
    userPoolId: {
      type: String,
      min: 1,
      max: 55,
      required: true,
      validate: /[\w-]+_[0-9a-zA-Z]+/,
      // {
      //   validator: (v) => {
      //     const re = /[\w-]+_[0-9a-zA-Z]+/;
      //     return re.test(v);
      //   },
      //   message: 'Invalid user poll id',
      // },
    },
    description: {
      type: String,
      max: 2048,
    },
    precedence: {
      type: Number,
      default: 0,
    },
    view: {
      type: Boolean,
      default: false,
    },
    create: {
      type: Boolean,
      default: false,
    },
    update: {
      type: Boolean,
      default: false,
    },
    delete: {
      type: Boolean,
      default: false,
    },
    viewAll: {
      type: Boolean,
      default: false,
    },
    createAll: {
      type: Boolean,
      default: false,
    },
    updateAll: {
      type: Boolean,
      default: false,
    },
    deleteAll: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export const Permissions = model<IPermissionGroup>('Permissions', permissionGroupSchema);
