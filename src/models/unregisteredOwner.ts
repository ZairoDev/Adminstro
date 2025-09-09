import { propertyTypes } from "@/util/type";
import mongoose from "mongoose";

const unregisteredOwnerSchema = new mongoose.Schema({
  name: {
    type: String,
    // required: true,
  },
  // email: {
  //   type: String,
  //   // required: true,
  // },
  phoneNumber: {
    type: String,
    // required: true,
  },  
  location:{
    type: String
  },
  interiorStatus:{
    type: String,
    default: "unfurnished"
  },  
petStatus: {
  type: String,            
  enum: ["Allowed", "Not Allowed","None"],   
  default: "None"
},
  referenceLink:{
    type: String
  },
  date:{
    type: Date,
  },
  price:{
    type: String,
    default: "0"
  },
  propertyType:{
    type: String,
    default:"Hotel"
  },
  area:{
    type: String
  },
  link:{
    type: String
  },
  address:{
    type: String
  },
  remarks:{
    type: String
  },
  availability:{
    type: String,
    default: "Available"
  },
  imageUrls:{
    type: [String],
    default: []
  }

},
{
  timestamps: true,
});

export const unregisteredOwner =
  mongoose.models?.unregisteredOwner ||
  mongoose.model("unregisteredOwner", unregisteredOwnerSchema);