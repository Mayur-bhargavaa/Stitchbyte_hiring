import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const CID_REGEX = /^SB-BDE-\d{4}$/;

// This function can be marked `async` if using `await` inside
export function proxy(request: NextRequest) {
    const { pathname, searchParams } = request.nextUrl;

    if (pathname.startsWith('/api/admin') || pathname.startsWith('/api/dashboard')) {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Unauthorized - No token provided' },
                { status: 401 }
            );
        }
    }

    // Only apply to specific routes that require cid
    if (pathname.startsWith('/apply') || pathname.startsWith('/book')) {
        const cid = searchParams.get('cid');

        // If a CID is explicitly provided in the URL, but it's an invalid format, reject it.
        // If there's no CID at all, we let the page load so the React UI can prompt them to insert it manually.
        if (cid && !CID_REGEX.test(cid.toUpperCase())) {
            // Redirect to home if a malformed CID is provided
            return NextResponse.redirect(new URL('/', request.url));
        }
    }

    const response = NextResponse.next();
    if (pathname.startsWith('/api/')) {
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        response.headers.set('X-Client-IP', ip);
        response.headers.set('X-Request-Time', new Date().toISOString());
    }

    return response;
}

// See "Matching Paths" below to learn more
export const config = {
    matcher: [
        '/api/:path*',
        '/dashboard/:path*',
        '/apply/:path*',
        '/book/:path*'
    ],
};
