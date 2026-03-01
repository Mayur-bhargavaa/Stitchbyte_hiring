import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema({
    adminId: { type: String, required: true },
    adminUsername: { type: String, required: true },
    action: { type: String, required: true }, // e.g., "viewed_candidate", "updated_settings", "exported_data"
    targetType: { type: String }, // e.g., "candidate", "settings", "question"
    targetId: { type: String },
    details: { type: mongoose.Schema.Types.Mixed }, // Additional context
    ipAddress: { type: String },
    userAgent: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
});

const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);
export default AuditLog;
