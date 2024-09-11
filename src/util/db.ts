import mongoose, { Connection } from "mongoose";

let cachedConnection: Connection | null = null;

export const connectDb = async (): Promise<void> => {
  try {
    if (cachedConnection && cachedConnection.readyState === 1) {
      console.log("Using cached database connection");
      return;
    }
    if (!process.env.MONGO_DB_URL) {
      throw new Error("MONGO_DB_URL is not defined in environment variables");
    }
    const { connection } = await mongoose.connect(process.env.MONGO_DB_URL, {
      dbName: "PropertyDb",
    });
    cachedConnection = connection;
    console.log("DB connected");
  } catch (error) {
    console.error("Failed to connect with database:", error);
  }
};
