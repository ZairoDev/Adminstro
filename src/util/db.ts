import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_DB_URL!;

if (!MONGO_URI) {
  throw new Error("MONGO_DB_URL is not defined");
}

type Cached = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

let cached = (global as any).mongoose as Cached;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export const connectDb = async (): Promise<typeof mongoose> => {
  if (cached.conn) {
    console.log("Using cached database connection");
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGO_URI, {
      dbName: "PropertyDb",
      serverSelectionTimeoutMS: 10000,
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;

  console.log("DB connected");

  return cached.conn;
};
