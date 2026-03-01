import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Candidate from "@/models/Candidate";
import RegisteredCandidate from "@/models/RegisteredCandidate";
import Settings from "@/models/Settings";
import Question from "@/models/Question";
import { quizQuestions } from "@/lib/questions";
import { qualifyCandidate } from "@/lib/candidates";
import { shouldSendNotification } from "@/lib/mailer";
import { analyzePsychometric } from "@/lib/psychometric";

const CID_REGEX = /^SB-BDE-\d{4}$/;

interface GradingQuestion {
    id: number;
    question: string;
    options: string[];
    correctIndex: number;
    category?: string;
    difficulty?: "Easy" | "Medium" | "Hard";
}

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const body = await req.json();

        const {
            candidateId,
            name,
            email,
            phone,
            salaryComfort,
            answers,
            tabViolations,
            cameraViolations,
            referencePhoto,
            forceDisqualify,
            deviceFingerprint,
            timezone,
            examDuration,
            ipAddress,
        } = body;

        if (!candidateId || !CID_REGEX.test(candidateId)) {
            return NextResponse.json({ error: "Invalid Candidate ID format." }, { status: 400 });
        }

        if (!name || !email || !phone) {
            return NextResponse.json({ error: "Name, Email, and Phone are required." }, { status: 400 });
        }

        // Check exam is enabled globally
        const settings = await Settings.findOne({});
        if (settings && settings.examEnabled === false) {
            return NextResponse.json({ error: "Exam is currently unavailable." }, { status: 403 });
        }

        // Validate CID is pre-registered
        const registered = await RegisteredCandidate.findOne({ candidateId });
        if (!registered) {
            return NextResponse.json({ error: "This Candidate ID is not registered. Please contact admin." }, { status: 403 });
        }
        if (!registered.isActive) {
            return NextResponse.json({ error: "This Candidate ID has been deactivated." }, { status: 403 });
        }

        // Check test window
        const now = new Date();
        const startDateTime = new Date(`${registered.testStartDate}T${registered.testStartTime || "00:00"}:00`);
        const endDateTime = new Date(`${registered.testEndDate}T${registered.testEndTime || "23:59"}:00`);
        if (now < startDateTime) {
            return NextResponse.json({ error: `Your test window hasn't started yet. It opens on ${registered.testStartDate}.` }, { status: 403 });
        }
        if (now > endDateTime) {
            return NextResponse.json({ error: `Your test window has expired (${registered.testEndDate}).` }, { status: 403 });
        }

        // Check if candidate already applied
        const existing = await Candidate.findOne({ candidateId });
        if (existing) {
            return NextResponse.json({ error: "Candidate has already applied." }, { status: 400 });
        }

        if (deviceFingerprint) {
            const duplicateDevice = await Candidate.findOne({ deviceFingerprint });
            if (duplicateDevice) {
                console.warn(`⚠️  Duplicate device detected: ${candidateId} matches ${duplicateDevice.candidateId}`);
            }
        }

        let questionsToGrade: GradingQuestion[] = quizQuestions.map((q) => ({
            id: q.id,
            question: q.question,
            options: q.options,
            correctIndex: q.correctIndex,
            category: "Sales",
            difficulty: "Medium",
        }));
        try {
            const dbQuestions = await Question.find({});
            if (dbQuestions.length > 0) {
                questionsToGrade = dbQuestions.map((q: { text: string; options: string[]; correctIndex: number; category?: string; difficulty?: "Easy" | "Medium" | "Hard" }, index: number) => ({
                    id: index + 1,
                    question: q.text,
                    options: q.options,
                    correctIndex: q.correctIndex,
                    category: q.category || "Sales",
                    difficulty: q.difficulty || "Medium",
                }));
            }
        } catch {
            console.warn("Failed to fetch questions from DB, using fallback");
        }

        let quizScore = 0;
        const quizTotal = questionsToGrade.length;

        // answers is now { questionId: selectedShuffledOptionIndex }
        // We need to validate using the original question data
        if (answers && typeof answers === "object") {
            try {
                const dbQuestionsMap = new Map();
                const dbQuestions = await Question.find({});
                dbQuestions.forEach((q: { _id: { toString: () => string }; correctIndex: number }) => {
                    dbQuestionsMap.set(q._id.toString(), q.correctIndex);
                });

                // Count correct answers
                for (const [questionId, selectedOptionIndex] of Object.entries(answers)) {
                    const correctIndex = dbQuestionsMap.get(questionId);
                    if (correctIndex !== undefined && selectedOptionIndex === correctIndex) {
                        quizScore++;
                    }
                }
            } catch (err) {
                console.error("Error validating answers:", err);
                // Fallback to static questions validation
                for (const q of questionsToGrade) {
                    if (answers[q.id] === q.correctIndex) {
                        quizScore++;
                    }
                }
            }
        }

        const isSalaryComfort = salaryComfort === true || salaryComfort === "true";

        const qualification = qualifyCandidate({
            salaryComfort: isSalaryComfort,
            quizScore,
            quizTotal,
            tabViolations: Number(tabViolations) || 0,
        });
        let qualified = qualification.qualified;
        const scorePercent = qualification.scorePercent;

        if (forceDisqualify) {
            qualified = false;
        }

        const psychometricProfile = analyzePsychometric({
            answers: answers || {},
            questions: questionsToGrade,
            examDuration: Number(examDuration) || undefined,
            tabViolations: Number(tabViolations) || 0,
            cameraViolations: Number(cameraViolations) || 0,
        });

        const candidate = await Candidate.create({
            candidateId,
            name,
            email,
            phone,
            salaryComfort: isSalaryComfort,
            quizScore,
            quizTotal,
            tabViolations: Number(tabViolations) || 0,
            cameraViolations: Number(cameraViolations) || 0,
            referencePhoto,
            qualificationStatus: qualified ? "Qualified" : "Not Qualified",
            deviceFingerprint,
            timezone,
            examDuration,
            ipAddress: ipAddress || req.headers.get("x-forwarded-for") || "unknown",
            userAgent: req.headers.get("user-agent"),
            psychometricProfile,
            lockdownViolations: Number(tabViolations) || 0,
            biometricVerified: Number(cameraViolations) <= 2,
            biometricScore: Math.max(0, 100 - (Number(cameraViolations) || 0) * 15),
        });

        // Fire email asynchronously (non-blocking) based on qualification status
        if (qualified && await shouldSendNotification("qualification")) {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
            const bookingUrl = `${baseUrl}/book?cid=${candidateId}`;

            import("@/lib/mailer").then(({ sendQualificationEmail }) => {
                sendQualificationEmail(email, name, candidateId, bookingUrl);
            }).catch(err => console.error("Email import error:", err));
        } else if (!qualified && await shouldSendNotification("rejection")) {
            // Send Rejection Email
            import("@/lib/mailer").then(({ sendRejectionEmail }) => {
                sendRejectionEmail(email, name);
            }).catch(err => console.error("Email import error:", err));
        }

        return NextResponse.json({
            success: true,
            qualified,
            quizScore,
            quizTotal,
            scorePercent,
            tabViolations: candidate.tabViolations,
            cameraViolations: candidate.cameraViolations,
            psychometricProfile,
            candidate: {
                candidateId: candidate.candidateId,
                name: candidate.name,
                qualificationStatus: candidate.qualificationStatus,
            },
        });
    } catch (err: unknown) {
        console.error("Apply API error:", err);
        // Unique constraint error (11000) check
        if (typeof err === "object" && err !== null && "code" in err && (err as { code?: number }).code === 11000) {
            return NextResponse.json({ error: "Candidate has already applied." }, { status: 400 });
        }
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}
