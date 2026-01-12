import mongoose, { Schema, Document } from "mongoose";

export interface ISystemNotification extends Document {
  title: string;
  message: string;
  type: "info" | "warning" | "critical";
  target: {
    roles?: string[];
    locations?: string[];
    allUsers?: boolean; // If true, send to all users (ignores roles/locations)
  };
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  expiresAt?: Date;
  readBy: mongoose.Types.ObjectId[]; // Array of user IDs who have read this
  isActive: boolean; // Can be deactivated without deleting
}

const systemNotificationSchema = new Schema<ISystemNotification>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    type: {
      type: String,
      enum: ["info", "warning", "critical"],
      required: true,
      default: "info",
      index: true,
    },
    target: {
      roles: {
        type: [String],
        default: [],
      },
      locations: {
        type: [String],
        default: [],
      },
      allUsers: {
        type: Boolean,
        default: false,
      },
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Employees",
      required: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    readBy: {
      type: [Schema.Types.ObjectId],
      ref: "Employees",
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Compound index for efficient querying
systemNotificationSchema.index({ isActive: 1, expiresAt: 1, createdAt: -1 });
// Note: Cannot index parallel arrays (roles and locations) - MongoDB limitation
// Individual array fields can still be queried efficiently without compound index
systemNotificationSchema.index({ "target.allUsers": 1 });

const SystemNotification =
  mongoose.models.SystemNotification ||
  mongoose.model<ISystemNotification>("SystemNotification", systemNotificationSchema);

export default SystemNotification;

