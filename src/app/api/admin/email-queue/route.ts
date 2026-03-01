import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import EmailQueue from "@/models/EmailQueue";
import { processEmailQueue } from "@/lib/mailer";
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

        const url = new URL(req.url);
        const status = url.searchParams.get("status");
        const limit = parseInt(url.searchParams.get("limit") || "50");

        const query: Record<string, string> = {};
        if (status) query.status = status;

        const emails = await EmailQueue.find(query)
            .sort({ createdAt: -1 })
            .limit(limit);

        const stats = await EmailQueue.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        return NextResponse.json({ success: true, emails, stats });
    } catch (error) {
        console.error("Email queue error:", error);
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

        const body = await req.json();
        const { action } = body;

        if (action === "process") {
            // Manually trigger email queue processing
            await processEmailQueue();
            return NextResponse.json({ success: true, message: "Email queue processed" });
        }

        if (action === "retry") {
            // Retry failed emails
            const { emailId } = body;
            await dbConnect();
            await EmailQueue.findByIdAndUpdate(emailId, {
                status: "pending",
                error: null
            });
            return NextResponse.json({ success: true, message: "Email queued for retry" });
        }

        if (action === "cancel") {
            // Cancel pending email
            const { emailId } = body;
            await dbConnect();
            await EmailQueue.findByIdAndUpdate(emailId, { status: "cancelled" });
            return NextResponse.json({ success: true, message: "Email cancelled" });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("Email queue action error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
