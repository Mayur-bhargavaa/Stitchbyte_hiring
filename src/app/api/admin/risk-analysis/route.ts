import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Candidate from "@/models/Candidate";
import { verifyToken } from "@/lib/auth";
import ExamSession from "@/models/ExamSession";
import Question from "@/models/Question";

/**
 * Get exam risk analysis for serious hiring
 */
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

        // Calculate risk metrics
        const totalCandidates = await Candidate.countDocuments();
        const highTabViolations = await Candidate.countDocuments({ tabViolations: { $gt: 3 } });
        const highCameraViolations = await Candidate.countDocuments({ cameraViolations: { $gt: 2 } });
        const sameDeviceCandidates = await Candidate.aggregate([
            {
                $match: {
                    deviceFingerprint: { $exists: true, $ne: null }
                }
            },
            {
                $group: {
                    _id: "$deviceFingerprint",
                    count: { $sum: 1 },
                    candidates: { $push: "$candidateId" }
                }
            },
            {
                $match: {
                    count: { $gt: 1 }
                }
            }
        ]);

        const suspiciousQualified = await Candidate.countDocuments({
            qualificationStatus: "Qualified",
            $or: [
                { tabViolations: { $gt: 3 } },
                { cameraViolations: { $gt: 2 } }
            ]
        });

        const totalSessions = await ExamSession.countDocuments();
        const serverTimerSessions = await ExamSession.countDocuments({
            durationSeconds: { $exists: true },
            expiresAt: { $exists: true },
        });
        const aiVerifiedSessions = await ExamSession.countDocuments({ aiVerificationStatus: "verified" });
        const lockdownSessions = await ExamSession.countDocuments({ "lockdownEvents.0": { $exists: true } });
        const screenRecordingSignals = await ExamSession.countDocuments({ "screenRecordingFlags.0": { $exists: true } });

        const biometricVerifiedCandidates = await Candidate.countDocuments({ biometricVerified: true });
        const questionPoolSize = await Question.countDocuments();
        const psychometricCandidates = await Candidate.countDocuments({ psychometricProfile: { $exists: true } });

        const sessionSafeDenominator = totalSessions || 1;
        const candidateSafeDenominator = totalCandidates || 1;

        const phase2Progress = {
            serverSideTimer: Math.round((serverTimerSessions / sessionSafeDenominator) * 100),
            aiFaceVerification: Math.round((aiVerifiedSessions / sessionSafeDenominator) * 100),
            browserLockdownMode: Math.round((lockdownSessions / sessionSafeDenominator) * 100),
            screenRecordingDetection: Math.round((screenRecordingSignals / sessionSafeDenominator) * 100),
            biometricVerification: Math.round((biometricVerifiedCandidates / candidateSafeDenominator) * 100),
            questionPoolExpansion: questionPoolSize,
            psychometricAnalysis: Math.round((psychometricCandidates / candidateSafeDenominator) * 100),
        };

        const phase2Recommended = [
            `Server-side timer (${phase2Progress.serverSideTimer}% coverage)`,
            `AI face verification (${phase2Progress.aiFaceVerification}% verified sessions)`,
            `Browser lockdown mode (${phase2Progress.browserLockdownMode}% monitored sessions)`,
            `Screen recording detection (${phase2Progress.screenRecordingDetection}% signal coverage)`,
            `Biometric verification (${phase2Progress.biometricVerification}% candidates verified)`,
            `Question pool expansion (${phase2Progress.questionPoolExpansion} questions available)`,
            `Psychometric analysis (${phase2Progress.psychometricAnalysis}% candidate coverage)`,
        ];

        const risks = [
            {
                category: "Exam Integrity",
                level: highTabViolations > totalCandidates * 0.2 ? "HIGH" : "MEDIUM",
                issue: "High tab switching violations",
                impact: `${highTabViolations} candidates with >3 tab violations`,
                recommendation: "Enable stricter tab monitoring and auto-termination after 3 violations",
            },
            {
                category: "Identity Fraud",
                level: sameDeviceCandidates.length > 0 ? "HIGH" : "LOW",
                issue: "Multiple candidates from same device",
                impact: `${sameDeviceCandidates.length} device fingerprints used by multiple candidates`,
                recommendation: "Flag and manually review duplicate device applications",
            },
            {
                category: "Proctoring Gaps",
                level: highCameraViolations > totalCandidates * 0.15 ? "HIGH" : "MEDIUM",
                issue: "Camera monitoring violations",
                impact: `${highCameraViolations} candidates with >2 camera violations`,
                recommendation: "Implement face matching and multiple face detection",
            },
            {
                category: "Selection Accuracy",
                level: suspiciousQualified > 0 ? "HIGH" : "LOW",
                issue: "Suspicious candidates still qualifying",
                impact: `${suspiciousQualified} qualified candidates had major violations`,
                recommendation: "Include violation penalties in qualification scoring",
            },
            {
                category: "System Reliability",
                level: "MEDIUM",
                issue: "No exam session recovery",
                impact: "Candidates may lose progress on network/browser issues",
                recommendation: "Implement auto-save every 10 seconds and session resume",
            },
            {
                category: "Question Security",
                level: "HIGH",
                issue: "Question leakage risk",
                impact: "Same questions can be shared between candidates",
                recommendation: "Use random question pool with 200+ questions",
            },
            {
                category: "Time Manipulation",
                level: "MEDIUM",
                issue: "Client-side timer vulnerability",
                impact: "Candidates could potentially manipulate local timer",
                recommendation: "Implement server-side authoritative timer",
            },
            {
                category: "Environment Control",
                level: "MEDIUM",
                issue: "No VM/multi-monitor detection",
                impact: "Candidates can use external aids",
                recommendation: "Add VM detection, fullscreen lock, and monitor checks",
            },
        ];

        return NextResponse.json({
            success: true,
            summary: {
                totalCandidates,
                highRiskCandidates: highTabViolations + highCameraViolations,
                duplicateDevices: sameDeviceCandidates.length,
                suspiciousQualified,
            },
            risks,
            phase1Implemented: [
                "Device fingerprinting",
                "Exam session tracking",
                "Violation logging",
                "Question randomization support",
                "Duplicate detection",
                "Audit logging",
                "Enhanced analytics",
            ],
            phase2Recommended,
            phase2Progress,
        });
    } catch (error) {
        console.error("Risk analysis error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
