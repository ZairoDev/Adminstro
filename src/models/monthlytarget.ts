import mongoose from "mongoose";

const target = new mongoose.Schema({
  location:{
    type: String,required:true},
  targetAmount:{
    type: Number,
    required: true
  },
  team:{
    type: String,
    required: true
  }
},
{timestamps: true})