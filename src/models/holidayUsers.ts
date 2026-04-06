import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "Please enter your first name"],
    },
    lastName: {
      type: String,
      required: [true, "Please enter your last name"],
    },
    // Virtual getter for full name (backwards compatibility)
    name: {
      type: String,
      required: false,
    },
    email: {
      type: String,
      required: [true, "Please enter your email"],
      unique: true,
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
      type: Object,
      default: "",
    },
    countryCode: {
      type: String,
      required: false, // Optional for OAuth users
      default: "+91",
    },
    phone: {
      type: String,
      required: false, // Optional for OAuth users
      default: "",
    },
    // ============================================
    // OAuth Authentication Fields
    // ============================================
    authProvider: {
      type: String,
      enum: ["local", "google", "facebook"],
      default: "local",
    },
    providerId: {
      type: String, // Unique ID from OAuth provider (e.g., Google's sub)
      default: null,
    },
    isProfileComplete: {
      type: Boolean,
      default: true, // false for new OAuth users who need to select role
    },
    myRequests: {
      type: [String],
      require: false,
    },
    myUpcommingRequests: {
      type: [String],
      require: false,
    },
    declinedRequests: {
      type: [Object],
      require: false,
      default: [],
    },
    address: {
      type: String,
      default: "",
    },
    password: {
      type: String,
      required: false, // Optional for OAuth users
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    role: {
      type: String,
      enum: ["Owner", "Traveller"],
      required: false, // Set after OAuth signup via complete-profile
      default: null,
    },
    favouriteProperties: {
      type: [String],
      default: [],
    },
    subscription: {
      type: {
        planId: String,
        planName: String,
        status: {
          type: String,
          enum: ["active", "expired", "cancelled", "none"],
          default: "none",
        },
        startDate: Date,
        endDate: Date,
        subscriptionId: mongoose.Schema.Types.ObjectId,
      },
      default: {
        status: "none",
      },
    },
    Payment: Object,
    forgotPasswordToken: String,
    forgotPasswordTokenExpiry: Date,
    verifyToken: String,
    verifyTokenExpiry: Date,
    origin: {
      type: String,
    },
  },
  
  { timestamps: true }
);
const Users = mongoose.models?.holidayUsers || mongoose.model("holidayUsers", userSchema);
export default Users;
