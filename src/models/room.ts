import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "query",
    },
    participants: {
      type: [String],
      required: true,
    },
    showcaseProperties: {
      type: [Object],
    },
    favouriteProperties: {
      type: [Object],
    },
    rejectedProperties: {
      type: [Object],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Rooms = mongoose.models.Room || mongoose.model("Room", roomSchema);
export default Rooms;
