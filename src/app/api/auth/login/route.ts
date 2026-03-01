import { NextRequest, NextResponse } from "next/server";
import { verifyAdminPassword, generateToken, checkRateLimit } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import AuditLog from "@/models/AuditLog";

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        
        // Rate limiting
        const rateLimit = checkRateLimit(`login:${ip}`, 5, 15 * 60 * 1000); // 5 attempts per 15 minutes
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "Too many login attempts. Please try again later." },
                { status: 429 }
            );
        }

        const { password } = await req.json();

        if (!password) {
            return NextResponse.json({ error: "Password required" }, { status: 400 });
        }

        if (!verifyAdminPassword(password)) {
            return NextResponse.json({ error: "Invalid password" }, { status: 401 });
        }

        // Generate token
        const user = {
            id: "admin-1",
            username: "admin",
            role: "admin" as const,
        };

        const token = generateToken(user);

        // Log successful login
        try {
            await dbConnect();
            await AuditLog.create({
                adminId: user.id,
                adminUsername: user.username,
                action: "admin_login",
                ipAddress: ip,
                userAgent: req.headers.get("user-agent"),
            });
        } catch (err) {
            console.error("Failed to log audit:", err);
        }

        return NextResponse.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
            },
        });
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
