import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { accessClassForPath, homeForAccessClass, LOGIN_PATH } from './lib/roles.js';
import { SESSION_COOKIE, SESSION_PURPOSE, resolveSessionSecret } from './lib/session-constants.js';

// Coarse, server-side gate for the private workspaces.
//
// This runs before any page renders, so an unauthenticated request never
// reaches a protected route. It is deliberately *not* the authority on
// permissions: it only reads the signed session token, while every layout and
// API handler re-checks the account's current roles in the database. A token
// whose role claim is stale is therefore rejected one layer down instead of
// being trusted here.

async function readSession(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, resolveSessionSecret(), { algorithms: ['HS256'] });
    if (payload.purpose !== SESSION_PURPOSE || typeof payload.sub !== 'string') return null;
    if (payload.demo === true && process.env.NODE_ENV === 'production') return null;
    return {
      userId: payload.sub,
      accessClass: typeof payload.cls === 'string' ? payload.cls : '',
      demo: payload.demo === true
    };
  } catch {
    return null;
  }
}

function redirectTo(request, path) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search = '';
  return NextResponse.redirect(url);
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const session = await readSession(request);

  // Legacy entry points. /dashboard and /office used to be the only workspace
  // URLs; send them to the canonical, role-specific home.
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/') || pathname === '/office' || pathname.startsWith('/office/')) {
    if (!session) return redirectTo(request, LOGIN_PATH);
    if (session.accessClass) return redirectTo(request, homeForAccessClass(session.accessClass));
    // Old token without a role claim: let the server page resolve the role.
    return NextResponse.next();
  }

  const requiredAccess = accessClassForPath(pathname);
  if (!requiredAccess) return NextResponse.next();

  if (!session) return redirectTo(request, LOGIN_PATH);

  // A token issued before role claims existed cannot be routed safely here.
  // The database-backed layout guard still protects the route.
  if (!session.accessClass) return NextResponse.next();

  if (session.accessClass !== requiredAccess) {
    return redirectTo(request, homeForAccessClass(session.accessClass));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/client',
    '/client/:path*',
    '/dashboard',
    '/dashboard/:path*',
    '/office',
    '/office/:path*'
  ]
};
