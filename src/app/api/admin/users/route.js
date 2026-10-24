import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireUser } from '@/lib/security';

export async function GET(req) {
  const auth = await requireUser(['admin']);
  if (auth.error) return auth.error;
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const like = `%${q.slice(0, 160)}%`;
  const result = await query(
    `SELECT id, full_name, email, account_number, role, status, last_login_at, created_at
       FROM users
      WHERE ($1 = '%%' OR full_name ILIKE $1 OR email ILIKE $1 OR account_number ILIKE $1)
      ORDER BY created_at DESC LIMIT 100`, [like]
  );
  return NextResponse.json({ users: result.rows });
}
