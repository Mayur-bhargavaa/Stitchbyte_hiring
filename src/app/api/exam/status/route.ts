import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Settings from "@/models/Settings";

// Public API - no auth required
// Returns whether the exam is currently enabled
export async function GET() {
    try {
        await dbConnect();
        const settings = await Settings.findOne({});
        const examEnabled = settings?.examEnabled !== false; // default true

        return NextResponse.json({
            success: true,
            examEnabled,
        });
    } catch (error) {
        console.error("Exam status error:", error);
        return NextResponse.json({ success: true, examEnabled: true }); // fail-open
    }
}
