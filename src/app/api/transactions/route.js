import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireUser } from '@/lib/security';

export async function GET(req) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const uid = auth.user.id;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type'); // 'deposit' | 'withdrawal' | null
  const requestedLimit = Number.parseInt(searchParams.get('limit') || '100', 10);
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(requestedLimit, 500)) : 100;

  const params = [uid];
  let sql = `SELECT id, type, amount, balance_after, counterparty_account, counterparty_name, counterparty_email, created_at
             FROM transactions WHERE user_id = $1`;
  if (type === 'deposit' || type === 'withdrawal') {
    params.push(type);
    sql += ` AND type = $2`;
  }
  sql += ` ORDER BY created_at DESC LIMIT ${limit}`;

  const result = await query(sql, params);
  return NextResponse.json({ transactions: result.rows });
}
