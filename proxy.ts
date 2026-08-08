import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define public routes that should NOT require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  // Legal pages must be readable without an account
  '/privacy',
  '/terms',
  '/cookies',
  // Public marketing/content pages linked from the landing footer
  '/templates',
  '/career-advice',
]);

// Known protected app routes. Everything else (unknown paths, static assets)
// falls through so Next.js can render its own 404 instead of redirecting
// unknown URLs into the sign-in flow.
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/resume(.*)',
  '/ai(.*)',
  '/api(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // Only protect known app routes; public routes pass through
  if (isProtectedRoute(req) && !isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
