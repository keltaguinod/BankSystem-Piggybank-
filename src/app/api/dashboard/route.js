import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireUser } from '@/lib/security';

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const uid = auth.user.id;

  // Monthly aggregation across the trailing 12 months (annual trend).
  const trend = await query(
    `
    WITH months AS (
      SELECT generate_series(
        date_trunc('month', NOW()) - INTERVAL '11 months',
        date_trunc('month', NOW()),
        INTERVAL '1 month'
      ) AS m
    )
    SELECT
      to_char(months.m, 'Mon')                                            AS label,
      to_char(months.m, 'YYYY-MM')                                        AS ym,
      COALESCE(SUM(CASE WHEN t.type='deposit'    THEN t.amount END), 0)   AS deposits,
      COALESCE(SUM(CASE WHEN t.type='withdrawal' THEN t.amount END), 0)   AS withdrawals
    FROM months
    LEFT JOIN transactions t
      ON t.user_id = $1
     AND date_trunc('month', t.created_at) = months.m
    GROUP BY months.m
    ORDER BY months.m
    `,
    [uid]
  );

  const summary = await query(
    `SELECT
       COALESCE(SUM(CASE WHEN type='deposit'    THEN amount END),0) AS total_deposits,
       COALESCE(SUM(CASE WHEN type='withdrawal' THEN amount END),0) AS total_withdrawals,
       COUNT(*) AS tx_count
     FROM transactions WHERE user_id = $1`,
    [uid]
  );

  const recent = await query(
    `SELECT id, type, amount, balance_after, counterparty_account, counterparty_name, counterparty_email, created_at
     FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 6`,
    [uid]
  );

  const user = await query('SELECT balance, currency FROM users WHERE id = $1', [uid]);

  return NextResponse.json({
    trend: trend.rows,
    summary: summary.rows[0],
    recent: recent.rows,
    balance: user.rows[0].balance,
    currency: user.rows[0].currency,
  });
}
