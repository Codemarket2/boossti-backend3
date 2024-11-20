import { Schema, model } from 'mongoose';
import { ISchema } from '../../utils/customTypes';

export interface INotification extends ISchema {
  userId: Schema.Types.ObjectId;
  title: string;
  description?: string;
  link?: string;
  formId?: string;
  threadId?: string;
  parentId?: string;
  isClicked?: boolean;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    title: String,
    description: String,
    link: String,
    formId: {
      type: Schema.Types.ObjectId,
      ref: 'Form',
    },
    threadId: {
      type: Schema.Types.ObjectId,
    },
    parentId: {
      type: Schema.Types.ObjectId,
    },
    isClicked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export const NotificationModel = model<INotification>('NotificationModel', notificationSchema);
