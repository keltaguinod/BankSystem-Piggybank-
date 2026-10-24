import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

const buckets = globalThis.__bankRateLimits ?? new Map();
if (process.env.NODE_ENV !== 'production') globalThis.__bankRateLimits = buckets;

export function clientInfo(req) {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return {
    ip: forwarded || req.headers.get('x-real-ip') || null,
    userAgent: req.headers.get('user-agent')?.slice(0, 500) || null,
  };
}

export function rateLimit(key, { limit, windowMs }) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  current.count += 1;
  if (current.count <= limit) return null;
  const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  );
}

export function enforceSameOrigin(req) {
  const site = req.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') {
    return NextResponse.json({ error: 'Cross-site request blocked.' }, { status: 403 });
  }
  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  return null;
}

export async function requireUser(roles = null) {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) };

  const result = await query(
    `SELECT id, full_name, email, account_number, phone, address, balance, currency,
            role, status, session_version, created_at
       FROM users WHERE id = $1`,
    [session.uid]
  );
  const user = result.rows[0];
  if (!user || user.status !== 'active' || Number(user.session_version) !== Number(session.sv)) {
    return { error: NextResponse.json({ error: 'Session is no longer valid.' }, { status: 401 }) };
  }
  if (roles && !roles.includes(user.role)) {
    return { error: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }) };
  }
  return { user, session };
}

export function validMoney(value, max = '1000000.00') {
  const raw = String(value ?? '').trim();
  if (!/^(?:0|[1-9]\d{0,12})(?:\.\d{1,2})?$/.test(raw)) return null;
  const [whole, fraction = ''] = raw.split('.');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  const maxCents = BigInt(String(max).replace('.', ''));
  if (cents <= 0n || cents > maxCents) return null;
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}

export function cleanText(value, maxLength) {
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  return clean && clean.length <= maxLength ? clean : null;
}

export function validEmail(value) {
  const email = String(value ?? '').trim().toLowerCase();
  return email.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function validPassword(value) {
  return typeof value === 'string' && value.length >= 12 && value.length <= 128 &&
    /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
}
