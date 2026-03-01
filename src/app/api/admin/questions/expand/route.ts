import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Question from "@/models/Question";
import AuditLog from "@/models/AuditLog";
import { verifyToken } from "@/lib/auth";
import { quizQuestions } from "@/lib/questions";

const DIFFICULTY_LEVELS: Array<"Easy" | "Medium" | "Hard"> = ["Easy", "Medium", "Hard"];
const CATEGORIES = [
    "Cold Calling",
    "Objection Handling",
    "Lead Generation",
    "Sales Process",
    "CRM",
    "Negotiation",
    "Communication",
];

function buildExpandedQuestions(targetCount: number) {
    const generated: Array<{
        text: string;
        options: string[];
        correctIndex: number;
        difficulty: "Easy" | "Medium" | "Hard";
        category: string;
    }> = [];

    const seen = new Set<string>();

    for (const base of quizQuestions) {
        const key = base.question.trim().toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        generated.push({
            text: base.question,
            options: base.options,
            correctIndex: base.correctIndex,
            difficulty: "Medium",
            category: CATEGORIES[base.id % CATEGORIES.length],
        });
    }

    let variant = 1;
    while (generated.length < targetCount) {
        const source = quizQuestions[generated.length % quizQuestions.length];
        const category = CATEGORIES[generated.length % CATEGORIES.length];
        const difficulty = DIFFICULTY_LEVELS[generated.length % DIFFICULTY_LEVELS.length];

        const text = `${source.question} (Scenario ${variant})`;
        const key = text.trim().toLowerCase();

        if (!seen.has(key)) {
            seen.add(key);
            generated.push({
                text,
                options: source.options,
                correctIndex: source.correctIndex,
                difficulty,
                category,
            });
        }

        variant += 1;
    }

    return generated.slice(0, targetCount);
}

export async function POST(req: NextRequest) {
    try {
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

        const body = await req.json().catch(() => ({}));
        const requested = Number(body.targetCount);
        const targetCount = Number.isFinite(requested) && requested >= 50 ? Math.min(requested, 500) : 220;

        const currentCount = await Question.countDocuments();
        if (currentCount >= targetCount) {
            return NextResponse.json({
                success: true,
                message: "Question pool already meets requested size",
                count: currentCount,
                added: 0,
            });
        }

        const expansion = buildExpandedQuestions(targetCount);
        await Question.deleteMany({});
        const inserted = await Question.insertMany(expansion);

        await AuditLog.create({
            adminId: payload.userId,
            adminUsername: payload.username,
            action: "expanded_question_pool",
            targetType: "question",
            details: {
                previousCount: currentCount,
                newCount: inserted.length,
            },
            ipAddress: req.headers.get("x-forwarded-for") || "unknown",
            userAgent: req.headers.get("user-agent"),
        });

        return NextResponse.json({
            success: true,
            message: "Question pool expanded successfully",
            count: inserted.length,
            added: Math.max(0, inserted.length - currentCount),
        });
    } catch (error) {
        console.error("Expand question pool error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
