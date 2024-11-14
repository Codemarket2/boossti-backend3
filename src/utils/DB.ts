import * as mongoose from 'mongoose';
import { createCollections } from './createCollections';

let isConnected;
let escapedDBString: any;
let db: any;
// export const DB = async (DB_STRING?: string) => {

export const DB = async (DB_STRING?: string) => {
  console.log('DB=' + DB);
  console.log('DB_STRING=' + DB_STRING);
  console.log('process.env.DATABASE=' + process.env.DATABASE);
  try {
    if (isConnected) {
      console.log('=> using existing database connection');
    } else if (!process.env.DATABASE) {
      // } else if (!process.env.DATABASE && !DB_STRING) {
      throw new Error('Database connection string not found');
    } else {
      escapedDBString = encodeURIComponent(DB_STRING || process.env.DATABASE || '');
      // db = await mongoose.connect(escapedDBString);
      db = await mongoose.connect(process.env.DATABASE);
      isConnected = db.connections[0].readyState;
      console.log('DB Connection Successful!');
    }
    await createCollections();
  } catch (error) {
    console.log('DB Connection Failed' + error + 'process.env.DATABASE= ' + process.env.DATABASE + 'db =' + db);
    throw error;
  }
};
