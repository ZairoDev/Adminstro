// models/Blog.js
import mongoose from "mongoose";

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  banner: {
    type: String, // URL of the banner image
  },
  maintext: {
    type: String,
  },
  content: {
    type: Object, // Store the entire content JSON structure
    required: true,
  },
  tags: [{ type: String }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const Blog = mongoose.models.Blog || mongoose.model("Blog", blogSchema);
export default Blog;
