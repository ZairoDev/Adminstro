import mongoose, { Schema, Document } from "mongoose";
import { EmployeeSchema } from "@/schemas/employee.schema";
interface IUser extends Document, EmployeeSchema {}

const employeeSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Please enter your name"],
    },
    email: {
      type: String,
      required: [true, "Please enter your email"],
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
    AccountNo:{
			type: String,
			default: "",
		},
		IFSC:{
			type: String,
			default: "", 
		},

    phone: {
      type: String,
      required: true,
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
      enum: ["Admin", "Advert", "Content", "Sales", "HR"],
      default: "Advert",
    },
    forgotPasswordToken: String,
    forgotPasswordTokenExpiry: Date,
    verifyToken: String,
    verifyTokenExpiry: Date,
    otpToken: Number,
    otpTokenExpiry: Date,
  },
  { timestamps: true }
);

const Employees =
  mongoose.models.Users || mongoose.model<IUser>("Users", employeeSchema);
export default Employees;
