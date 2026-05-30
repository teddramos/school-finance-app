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