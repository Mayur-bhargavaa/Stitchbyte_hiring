import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Candidate from "@/models/Candidate";
import { verifyToken } from "@/lib/auth";
import AuditLog from "@/models/AuditLog";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ cid: string }> }
) {
    try {
        const { cid } = await context.params;

        if (!cid) {
            return NextResponse.json({ error: "Missing CID" }, { status: 400 });
        }

        await dbConnect();
        const candidate = await Candidate.findOne({ candidateId: cid });

        if (!candidate) {
            return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
        }

        // Check if admin is accessing (full data) or candidate (limited data)
        const authHeader = req.headers.get("authorization");
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.substring(7);
            const payload = verifyToken(token);
            if (payload) {
                // Admin access - return full data
                return NextResponse.json(candidate);
            }
        }

        // Public/Candidate access - return limited data
        return NextResponse.json({
            candidateId: candidate.candidateId,
            name: candidate.name,
            email: candidate.email,
            qualificationStatus: candidate.qualificationStatus,
            interviewDate: candidate.interviewDate,
            interviewTime: candidate.interviewTime,
            meetingLink: candidate.meetingLink,
            interviewStatus: candidate.interviewStatus,
        });
    } catch (error) {
        console.error("Failed to fetch candidate status:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ cid: string }> }
) {
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

        const { cid } = await context.params;
        const updates = await req.json();

        await dbConnect();

        const candidate = await Candidate.findOneAndUpdate(
            { candidateId: cid },
            { $set: updates },
            { new: true }
        );

        if (!candidate) {
            return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
        }

        // Log update action
        await AuditLog.create({
            adminId: payload.userId,
            adminUsername: payload.username,
            action: "updated_candidate",
            targetType: "candidate",
            targetId: cid,
            details: updates,
            ipAddress: req.headers.get("x-forwarded-for") || "unknown",
            userAgent: req.headers.get("user-agent"),
        });

        return NextResponse.json({ success: true, candidate });
    } catch (error) {
        console.error("Failed to update candidate:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ cid: string }> }
) {
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

        const { cid } = await context.params;

        await dbConnect();

        const candidate = await Candidate.findOneAndDelete({ candidateId: cid });

        if (!candidate) {
            return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
        }

        // Log delete action
        await AuditLog.create({
            adminId: payload.userId,
            adminUsername: payload.username,
            action: "deleted_candidate",
            targetType: "candidate",
            targetId: cid,
            details: { name: candidate.name, email: candidate.email },
            ipAddress: req.headers.get("x-forwarded-for") || "unknown",
            userAgent: req.headers.get("user-agent"),
        });

        return NextResponse.json({ success: true, message: "Candidate deleted" });
    } catch (error) {
        console.error("Failed to delete candidate:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
