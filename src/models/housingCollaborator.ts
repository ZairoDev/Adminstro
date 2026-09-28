import mongoose, { Document, Schema, Types } from "mongoose";
import {
  HOUSING_COLLABORATOR_SUPPLIES,
  type HousingCollaboratorSupplies,
} from "@/schemas/housingCollaborator.schema";

export interface IHousingCollaboratorWebSession {
  sessionId?: string | null;
  sessionStartedAt?: number | null;
  expiresAt?: number | null;
  lastActiveAt?: number | null;
  isLoggedIn?: boolean;
}

export interface IHousingCollaborator extends Document {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  name: string;
  contact: string;
  email: string;
  country: string;
  city: string;
  area: string;
  supplies: HousingCollaboratorSupplies;
  sendContractViaEmail: boolean;
  password: string;
  issuedPassword: string;
  isActive: boolean;
  webSession?: IHousingCollaboratorWebSession;
  tokenValidAfter?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const housingCollaboratorSchema = new Schema<IHousingCollaborator>(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    contact: {
      type: String,
      required: [true, "Contact is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      unique: true,
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true,
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },
    area: {
      type: String,
      required: [true, "Area is required"],
      trim: true,
    },
    supplies: {
      type: String,
      enum: HOUSING_COLLABORATOR_SUPPLIES,
      required: [true, "Supplies type is required"],
    },
    sendContractViaEmail: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },
    issuedPassword: {
      type: String,
      required: [true, "Issued password is required"],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    webSession: {
      sessionId: { type: String, default: null },
      sessionStartedAt: { type: Number, default: null },
      expiresAt: { type: Number, default: null },
      lastActiveAt: { type: Number, default: null },
      isLoggedIn: { type: Boolean, default: false },
    },
    tokenValidAfter: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true },
);

housingCollaboratorSchema.pre("validate", function (next) {
  const firstName = String(this.firstName || "").trim();
  const lastName = String(this.lastName || "").trim();
  this.name = `${firstName} ${lastName}`.trim();
  next();
});

housingCollaboratorSchema.index({
  name: "text",
  firstName: "text",
  lastName: "text",
  email: "text",
  contact: "text",
  city: "text",
  area: "text",
  country: "text",
});

const HousingCollaborator =
  (mongoose.models.HousingCollaborator as mongoose.Model<IHousingCollaborator> | undefined) ||
  mongoose.model<IHousingCollaborator>(
    "HousingCollaborator",
    housingCollaboratorSchema,
  );

export default HousingCollaborator;
