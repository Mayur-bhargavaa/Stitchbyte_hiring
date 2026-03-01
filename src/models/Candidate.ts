import mongoose from "mongoose";

const CandidateSchema = new mongoose.Schema({
    candidateId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, index: true },
    phone: { type: String, required: true },
    salaryComfort: { type: Boolean, required: true },
    quizScore: { type: Number, required: true },
    quizTotal: { type: Number, required: true },
    tabViolations: { type: Number, required: true, default: 0 },
    cameraViolations: { type: Number, required: true, default: 0 },
    referencePhoto: { type: String }, // Base64 or URL
    qualificationStatus: { type: String, required: true, index: true },
    interviewDate: { type: String },
    interviewTime: { type: String },
    meetingLink: { type: String },
    interviewStatus: { type: String, required: true, default: "Pending", index: true },
    submissionDate: { type: Date, required: true, default: Date.now, index: true },
    notes: { type: String, default: "" },
    
    // Enhanced fields
    ipAddress: { type: String },
    deviceFingerprint: { type: String },
    timezone: { type: String },
    userAgent: { type: String },
    examDuration: { type: Number }, // in seconds
    tags: [{ type: String }], // For categorization
    source: { type: String }, // Application source tracking
    lastActivityAt: { type: Date, default: Date.now },
    psychometricProfile: { type: mongoose.Schema.Types.Mixed },
    biometricVerified: { type: Boolean, default: false },
    biometricScore: { type: Number },
    lockdownViolations: { type: Number, default: 0 },
    screenRecordingFlags: { type: Number, default: 0 },
});

// Delete cached model in development to ensure schema changes are always picked up
if (mongoose.models.Candidate) {
    delete mongoose.models.Candidate;
}

export default mongoose.model("Candidate", CandidateSchema);
