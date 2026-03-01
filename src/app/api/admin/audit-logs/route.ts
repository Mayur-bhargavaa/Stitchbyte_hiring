import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import AuditLog from "@/models/AuditLog";
import { verifyToken } from "@/lib/auth";

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

        // Get query parameters
        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const action = url.searchParams.get("action");
        const adminId = url.searchParams.get("adminId");

        const query: Record<string, string> = {};
        if (action) query.action = action;
        if (adminId) query.adminId = adminId;

        const logs = await AuditLog.find(query)
            .sort({ timestamp: -1 })
            .limit(limit);

        return NextResponse.json({ success: true, logs });
    } catch (error) {
        console.error("Audit logs error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
