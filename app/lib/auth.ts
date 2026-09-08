// lib/auth.ts
import jwt from 'jsonwebtoken';
import type { Role, SessionUser } from '@/types';

const secret = process.env.JWT_SECRET!;

if (!secret) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

export interface JWTPayload {
  id: number;
  username: string;
  role: Role;
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
export async function readJWTRequest(request?: Request): Promise<JWTPayload | null> {
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

/**
 * Convierte el JWT payload en el shape que usa la UI (SessionUser).
 * Esto mantiene la capa de autenticación coherente con el resto del proyecto.
 */
export function sessionUserFromPayload(payload: JWTPayload): SessionUser {
  return {
    id: payload.id,
    username: payload.username,
    name: payload.name,
    role: payload.role,
    colegioId: payload.colegioId,
    colegioNombre: null,
  };
}

export async function getSession(request: Request): Promise<SessionUser | null> {
  const payload = await readJWTRequest(request);
  if (!payload) return null;
  const session = sessionUserFromPayload(payload);
  return session;
}
