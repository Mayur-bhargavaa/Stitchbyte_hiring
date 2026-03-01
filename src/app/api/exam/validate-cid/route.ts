import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import RegisteredCandidate from "@/models/RegisteredCandidate";
import Settings from "@/models/Settings";

// Public API - validates a CID before allowing exam access
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const candidateId = searchParams.get("cid");

        if (!candidateId || !/^SB-BDE-\d{4}$/.test(candidateId)) {
            return NextResponse.json({ valid: false, error: "Invalid CID format." });
        }

        await dbConnect();

        // Check exam is enabled globally
        const settings = await Settings.findOne({});
        if (settings && settings.examEnabled === false) {
            return NextResponse.json({ valid: false, error: "Exam is currently unavailable." });
        }

        // Check CID is pre-registered
        const registered = await RegisteredCandidate.findOne({ candidateId });
        if (!registered) {
            return NextResponse.json({ valid: false, error: "This Candidate ID is not registered. Please contact admin." });
        }

        if (!registered.isActive) {
            return NextResponse.json({ valid: false, error: "This Candidate ID has been deactivated." });
        }

        // Check test window
        const now = new Date();
        const startDateTime = new Date(`${registered.testStartDate}T${registered.testStartTime || "00:00"}:00`);
        const endDateTime = new Date(`${registered.testEndDate}T${registered.testEndTime || "23:59"}:00`);

        if (now < startDateTime) {
            return NextResponse.json({
                valid: false,
                error: `Your test window has not started yet. It opens on ${registered.testStartDate} at ${registered.testStartTime || "00:00"}.`,
            });
        }

        if (now > endDateTime) {
            return NextResponse.json({
                valid: false,
                error: `Your test window has expired. It closed on ${registered.testEndDate} at ${registered.testEndTime || "23:59"}.`,
            });
        }

        return NextResponse.json({
            valid: true,
            candidateName: registered.candidateName,
            email: registered.email,
        });
    } catch (error) {
        console.error("CID validation error:", error);
        return NextResponse.json({ valid: false, error: "Validation failed. Please try again." });
    }
}
