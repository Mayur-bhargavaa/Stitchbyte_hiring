import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Question from "@/models/Question";
import { quizQuestions } from "@/lib/questions";
import { verifyToken } from "@/lib/auth";
import AuditLog from "@/models/AuditLog";

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

        // Delete existing questions
        await Question.deleteMany({});

        // Transform and insert questions from lib/questions.ts
        const questionsToInsert = quizQuestions.map((q) => ({
            text: q.question,
            options: q.options,
            correctIndex: q.correctIndex,
            difficulty: "Medium", // Default difficulty
            category: "Sales", // Default category
        }));

        const questions = await Question.insertMany(questionsToInsert);

        // Log seed action
        await AuditLog.create({
            adminId: payload.userId,
            adminUsername: payload.username,
            action: "seeded_questions",
            targetType: "question",
            details: { count: questions.length },
            ipAddress: req.headers.get("x-forwarded-for") || "unknown",
            userAgent: req.headers.get("user-agent"),
        });

        return NextResponse.json({
            success: true,
            message: `Successfully seeded ${questions.length} questions`,
            count: questions.length,
        });
    } catch (error) {
        console.error("Seed questions error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
