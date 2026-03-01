import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Candidate from "@/models/Candidate";
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

        // Basic stats
        const [total, qualified, rejected, booked, completed, noShow] = await Promise.all([
            Candidate.countDocuments(),
            Candidate.countDocuments({ qualificationStatus: "Qualified" }),
            Candidate.countDocuments({ qualificationStatus: "Not Qualified" }),
            Candidate.countDocuments({ interviewStatus: "Scheduled" }),
            Candidate.countDocuments({ interviewStatus: "Completed" }),
            Candidate.countDocuments({ interviewStatus: "No Show" }),
        ]);

        const conversionRate = total > 0 ? ((qualified / total) * 100).toFixed(1) : "0.0";
        const interviewRate = qualified > 0 ? ((booked / qualified) * 100).toFixed(1) : "0.0";

        // Score distribution
        const scoreDistribution = await Candidate.aggregate([
            {
                $bucket: {
                    groupBy: {
                        $multiply: [
                            { $divide: ["$quizScore", "$quizTotal"] },
                            100
                        ]
                    },
                    boundaries: [0, 20, 40, 60, 80, 100],
                    default: "Other",
                    output: {
                        count: { $sum: 1 }
                    }
                }
            }
        ]);

        // Daily applications (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const dailyApplications = await Candidate.aggregate([
            {
                $match: {
                    submissionDate: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$submissionDate" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Violation statistics
        const violationStats = await Candidate.aggregate([
            {
                $group: {
                    _id: null,
                    avgTabViolations: { $avg: "$tabViolations" },
                    maxTabViolations: { $max: "$tabViolations" },
                    avgCameraViolations: { $avg: "$cameraViolations" },
                    maxCameraViolations: { $max: "$cameraViolations" },
                    highViolators: {
                        $sum: {
                            $cond: [{ $gt: ["$tabViolations", 3] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        // Average quiz score
        const avgScore = await Candidate.aggregate([
            {
                $group: {
                    _id: null,
                    averageScore: {
                        $avg: {
                            $multiply: [
                                { $divide: ["$quizScore", "$quizTotal"] },
                                100
                            ]
                        }
                    }
                }
            }
        ]);

        return NextResponse.json({
            basic: {
                total,
                qualified,
                rejected,
                booked,
                completed,
                noShow,
                conversionRate,
                interviewRate,
            },
            scoreStats: {
                distribution: scoreDistribution,
                average: avgScore[0]?.averageScore?.toFixed(1) || "0.0",
            },
            violations: violationStats[0] || {},
            timeline: dailyApplications,
        });
    } catch (error) {
        console.error("Failed to fetch stats:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
