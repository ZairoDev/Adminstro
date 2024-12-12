import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  }
});

const Question = mongoose.models.Question || mongoose.model("Question", questionSchema);
export default Question;
