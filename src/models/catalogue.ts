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
  categories: {
    type: [Object],
  },
});

const Catalogue =
  mongoose.models?.catalogues || mongoose.model("catalogues", catalogueSchema);

export default Catalogue;
