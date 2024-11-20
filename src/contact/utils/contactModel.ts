import { model, Schema } from 'mongoose';
import { ISchema } from '../../utils/customTypes';

export interface IContact extends ISchema {
  firstName: string;
  lastName: string;
  title: string;
  businessName: string;
  email: string;
  phone: string;
  groupName: string;
  website: string;
  city: string;
}

export interface IMailingList {
  listName: string;
  contacts: [Schema.Types.ObjectId];
}

const contactSchema = new Schema<IContact>(
  {
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    title: {
      type: String,
    },
    businessName: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: String,
    },
    groupName: {
      type: String,
      required: true,
    },
    website: {
      type: String,
    },
    city: {
      type: String,
    },
    // bulkUploadId: Schema.Types.ObjectId,
    createdBy: {
      required: true,
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedAt: {
      type: Schema.Types.Date,
      ref: 'User',
    },
  },
  { timestamps: true },
);

const MailingListSchema = new Schema<IMailingList>(
  {
    listName: {
      type: String,
      unique: true,
      required: true,
    },
    contacts: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Contact',
      },
    ],
  },
  { timestamps: true },
);

export const Contact = model<IContact>('Contact', contactSchema);
export const FailedContact = model<IContact>('FailedContact', contactSchema);

export const MailingList = model<IMailingList>('MailingList', MailingListSchema);
