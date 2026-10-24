import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const COOKIE_NAME = process.env.NODE_ENV === 'production' ? '__Host-bank_session' : 'bank_session';

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters.');
  }
  return new TextEncoder().encode(value);
}

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export async function createSession(user, remember = false) {
  const maxAge = remember ? 60 * 60 * 24 * 7 : 60 * 30;
  const token = await new SignJWT({
    uid: Number(user.id),
    role: user.role,
    sv: Number(user.session_version),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setJti(crypto.randomUUID())
    .setExpirationTime(`${maxAge}s`)
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.set(COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 });
}

export async function getSession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!Number.isInteger(payload.uid) || !Number.isInteger(payload.sv)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getSessionUserId() {
  return (await getSession())?.uid ?? null;
}
