import mongoose from "mongoose";

let cachedConnection: typeof mongoose.connection | null = null;

export const connectDb = async (): Promise<void> => {
  if (cachedConnection && cachedConnection.readyState === 1) {
    return;
  }
  if (!process.env.MONGO_DB_URL) {
    throw new Error("MONGO_DB_URL is not defined in environment variables");
  }
  try {
    const { connection } = await mongoose.connect(process.env.MONGO_DB_URL, {
      dbName: "PropertyDb",
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 20000,
      // Helps on environments where IPv6 DNS/SRV resolution is flaky.
      family: 4,
    });
    cachedConnection = connection;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown MongoDB connection error";
    throw new Error(`MongoDB connection failed: ${message}`);
  }
};
