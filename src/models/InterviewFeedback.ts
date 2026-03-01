import mongoose from "mongoose";

const InterviewFeedbackSchema = new mongoose.Schema({
    candidateId: { type: String, required: true, index: true },
    candidateName: { type: String, required: true },
    interviewerName: { type: String, required: true },
    interviewDate: { type: String, required: true },
    
    // Rating (1-5)
    communicationSkills: { type: Number, required: true, min: 1, max: 5 },
    salesAptitude: { type: Number, required: true, min: 1, max: 5 },
    technicalUnderstanding: { type: Number, required: true, min: 1, max: 5 },
    enthusiasm: { type: Number, required: true, min: 1, max: 5 },
    culturalFit: { type: Number, required: true, min: 1, max: 5 },
    
    // Overall
    overallRating: { type: Number, required: true, min: 1, max: 5 },
    
    // Decision
    recommendation: { 
        type: String, 
        required: true,
        enum: ["Strongly Hire", "Hire", "Maybe", "No Hire", "Strong No Hire"]
    },
    
    // Comments
    strengths: { type: String },
    weaknesses: { type: String },
    additionalNotes: { type: String },
    
    // Metadata
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

const InterviewFeedback = mongoose.models.InterviewFeedback || 
    mongoose.model("InterviewFeedback", InterviewFeedbackSchema);

export default InterviewFeedback;
