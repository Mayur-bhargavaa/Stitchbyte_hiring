import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import NotificationPreferences from "@/models/NotificationPreferences";
import { verifyToken } from "@/lib/auth";
import AuditLog from "@/models/AuditLog";

export async function GET(req: NextRequest) {
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

        let prefs = await NotificationPreferences.findOne({ settingId: "default" });
        
        if (!prefs) {
            // Create default preferences
            prefs = await NotificationPreferences.create({ settingId: "default" });
        }

        return NextResponse.json({ success: true, preferences: prefs });
    } catch (error) {
        console.error("Get notification preferences error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

        const body = await req.json();

        const prefs = await NotificationPreferences.findOneAndUpdate(
            { settingId: "default" },
            { ...body, lastUpdated: new Date() },
            { upsert: true, new: true }
        );

        // Log the action
        await AuditLog.create({
            adminId: payload.userId,
            adminUsername: payload.username,
            action: "updated_notification_preferences",
            targetType: "settings",
            details: body,
            ipAddress: req.headers.get("x-forwarded-for") || "unknown",
            userAgent: req.headers.get("user-agent"),
        });

        return NextResponse.json({ success: true, preferences: prefs });
    } catch (error) {
        console.error("Update notification preferences error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
