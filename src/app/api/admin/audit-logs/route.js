import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireUser } from '@/lib/security';

export async function GET(req) {
  const auth = await requireUser(['admin', 'auditor']);
  if (auth.error) return auth.error;
  const { searchParams } = new URL(req.url);
  const action = (searchParams.get('action') || '').trim().slice(0, 80);
  const outcome = (searchParams.get('outcome') || '').trim();
  const limit = Math.min(Math.max(Number.parseInt(searchParams.get('limit') || '100', 10) || 100, 1), 500);
  const result = await query(
    `SELECT a.id, a.action, a.target_type, a.target_id, a.outcome, a.ip_address,
            a.metadata, a.created_at, u.email AS actor_email
       FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_user_id
      WHERE ($1 = '' OR a.action = $1)
        AND ($2 = '' OR a.outcome = $2)
      ORDER BY a.created_at DESC LIMIT $3`,
    [action, outcome, limit]
  );
  return NextResponse.json({ logs: result.rows });
}
