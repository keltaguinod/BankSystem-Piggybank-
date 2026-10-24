import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { rateLimit, requireUser } from '@/lib/security';

// Find other users by account number or email (partial match), excluding self.
export async function GET(req) {
  const auth = await requireUser(['customer', 'admin']);
  if (auth.error) return auth.error;
  const uid = auth.user.id;
  const limited = rateLimit(`search:${uid}`, { limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  if (q.length < 4 || q.length > 160) return NextResponse.json({ results: [] });

  const like = `%${q}%`;
  const result = await query(
    `SELECT full_name, account_number, email
     FROM users
     WHERE id <> $1 AND (account_number ILIKE $2 OR email ILIKE $2 OR full_name ILIKE $2)
     ORDER BY full_name
     LIMIT 8`,
    [uid, like]
  );
  return NextResponse.json({ results: result.rows });
}
