import mongoose from "mongoose";

const RegisteredCandidateSchema = new mongoose.Schema({
    candidateId: { type: String, required: true, unique: true }, // e.g. SB-BDE-0001
    candidateName: { type: String, required: true },
    email: { type: String, default: "" },
    testStartDate: { type: String, required: true },   // YYYY-MM-DD
    testStartTime: { type: String, default: "00:00" },  // HH:mm (24h)
    testEndDate: { type: String, required: true },      // YYYY-MM-DD
    testEndTime: { type: String, default: "23:59" },    // HH:mm (24h)
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
});

// Clear cached model in development
delete mongoose.models.RegisteredCandidate;

const RegisteredCandidate = mongoose.model("RegisteredCandidate", RegisteredCandidateSchema);
export default RegisteredCandidate;
