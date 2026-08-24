// lib/auth.ts
import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET!;

if (!secret) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

export interface JWTPayload {
  id: number;
  username: string;
  role: string;
  name: string;
  colegioId: number | null;
}

export function signJWT(payload: JWTPayload): Promise<string> {
  return new Promise((resolve, reject) => {
    jwt.sign(payload, secret, { expiresIn: '8h' }, (err, token) => {
      if (err) reject(err);
      else resolve(token as string);
    });
  });
}

export function verifyJWT(token: string): Promise<JWTPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secret, (err, decoded) => {
      if (err) reject(err);
      else resolve(decoded as JWTPayload);
    });
  });
}

/**
 * Extrae el token de la cookie o del header Authorization y devuelve el payload.
 * Devuelve null si no hay sesión válida.
 */
export async function getSession(request?: Request): Promise<JWTPayload | null> {
  let token: string | undefined;
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    token = cookieStore.get('token')?.value;
  } catch {
    // fuera de contexto de request handler
  }
  if (!token && request) {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }
  if (!token) return null;
  try {
    return await verifyJWT(token);
  } catch {
    return null;
  }
}
