import { Schema, model, models } from "mongoose";

const CandidateSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  position: {
    type: String,
    enum: [
      "Developer",
      "Human Resources",
      "QA Engineer",
    ],
    required: true,
  },
  queueNumber: { type: Number, required: true },
  status: { type: String, enum: ["waiting", "called"], default: "waiting" },
  createdAt: { type: Date, default: Date.now },
});
const Candidate = models.Candidate || model("Candidate", CandidateSchema);
export default Candidate;
