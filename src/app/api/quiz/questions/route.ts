import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Question from "@/models/Question";

/**
 * Public endpoint for fetching quiz questions
 * Returns randomized questions for candidates
 */
export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        const url = new URL(req.url);
        const count = parseInt(url.searchParams.get("count") || "30");
        const category = url.searchParams.get("category");

        const query: Record<string, string> = {};
        if (category) query.category = category;

        // Get random questions from database
        const questions = await Question.aggregate([
            { $match: query },
            { $sample: { size: count } }
        ]);

        // Transform to client format (without correct answers)
        const clientQuestions = questions.map((q, index) => ({
            _id: q._id,
            id: index + 1,
            text: q.text,
            options: q.options,
            difficulty: q.difficulty,
            category: q.category,
        }));

        return NextResponse.json({
            success: true,
            questions: clientQuestions,
            total: clientQuestions.length,
        });
    } catch (error) {
        console.error("Fetch quiz questions error:", error);
        // Fallback to static questions if database fails
        const { quizQuestions } = await import("@/lib/questions");
        return NextResponse.json({
            success: true,
            questions: quizQuestions,
            total: quizQuestions.length,
            fallback: true,
        });
    }
}
