import mongoose, { Schema, Document, Types } from "mongoose";

export type ExpoPlatform = "ios" | "android";

export interface IExpoPushToken extends Document {
  employeeId: Types.ObjectId;
  token: string;
  platform?: ExpoPlatform;
  deviceId?: string;
  deviceName?: string;
  projectId?: string;
  lastSeenAt: Date;
  disabledAt?: Date | null;
  disabledReason?: string | null;
}

const expoPushTokenSchema = new Schema<IExpoPushToken>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employees", required: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    platform: { type: String, enum: ["ios", "android"], required: false },
    deviceId: { type: String, required: false },
    deviceName: { type: String, required: false },
    projectId: { type: String, required: false },
    lastSeenAt: { type: Date, required: true, default: () => new Date() },
    disabledAt: { type: Date, required: false, default: null },
    disabledReason: { type: String, required: false, default: null },
  },
  { timestamps: true }
);

expoPushTokenSchema.index({ employeeId: 1, token: 1 });

const ExpoPushTokens =
  mongoose.models?.ExpoPushTokens ||
  mongoose.model<IExpoPushToken>("ExpoPushTokens", expoPushTokenSchema);

export default ExpoPushTokens;
