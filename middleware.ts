// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const publicPaths = ['/login', '/api/auth/login'];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const isPublicPath = publicPaths.some(p => path.startsWith(p));
  if (isPublicPath) return NextResponse.next();

  if (path.startsWith('/api/')) return NextResponse.next();

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
    response.headers.set('X-User-ColegioId', String(payload.colegioId || ''));
    return response;
  } catch (error) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};