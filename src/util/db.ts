import mongoose from "mongoose";

let cachedConnection: typeof mongoose.connection | null = null;

export const connectDb = async (): Promise<void> => {
  if (cachedConnection && cachedConnection.readyState === 1) {
    return;
  }
  if (!process.env.MONGO_DB_URL) {
    throw new Error("MONGO_DB_URL is not defined in environment variables");
  }
  const { connection } = await mongoose.connect(process.env.MONGO_DB_URL, {
    dbName: "PropertyDb",
    serverSelectionTimeoutMS: 10000,
  });
  cachedConnection = connection;
};
