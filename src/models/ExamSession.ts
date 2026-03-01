import mongoose from "mongoose";

const ExamSessionSchema = new mongoose.Schema({
    candidateId: { type: String, required: true, index: true },
    
    // Device & Network Info
    ipAddress: { type: String },
    userAgent: { type: String },
    deviceFingerprint: { type: String },
    timezone: { type: String },
    screenResolution: { type: String },
    
    // Session tracking
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    duration: { type: Number }, // in seconds
    durationSeconds: { type: Number, default: 1800 },
    expiresAt: { type: Date, index: true },
    terminatedReason: { type: String },
    
    // Progress tracking
    currentQuestionIndex: { type: Number, default: 0 },
    answers: { type: Map, of: Number }, // questionId -> selectedIndex
    
    // Violation tracking
    tabSwitches: [{
        timestamp: { type: Date },
        action: { type: String } // "blur", "visibility_change"
    }],
    cameraViolations: [{
        timestamp: { type: Date },
        reason: { type: String } // "no_face", "multiple_faces", "face_changed"
    }],
    suspiciousActivities: [{
        timestamp: { type: Date },
        type: { type: String }, // "copy_paste", "screenshot", "right_click", "devtools"
        details: { type: String }
    }],

    lockdownEvents: [{
        timestamp: { type: Date, default: Date.now },
        fullscreen: { type: Boolean },
        visibilityState: { type: String },
        devtoolsDetected: { type: Boolean },
        blockedShortcuts: { type: Boolean },
        clipboardBlocked: { type: Boolean },
        reason: { type: String },
    }],
    screenRecordingFlags: [{
        timestamp: { type: Date, default: Date.now },
        suspected: { type: Boolean, default: false },
        method: { type: String },
        reason: { type: String },
    }],
    
    // Proctoring data
    faceSnapshots: [{ type: String }], // Base64 images taken during exam
    referenceFaceDescriptor: [{ type: Number }],
    latestFaceDescriptor: [{ type: Number }],
    aiVerificationStatus: {
        type: String,
        default: "pending",
        enum: ["pending", "verified", "mismatch"],
    },
    biometricChecks: [{
        timestamp: { type: Date, default: Date.now },
        similarityScore: { type: Number },
        matched: { type: Boolean },
        source: { type: String },
    }],
    keystrokePattern: { type: mongoose.Schema.Types.Mixed },
    
    // Status
    status: { 
        type: String, 
        default: "in_progress",
        enum: ["in_progress", "completed", "terminated", "expired"]
    },
    
    // Metadata
    createdAt: { type: Date, default: Date.now, index: true },
});

const ExamSession = mongoose.models.ExamSession || mongoose.model("ExamSession", ExamSessionSchema);
export default ExamSession;
