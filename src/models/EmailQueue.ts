import mongoose from "mongoose";

const EmailQueueSchema = new mongoose.Schema({
    to: { type: String, required: true },
    subject: { type: String, required: true },
    html: { type: String, required: true },
    type: { 
        type: String, 
        required: true,
        enum: ["qualification", "rejection", "booking_confirmation", "interview_reminder", "custom"]
    },
    status: { 
        type: String, 
        required: true, 
        default: "pending",
        enum: ["pending", "sending", "sent", "failed", "cancelled"]
    },
    candidateId: { type: String },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    error: { type: String },
    scheduledAt: { type: Date },
    sentAt: { type: Date },
    createdAt: { type: Date, default: Date.now, index: true },
});

const EmailQueue = mongoose.models.EmailQueue || mongoose.model("EmailQueue", EmailQueueSchema);
export default EmailQueue;
