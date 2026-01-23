import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
    '/',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/api/webhooks(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
    const { userId } = await auth();

    // If user is trying to access sign-in/sign-up while authenticated, redirect to dashboard
    if (userId && (request.nextUrl.pathname.startsWith('/sign-in') || request.nextUrl.pathname.startsWith('/sign-up'))) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Protect all routes except public ones
    if (!isPublicRoute(request)) {
        if (!userId) {
            // Redirect to sign-in for protected routes
            const signInUrl = new URL('/sign-in', request.url);
            signInUrl.searchParams.set('redirect_url', request.nextUrl.pathname);
            return NextResponse.redirect(signInUrl);
        }
    }

    return NextResponse.next();
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
