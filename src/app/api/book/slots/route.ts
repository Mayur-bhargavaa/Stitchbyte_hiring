import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Candidate from "@/models/Candidate";
import Settings from "@/models/Settings";

// Defines the available times for a valid day
// 11:00 AM to 3:00 PM in 30-min increments, excluding 1:00 PM and 1:30 PM (Lunch Break)
const ALL_SLOTS = [
    "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
    "02:00 PM", "02:30 PM", "03:00 PM"
];

export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const requestedDate = searchParams.get("date"); // optional: get slots for specific date

        // Fetch admin-configured interview dates from Settings
        const settings = await Settings.findOne({});
        const configuredDates: string[] = settings?.interviewDates || [];

        // Filter to only future dates (tomorrow or later)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split("T")[0];

        const futureDates = configuredDates
            .filter((d: string) => d >= tomorrowStr)
            .sort();

        if (futureDates.length === 0) {
            return NextResponse.json({
                success: true,
                availableDates: [],
                assignedDate: "",
                allSlots: ALL_SLOTS,
                bookedSlots: [],
                message: "No interview dates are currently available. Please check back later.",
            });
        }
        // If a specific date is requested, use it; otherwise use the nearest future date
        const selectedDate = requestedDate && futureDates.includes(requestedDate)
            ? requestedDate
            : futureDates[0];

        // Fetch all candidates booked for this date
        const bookedCandidates = await Candidate.find(
            { interviewDate: selectedDate },
            { interviewTime: 1 }
        );
        const bookedForDate = bookedCandidates
            .map((c) => c.interviewTime)
            .filter((time): time is string => time !== null && time !== undefined);

        return NextResponse.json({
            success: true,
            availableDates: futureDates,
            assignedDate: selectedDate,
            allSlots: ALL_SLOTS,
            bookedSlots: bookedForDate,
        });
    } catch (error) {
        console.error("Failed to fetch slots:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
