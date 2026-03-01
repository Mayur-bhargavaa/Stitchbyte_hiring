import mongoose from "mongoose";

const SettingsSchema = new mongoose.Schema({
    salaryFixed: { type: String, default: "₹5,000" },
    salaryIncentive: { type: String, default: "₹45,000" },
    holidays: [{
        name: { type: String },
        date: { type: String } // YYYY-MM-DD
    }],
    interviewSlots: [{ type: String }], // ["11:00", "12:00", ...]
    lunchBreak: { type: String, default: "13:00" },
    minimumScore: { type: Number, default: 60 },
    examEnabled: { type: Boolean, default: true },
    interviewDates: [{ type: String }], // ["2025-07-10", "2025-07-15", ...] admin-managed available interview dates
    lastUpdated: { type: Date, default: Date.now }
}, { timestamps: false });

// Force delete to prevent caching issues in development
if (mongoose.models.Settings) {
    delete mongoose.models.Settings;
}

const Settings = mongoose.model("Settings", SettingsSchema);
export default Settings;
