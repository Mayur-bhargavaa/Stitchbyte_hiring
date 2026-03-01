import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
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
        const format = url.searchParams.get("format");
        const status = url.searchParams.get("status");

        const query: Record<string, string> = {};
        if (status) query.qualificationStatus = status;

        const candidates = await Candidate.find(query).sort({ submissionDate: -1 });

        // Export as CSV
        if (format === "csv") {
            const csvHeader = "Candidate ID,Name,Email,Phone,Salary Comfort,Quiz Score,Quiz Total,Score %,Tab Violations,Camera Violations,Status,Interview Status,Interview Date,Interview Time,Submission Date\n";
            const csvRows = candidates.map(c => {
                const scorePercent = c.quizTotal > 0 ? Math.round((c.quizScore / c.quizTotal) * 100) : 0;
                return `${c.candidateId},"${c.name}","${c.email}","${c.phone}",${c.salaryComfort ? "Yes" : "No"},${c.quizScore},${c.quizTotal},${scorePercent}%,${c.tabViolations},${c.cameraViolations},"${c.qualificationStatus}","${c.interviewStatus || "Pending"}","${c.interviewDate || ""}","${c.interviewTime || ""}","${new Date(c.submissionDate).toISOString()}"`;
            }).join("\n");

            // Log export action
            await AuditLog.create({
                adminId: payload.userId,
                adminUsername: payload.username,
                action: "exported_candidates",
                details: { format: "csv", count: candidates.length, filter: status },
                ipAddress: req.headers.get("x-forwarded-for") || "unknown",
                userAgent: req.headers.get("user-agent"),
            });

            return new NextResponse(csvHeader + csvRows, {
                headers: {
                    "Content-Type": "text/csv",
                    "Content-Disposition": `attachment; filename="candidates_${new Date().toISOString().split('T')[0]}.csv"`,
                },
            });
        }

        // Log view action
        await AuditLog.create({
            adminId: payload.userId,
            adminUsername: payload.username,
            action: "viewed_candidates",
            details: { count: candidates.length, filter: status },
            ipAddress: req.headers.get("x-forwarded-for") || "unknown",
            userAgent: req.headers.get("user-agent"),
        });

        return NextResponse.json({
            success: true,
            candidates,
        });
    } catch (error) {
        console.error("Failed to fetch candidates:", error);
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
        const { action, candidateIds, updates } = body;

        if (action === "bulk_update" && candidateIds && updates) {
            // Bulk update candidates
            const result = await Candidate.updateMany(
                { candidateId: { $in: candidateIds } },
                { $set: updates }
            );

            // Log bulk action
            await AuditLog.create({
                adminId: payload.userId,
                adminUsername: payload.username,
                action: "bulk_update_candidates",
                details: { candidateIds, updates, modifiedCount: result.modifiedCount },
                ipAddress: req.headers.get("x-forwarded-for") || "unknown",
                userAgent: req.headers.get("user-agent"),
            });

            return NextResponse.json({
                success: true,
                modifiedCount: result.modifiedCount,
            });
        }

        if (action === "bulk_delete" && candidateIds) {
            // Bulk delete candidates
            const result = await Candidate.deleteMany({ candidateId: { $in: candidateIds } });

            // Log bulk delete
            await AuditLog.create({
                adminId: payload.userId,
                adminUsername: payload.username,
                action: "bulk_delete_candidates",
                details: { candidateIds, deletedCount: result.deletedCount },
                ipAddress: req.headers.get("x-forwarded-for") || "unknown",
                userAgent: req.headers.get("user-agent"),
            });

            return NextResponse.json({
                success: true,
                deletedCount: result.deletedCount,
            });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("Bulk operation error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
