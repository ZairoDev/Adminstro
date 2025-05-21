import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["super-admin", "user"],
    default: "user",
  },
});

export const Users = mongoose.models.Users || mongoose.model("Users", userSchema);
