import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Question from "@/models/Question";
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
        const questions = await Question.find({}).sort({ createdAt: 1 });
        return NextResponse.json({ success: true, questions });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
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

        if (Array.isArray(body)) {
            // Bulk insert/seeding
            await Question.deleteMany({}); // Reset for seeding if needed or handle logic
            const questions = await Question.insertMany(body);

            // Log bulk action
            await AuditLog.create({
                adminId: payload.userId,
                adminUsername: payload.username,
                action: "bulk_create_questions",
                targetType: "question",
                details: { count: questions.length },
                ipAddress: req.headers.get("x-forwarded-for") || "unknown",
                userAgent: req.headers.get("user-agent"),
            });

            return NextResponse.json({ success: true, questions });
        }

        const question = await Question.create(body);

        // Log single question creation
        await AuditLog.create({
            adminId: payload.userId,
            adminUsername: payload.username,
            action: "created_question",
            targetType: "question",
            targetId: question._id.toString(),
            details: { text: question.text },
            ipAddress: req.headers.get("x-forwarded-for") || "unknown",
            userAgent: req.headers.get("user-agent"),
        });

        return NextResponse.json({ success: true, question });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create question" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
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
        const { questionId } = await req.json();

        const question = await Question.findByIdAndDelete(questionId);

        if (!question) {
            return NextResponse.json({ error: "Question not found" }, { status: 404 });
        }

        // Log deletion
        await AuditLog.create({
            adminId: payload.userId,
            adminUsername: payload.username,
            action: "deleted_question",
            targetType: "question",
            targetId: questionId,
            details: { text: question.text },
            ipAddress: req.headers.get("x-forwarded-for") || "unknown",
            userAgent: req.headers.get("user-agent"),
        });

        return NextResponse.json({ success: true, message: "Question deleted" });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete question" }, { status: 500 });
    }
}
