// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Public paths that don't require authentication
const publicPaths = ['/login', '/api/auth/login'];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Check if the route is public
  const isPublicPath = publicPaths.some(p => path.startsWith(p));
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Do not run middleware for API routes; let API handlers manage auth and return proper status codes
  if (path.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Try token from cookie first, then Authorization header as a fallback
  const cookieToken = request.cookies.get('token')?.value;
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  let token = cookieToken;
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);

    const response = NextResponse.next();
    response.headers.set('X-User-Id', String(payload.id));
    response.headers.set('X-User-Role', String(payload.role));
    return response;
  } catch (error) {
    // Token is invalid -> redirect to login
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
}

// Configure which routes the middleware runs on
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};