import mongoose, { Connection } from "mongoose";

let cachedConnection: Connection | null = null;

export const connectSilkenDb = async (): Promise<void> => {
  try {
    if (cachedConnection && cachedConnection.readyState === 1) {
      console.log("Using cached database connection");
      return;
    }
    if (!process.env.MONGO_DB_SILKENKNOT_URL) {
      throw new Error("MONGO_DB_SILKENKNOT_URL is not defined in environment variables");
    }
    const { connection } = await mongoose.connect(process.env.MONGO_DB_SILKENKNOT_URL, {
      dbName: "SilkenKnot",
    });
    cachedConnection = connection;
    console.log("SilkenKnot DB connected");
  } catch (error) {
    console.error("Failed to connect with silkenknot database:", error);
  }
};
