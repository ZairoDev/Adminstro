import mongoose from "mongoose";

const catalogueSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  categories: {
    type: [
      {
        categoryName: String,
        properties: [String],
      },
    ],
  },
});

const Catalogue =
  mongoose.models?.category || mongoose.model("catalogue", catalogueSchema);

export default Catalogue;
