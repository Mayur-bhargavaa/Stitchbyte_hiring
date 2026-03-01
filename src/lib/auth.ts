import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-change-in-production";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "stitchbyte2024";

export interface AdminUser {
    id: string;
    username: string;
    role: "admin" | "super_admin";
    createdAt: Date;
}

export interface JWTPayload {
    userId: string;
    username: string;
    role: string;
    iat?: number;
    exp?: number;
}

/**
 * Verify admin password
 */
export function verifyAdminPassword(password: string): boolean {
    return password === ADMIN_PASSWORD;
}

/**
 * Generate JWT token for admin
 */
export function generateToken(user: Omit<AdminUser, "createdAt">): string {
    const payload: JWTPayload = {
        userId: user.id,
        username: user.username,
        role: user.role,
    };

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: "8h", // Token expires in 8 hours
    });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
        return decoded;
    } catch {
        return null;
    }
}

/**
 * Hash password (for future user management)
 */
export function hashPassword(password: string): string {
    return crypto.createHash("sha256").update(password).digest("hex");
}

/**
 * Generate random session ID
 */
export function generateSessionId(): string {
    return crypto.randomBytes(32).toString("hex");
}

/**
 * Rate limiting helper
 */
interface RateLimitStore {
    [key: string]: { count: number; resetTime: number };
}

const rateLimitStore: RateLimitStore = {};

export function checkRateLimit(
    identifier: string,
    maxRequests: number = 100,
    windowMs: number = 15 * 60 * 1000 // 15 minutes
): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const record = rateLimitStore[identifier];

    if (!record || now > record.resetTime) {
        rateLimitStore[identifier] = {
            count: 1,
            resetTime: now + windowMs,
        };
        return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs };
    }

    if (record.count >= maxRequests) {
        return { allowed: false, remaining: 0, resetTime: record.resetTime };
    }

    record.count++;
    return {
        allowed: true,
        remaining: maxRequests - record.count,
        resetTime: record.resetTime,
    };
}

/**
 * Cleanup old rate limit entries
 */
export function cleanupRateLimits(): void {
    const now = Date.now();
    for (const key in rateLimitStore) {
        if (rateLimitStore[key].resetTime < now) {
            delete rateLimitStore[key];
        }
    }
}

// Cleanup every 10 minutes
setInterval(cleanupRateLimits, 10 * 60 * 1000);
