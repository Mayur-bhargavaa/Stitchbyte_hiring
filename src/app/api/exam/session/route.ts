import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import ExamSession from "@/models/ExamSession";

type SessionDoc = {
    _id: string;
    status: "in_progress" | "completed" | "terminated" | "expired";
    startedAt: Date;
    expiresAt?: Date;
    durationSeconds?: number;
};

function getClientIp(req: NextRequest): string {
    return req.headers.get("x-client-ip") || req.headers.get("x-forwarded-for") || "unknown";
}

function getRemainingSeconds(session: SessionDoc): number {
    const now = Date.now();
    const expiry = session.expiresAt ? new Date(session.expiresAt).getTime() : 0;

    if (!expiry) {
        const fallbackDuration = (session.durationSeconds || 1800) * 1000;
        const started = new Date(session.startedAt).getTime();
        return Math.max(0, Math.floor((started + fallbackDuration - now) / 1000));
    }

    return Math.max(0, Math.floor((expiry - now) / 1000));
}

function cosineSimilarity(a: number[], b: number[]): number {
    if (!a.length || !b.length || a.length !== b.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Start or resume an exam session
 */
export async function POST(req: NextRequest) {
    try {
        await dbConnect();

        const body = await req.json();
        const { candidateId, action } = body;

        if (!candidateId || typeof candidateId !== "string") {
            return NextResponse.json({ error: "Candidate ID required" }, { status: 400 });
        }

        if (action === "start") {
            const requestedDuration = Number(body.durationSeconds);
            const durationSeconds = Number.isFinite(requestedDuration) && requestedDuration > 0
                ? Math.min(requestedDuration, 3 * 60 * 60)
                : 1800;

            // Check for existing session
            const existing = await ExamSession.findOne({
                candidateId,
                status: "in_progress"
            });

            if (existing) {
                const remainingSeconds = getRemainingSeconds(existing as SessionDoc);

                if (remainingSeconds <= 0) {
                    await ExamSession.findByIdAndUpdate(existing._id, {
                        $set: {
                            status: "expired",
                            terminatedReason: "server_timer_expired",
                            completedAt: new Date(),
                        }
                    });

                    return NextResponse.json({
                        success: false,
                        expired: true,
                        error: "Session expired",
                    }, { status: 410 });
                }

                return NextResponse.json({
                    success: true,
                    session: existing,
                    resumed: true,
                    remainingSeconds,
                });
            }

            const now = Date.now();

            // Create new session
            const session = await ExamSession.create({
                candidateId,
                ipAddress: getClientIp(req),
                userAgent: req.headers.get("user-agent"),
                deviceFingerprint: body.deviceFingerprint,
                timezone: body.timezone,
                screenResolution: body.screenResolution,
                durationSeconds,
                startedAt: new Date(now),
                expiresAt: new Date(now + durationSeconds * 1000),
                referenceFaceDescriptor: Array.isArray(body.referenceFaceDescriptor)
                    ? body.referenceFaceDescriptor.filter((v: unknown) => typeof v === "number")
                    : undefined,
            });

            return NextResponse.json({
                success: true,
                session,
                resumed: false,
                remainingSeconds: durationSeconds,
            });
        }

        if (action === "heartbeat") {
            const session = await ExamSession.findOne({ candidateId, status: "in_progress" });
            if (!session) {
                return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
            }

            const remainingSeconds = getRemainingSeconds(session as SessionDoc);
            if (remainingSeconds <= 0) {
                await ExamSession.findByIdAndUpdate(session._id, {
                    $set: {
                        status: "expired",
                        terminatedReason: "server_timer_expired",
                        completedAt: new Date(),
                    }
                });

                return NextResponse.json({ success: false, expired: true, remainingSeconds: 0 }, { status: 410 });
            }

            return NextResponse.json({ success: true, remainingSeconds });
        }

        if (action === "update") {
            // Update session progress
            const { currentQuestionIndex, answers } = body;

            const session = await ExamSession.findOne({ candidateId, status: "in_progress" });
            if (!session) {
                return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
            }

            const remainingSeconds = getRemainingSeconds(session as SessionDoc);
            if (remainingSeconds <= 0) {
                await ExamSession.findByIdAndUpdate(session._id, {
                    $set: {
                        status: "expired",
                        terminatedReason: "server_timer_expired",
                        completedAt: new Date(),
                    }
                });

                return NextResponse.json({ success: false, expired: true, error: "Session expired" }, { status: 410 });
            }

            const updatedSession = await ExamSession.findByIdAndUpdate(
                session._id,
                {
                    $set: {
                        currentQuestionIndex,
                        answers: new Map(Object.entries(answers || {})),
                    }
                },
                { new: true }
            );

            return NextResponse.json({ success: true, session: updatedSession, remainingSeconds });
        }

        if (action === "complete") {
            const session = await ExamSession.findOne({ candidateId, status: "in_progress" });
            if (!session) {
                return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
            }

            const remainingSeconds = getRemainingSeconds(session as SessionDoc);
            if (remainingSeconds <= 0) {
                await ExamSession.findByIdAndUpdate(session._id, {
                    $set: {
                        status: "expired",
                        terminatedReason: "server_timer_expired",
                        completedAt: new Date(),
                    }
                });
                return NextResponse.json({ success: false, expired: true, error: "Session expired" }, { status: 410 });
            }

            const now = Date.now();
            const startedAt = new Date(session.startedAt).getTime();
            const serverDuration = Math.max(0, Math.floor((now - startedAt) / 1000));

            const completed = await ExamSession.findByIdAndUpdate(
                session._id,
                {
                    $set: {
                        status: "completed",
                        completedAt: new Date(now),
                        duration: serverDuration,
                    }
                },
                { new: true }
            );

            return NextResponse.json({ success: true, session: completed, duration: serverDuration });
        }

        if (action === "violation") {
            // Log violation
            const { type, reason, details } = body;

            const update: Record<string, unknown> = {};
            if (type === "tab") {
                update.$push = {
                    tabSwitches: {
                        timestamp: new Date(),
                        action: reason,
                    }
                };
            } else if (type === "camera") {
                update.$push = {
                    cameraViolations: {
                        timestamp: new Date(),
                        reason,
                    }
                };
            } else if (type === "suspicious") {
                update.$push = {
                    suspiciousActivities: {
                        timestamp: new Date(),
                        type: reason,
                        details,
                    }
                };
            }

            await ExamSession.findOneAndUpdate(
                { candidateId, status: "in_progress" },
                update
            );

            return NextResponse.json({ success: true });
        }

        if (action === "lockdown") {
            const payload = {
                fullscreen: Boolean(body.fullscreen),
                visibilityState: typeof body.visibilityState === "string" ? body.visibilityState : "unknown",
                devtoolsDetected: Boolean(body.devtoolsDetected),
                blockedShortcuts: Boolean(body.blockedShortcuts),
                clipboardBlocked: Boolean(body.clipboardBlocked),
                reason: typeof body.reason === "string" ? body.reason : undefined,
            };

            await ExamSession.findOneAndUpdate(
                { candidateId, status: "in_progress" },
                {
                    $push: {
                        lockdownEvents: {
                            timestamp: new Date(),
                            ...payload,
                        },
                        suspiciousActivities: (!payload.fullscreen || payload.devtoolsDetected)
                            ? {
                                timestamp: new Date(),
                                type: "lockdown_violation",
                                details: payload.reason || "Fullscreen/devtools violation",
                            }
                            : undefined,
                    }
                }
            );

            return NextResponse.json({ success: true });
        }

        if (action === "screen_recording") {
            const suspected = Boolean(body.suspected);
            const method = typeof body.method === "string" ? body.method : "unknown";
            const reason = typeof body.reason === "string" ? body.reason : "screen_activity_signal";

            const updateDoc: Record<string, unknown> = {
                $push: {
                    screenRecordingFlags: {
                        timestamp: new Date(),
                        suspected,
                        method,
                        reason,
                    },
                }
            };

            if (suspected) {
                (updateDoc.$push as Record<string, unknown>).suspiciousActivities = {
                    timestamp: new Date(),
                    type: "screen_recording",
                    details: `${method}:${reason}`,
                };
            }

            await ExamSession.findOneAndUpdate({ candidateId, status: "in_progress" }, updateDoc);
            return NextResponse.json({ success: true });
        }

        if (action === "biometric") {
            const descriptor = Array.isArray(body.descriptor)
                ? body.descriptor.filter((v: unknown) => typeof v === "number")
                : [];
            const source = typeof body.source === "string" ? body.source : "faceapi";

            if (!descriptor.length) {
                return NextResponse.json({ error: "Descriptor required" }, { status: 400 });
            }

            const session = await ExamSession.findOne({ candidateId, status: "in_progress" });
            if (!session) {
                return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
            }

            const baseline = Array.isArray(session.referenceFaceDescriptor)
                ? (session.referenceFaceDescriptor as number[])
                : [];

            const similarity = baseline.length ? cosineSimilarity(baseline, descriptor) : 0;
            const matched = baseline.length ? similarity >= 0.9 : true;

            await ExamSession.findByIdAndUpdate(session._id, {
                $set: {
                    latestFaceDescriptor: descriptor,
                    aiVerificationStatus: matched ? "verified" : "mismatch",
                    referenceFaceDescriptor: baseline.length ? baseline : descriptor,
                },
                $push: {
                    biometricChecks: {
                        timestamp: new Date(),
                        similarityScore: Number(similarity.toFixed(4)),
                        matched,
                        source,
                    },
                    suspiciousActivities: !matched
                        ? {
                            timestamp: new Date(),
                            type: "biometric_mismatch",
                            details: `similarity=${similarity.toFixed(4)}`,
                        }
                        : undefined,
                }
            });

            return NextResponse.json({
                success: true,
                matched,
                similarityScore: Number(similarity.toFixed(4)),
            });
        }

        if (action === "snapshot") {
            // Store face snapshot
            const { image } = body;

            await ExamSession.findOneAndUpdate(
                { candidateId, status: "in_progress" },
                {
                    $push: {
                        faceSnapshots: image,
                    }
                }
            );

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("Exam session error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        const url = new URL(req.url);
        const candidateId = url.searchParams.get("candidateId");

        if (!candidateId) {
            return NextResponse.json({ error: "Candidate ID required" }, { status: 400 });
        }

        const session = await ExamSession.findOne({
            candidateId,
            status: "in_progress"
        });

        const remainingSeconds = session ? getRemainingSeconds(session as SessionDoc) : null;

        if (session && remainingSeconds !== null && remainingSeconds <= 0) {
            await ExamSession.findByIdAndUpdate(session._id, {
                $set: {
                    status: "expired",
                    terminatedReason: "server_timer_expired",
                    completedAt: new Date(),
                }
            });

            return NextResponse.json({
                success: true,
                session: null,
                exists: false,
                expired: true,
                remainingSeconds: 0,
            });
        }

        return NextResponse.json({
            success: true,
            session,
            exists: !!session,
            remainingSeconds,
        });
    } catch (error) {
        console.error("Fetch session error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
