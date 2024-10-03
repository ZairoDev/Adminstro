// models/Blog.js
import mongoose from "mongoose";

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  banner: {
    type: String,
  },
  maintext: {
    type: String,
  },
  content: {
    type: Object,
    required: true,
  },
  author: {
    type: String,
    required: false,
  },
  tags: [{ type: String }],
  totalWords:{
    type: Number,
  },
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
