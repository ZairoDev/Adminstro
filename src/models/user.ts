import mongoose, { Schema, Document } from "mongoose";
import { UserSchema } from "@/schemas/user.schema";
interface IUser extends Document, UserSchema {}

export interface IOwner {
  _id: string;
  name: string;
  email: string;
  phone: string;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Please enter your name"],
    },
    email: {
      type: String,
     
    },
    profilePic: {
      type: String,
      default: "",
    },
    nationality: {
      type: String,
      default: "",
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      default: "Male",
    },
    spokenLanguage: {
      type: String,
      default: "English",
    },
    bankDetails: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      required: true,
    },
    myRequests: {
      type: [String],
      required: false,
    },
    myUpcommingRequests: {
      type: [String],
      required: false,
    },
    declinedRequests: {
      type: [String],
      required: false,
    },
    address: {
      type: String,
      default: "",
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    role: {
      type: String,
      enum: ["Owner", "Traveller","Broker"],
      default: "Owner",
    },
    forgotPasswordToken: String,
    forgotPasswordTokenExpiry: Date,
    verifyToken: String,
    verifyTokenExpiry: Date,
    otpToken: Number,
    otpTokenExpiry: Date,
    origin: {
      type: String,
    },
  },
  { timestamps: true }
);

const Users =
  mongoose.models.Users || mongoose.model<IUser>("Users", userSchema);
export default Users;
