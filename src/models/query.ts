import mongoose, { Schema, models, model } from "mongoose";

const querySchema = new Schema(
  {
    objectId: {
      type: String,
      require: [true, "Needed a object id"],
    },
    name: {
      type: String,
      required: [true, "Please enter your name"],
    },
    email: {
      type: String,
      required: [true, "Please enter your email"],
    },
    price: {
      type: String,
      required: [true, "Please enter your price"],
    },
    intrest: {
      type: String,
      required: [true, "Please enter your interest"],
    },
    about: {
      type: String,
      required: [true, "Please enter your about"],
    },
  },
  { timestamps: true }
);

const Query = models.Query || model("Query", querySchema);
export default Query;
