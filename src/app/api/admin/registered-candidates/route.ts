import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import RegisteredCandidate from "@/models/RegisteredCandidate";
import { verifyToken } from "@/lib/auth";

// GET - List all registered candidates
export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const payload = verifyToken(authHeader.substring(7));
        if (!payload) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        await dbConnect();
        const candidates = await RegisteredCandidate.find({}).sort({ createdAt: -1 });
        return NextResponse.json({ success: true, candidates });
    } catch (error) {
        console.error("Fetch registered candidates error:", error);
        return NextResponse.json({ error: "Failed to fetch registered candidates" }, { status: 500 });
    }
}

// POST - Create or update a registered candidate
export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const payload = verifyToken(authHeader.substring(7));
        if (!payload) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        await dbConnect();
        const body = await req.json();
        const { candidateId, candidateName, email, testStartDate, testStartTime, testEndDate, testEndTime, isActive } = body;

        if (!candidateId || !candidateName || !testStartDate || !testEndDate) {
            return NextResponse.json({ error: "CID, Name, Test Start Date, and Test End Date are required." }, { status: 400 });
        }

        // Validate CID format
        if (!/^SB-BDE-\d{4}$/.test(candidateId)) {
            return NextResponse.json({ error: "Invalid CID format. Must be SB-BDE-XXXX." }, { status: 400 });
        }

        // Check if already exists → update
        const existing = await RegisteredCandidate.findOne({ candidateId });
        if (existing) {
            const updated = await RegisteredCandidate.findByIdAndUpdate(existing._id, {
                candidateName,
                email: email || "",
                testStartDate,
                testStartTime: testStartTime || "00:00",
                testEndDate,
                testEndTime: testEndTime || "23:59",
                isActive: isActive !== false,
            }, { new: true });
            return NextResponse.json({ success: true, candidate: updated, updated: true });
        }

        // Create new
        const candidate = await RegisteredCandidate.create({
            candidateId,
            candidateName,
            email: email || "",
            testStartDate,
            testStartTime: testStartTime || "00:00",
            testEndDate,
            testEndTime: testEndTime || "23:59",
            isActive: isActive !== false,
        });

        return NextResponse.json({ success: true, candidate, created: true });
    } catch (error) {
        console.error("Register candidate error:", error);
        if (typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000) {
            return NextResponse.json({ error: "Candidate ID already registered." }, { status: 400 });
        }
        return NextResponse.json({ error: "Failed to register candidate" }, { status: 500 });
    }
}

// DELETE - Remove a registered candidate
export async function DELETE(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const payload = verifyToken(authHeader.substring(7));
        if (!payload) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        await dbConnect();
        const { searchParams } = new URL(req.url);
        const candidateId = searchParams.get("candidateId");

        if (!candidateId) {
            return NextResponse.json({ error: "candidateId is required" }, { status: 400 });
        }

        await RegisteredCandidate.deleteOne({ candidateId });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete registered candidate error:", error);
        return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }
}
