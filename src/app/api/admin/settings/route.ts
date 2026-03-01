import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Settings from "@/models/Settings";
import { verifyToken } from "@/lib/auth";
import AuditLog from "@/models/AuditLog";

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        let settings = await Settings.findOne({});
        console.log("Settings fetched from DB:", settings);
        
        if (!settings) {
            // Initialize defaults if not exists
            settings = await Settings.create({
                salaryFixed: "₹5,000",
                salaryIncentive: "₹45,000",
                interviewSlots: [],
                interviewDates: [],
                examEnabled: true,
            });
            console.log("Settings created with defaults:", settings);
        }
        
        return NextResponse.json({ success: true, settings });
    } catch (error) {
        console.error("Settings GET error:", error);
        return NextResponse.json({ error: "Failed to fetch settings", details: String(error) }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        // Verify admin token
        const authHeader = req.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const payload = verifyToken(token);
        if (!payload) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        await dbConnect();
        let body = await req.json();
        console.log("Settings POST body received:", body);

        // Remove MongoDB metadata fields before updating
        const { _id, __v, createdAt, ...updateData } = body;
        updateData.lastUpdated = new Date();

        let settings = await Settings.findOne({});
        if (settings) {
            settings = await Settings.findByIdAndUpdate(
                settings._id,
                updateData,
                { returnDocument: "after" }
            );
            console.log("Settings updated:", settings);
        } else {
            settings = await Settings.create(updateData);
            console.log("Settings created:", settings);
        }

        // Log settings update
        try {
            await AuditLog.create({
                adminId: payload.userId,
                adminUsername: payload.username,
                action: "updated_settings",
                targetType: "settings",
                details: updateData,
                ipAddress: req.headers.get("x-forwarded-for") || "unknown",
                userAgent: req.headers.get("user-agent"),
            });
        } catch (auditErr) {
            console.error("Audit log error:", auditErr);
        }

        return NextResponse.json({ success: true, settings });
    } catch (error) {
        console.error("Settings POST error:", error);
        return NextResponse.json({ error: "Failed to update settings", details: String(error) }, { status: 500 });
    }
}
