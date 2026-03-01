import mongoose from "mongoose";

const NotificationPreferencesSchema = new mongoose.Schema({
    settingId: { type: String, default: "default", unique: true },
    
    // Email toggles
    sendQualificationEmail: { type: Boolean, default: true },
    sendRejectionEmail: { type: Boolean, default: true },
    sendBookingConfirmationEmail: { type: Boolean, default: true },
    sendInterviewReminderEmail: { type: Boolean, default: true },
    
    // Reminder timing
    reminderHoursBefore: { type: Number, default: 24 }, // Send reminder 24 hours before interview
    
    // Admin notifications
    notifyAdminOnNewApplication: { type: Boolean, default: false },
    notifyAdminOnQualified: { type: Boolean, default: false },
    adminEmail: { type: String, default: "info@stitchbyte.in" },
    
    // Email queue settings
    enableEmailQueue: { type: Boolean, default: true },
    maxEmailsPerMinute: { type: Number, default: 10 },
    
    lastUpdated: { type: Date, default: Date.now }
});

const NotificationPreferences = mongoose.models.NotificationPreferences || 
    mongoose.model("NotificationPreferences", NotificationPreferencesSchema);

export default NotificationPreferences;
