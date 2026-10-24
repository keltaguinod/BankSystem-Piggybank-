import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireUser } from '@/lib/security';

// Notifications = money that came INTO my account.
// In this model, my 'withdrawal' row = I received/pulled money (balance up).
export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const uid = auth.user.id;

  const result = await query(
    `SELECT id, amount, counterparty_name, counterparty_account, created_at
     FROM transactions
     WHERE user_id = $1 AND type = 'withdrawal'
     ORDER BY created_at DESC
     LIMIT 10`,
    [uid]
  );
  return NextResponse.json({ notifications: result.rows });
}
