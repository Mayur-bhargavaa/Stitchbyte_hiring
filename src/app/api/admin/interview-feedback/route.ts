import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import InterviewFeedback from "@/models/InterviewFeedback";
import Candidate from "@/models/Candidate";
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

        const url = new URL(req.url);
        const candidateId = url.searchParams.get("candidateId");

        const query: Record<string, string> = {};
        if (candidateId) query.candidateId = candidateId;

        const feedbacks = await InterviewFeedback.find(query).sort({ createdAt: -1 });

        return NextResponse.json({ success: true, feedbacks });
    } catch (error) {
        console.error("Fetch feedback error:", error);
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
        const feedback = await InterviewFeedback.create(body);

        // Update candidate interview status to "Completed"
        await Candidate.findOneAndUpdate(
            { candidateId: body.candidateId },
            { 
                interviewStatus: "Completed",
                notes: `Interview completed. Recommendation: ${body.recommendation}`,
            }
        );

        // Log feedback submission
        await AuditLog.create({
            adminId: payload.userId,
            adminUsername: payload.username,
            action: "submitted_interview_feedback",
            targetType: "candidate",
            targetId: body.candidateId,
            details: { recommendation: body.recommendation, overallRating: body.overallRating },
            ipAddress: req.headers.get("x-forwarded-for") || "unknown",
            userAgent: req.headers.get("user-agent"),
        });

        return NextResponse.json({ success: true, feedback });
    } catch (error) {
        console.error("Submit feedback error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
