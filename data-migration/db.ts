import { DB as defaultDB } from '../src/utils/DB';

export const db = async () => {
  let dbString =
    'mongodb+srv://<username>:<password>@cluster0.e5fyv.mongodb.net/PROJECT_NAME?retryWrites=true&w=majority';
  dbString = dbString.replace('PROJECT_NAME', process.argv[2]);
  dbString = dbString.replace('<username>', process.argv[3]);
  dbString = dbString.replace('<password>', process.argv[4]);
  await defaultDB(dbString);
};
