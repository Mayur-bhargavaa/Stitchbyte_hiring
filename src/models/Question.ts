import mongoose from "mongoose";

const QuestionSchema = new mongoose.Schema({
    text: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctIndex: { type: Number, required: true },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], default: "Easy" },
    category: { type: String, default: "Sales" },
    createdAt: { type: Date, default: Date.now }
});

const Question = mongoose.models.Question || mongoose.model("Question", QuestionSchema);
export default Question;
