import mongoose from "mongoose";

const catalogueSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  location: {
    type: String,
  },
  description: {
    type: String,
  },
  categories: [
    // type: [Object],
    {
      name: { type: String, required: true },
      description: { type: String, required: true },
      properties: [
        {
          VSID: { type: String, required: true },
          bookedMonths: { type: [String], default: [] },
        },
      ],
    },
  ],
});

const Catalogue =
  mongoose.models?.catalogues || mongoose.model("catalogues", catalogueSchema);

export default Catalogue;
