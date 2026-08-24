// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
