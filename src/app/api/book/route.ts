import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Candidate from "@/models/Candidate";
import Settings from "@/models/Settings";
import { shouldSendNotification } from "@/lib/mailer";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { candidateId, date, time, reschedule } = body;

        if (!candidateId || !date || !time) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await dbConnect();

        // Validate date is in admin-approved interview dates
        const settings = await Settings.findOne({});
        const approvedDates: string[] = settings?.interviewDates || [];
        if (approvedDates.length > 0 && !approvedDates.includes(date)) {
            return NextResponse.json({ error: "Selected date is not an approved interview date." }, { status: 400 });
        }

        // Ensure the date is in the future (at least tomorrow)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (new Date(date + "T00:00:00") < tomorrow) {
            return NextResponse.json({ error: "Interview date must be in the future." }, { status: 400 });
        }

        // 1. Verify Candidate exists and is qualified
        const candidate = await Candidate.findOne({ candidateId });
        if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
        if (candidate.qualificationStatus !== "Qualified") return NextResponse.json({ error: "Candidate not eligible to book." }, { status: 403 });

        // If already booked and not reschedule, block; if reschedule, allow
        if (candidate.interviewDate && !reschedule) {
            return NextResponse.json({ error: "Interview already scheduled. Use reschedule option to change." }, { status: 400 });
        }

        // 2. Check slot conflict
        const conflict = await Candidate.findOne({ interviewDate: date, interviewTime: time, candidateId: { $ne: candidateId } });
        if (conflict) {
            return NextResponse.json({ error: "This slot was just taken. Please select another time." }, { status: 409 });
        }

        // 3. Generate Link and Save
        const meetingBaseUrl = process.env.MEETING_BASE_URL || "http://localhost:3001/meeting";
        const meetingLink = `${meetingBaseUrl}/instant-1jd-ano-oql?hostId=685b0dae322e028c4011991d&instant=true&cid=${candidateId}`;

        await Candidate.findOneAndUpdate(
            { candidateId },
            {
                $set: {
                    interviewDate: date,
                    interviewTime: time,
                    meetingLink: meetingLink,
                    interviewStatus: "Scheduled"
                }
            }
        );

        // 4. Send booking confirmation email (non-blocking)
        if (await shouldSendNotification("booking_confirmation")) {
            import("@/lib/mailer").then(({ sendBookingConfirmationEmail }) => {
                sendBookingConfirmationEmail(
                    candidate.email,
                    candidate.name,
                    candidateId,
                    date,
                    time,
                    meetingLink
                );
            }).catch(err => console.error("Email import error:", err));
        }

        return NextResponse.json({
            success: true,
            meetingLink,
            interviewDate: date,
            interviewTime: time,
            rescheduled: !!reschedule,
        });

    } catch (error) {
        console.error("Booking err:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
