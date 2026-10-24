import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyPassword } from '@/lib/auth';
import { clientInfo, enforceSameOrigin, rateLimit, requireUser, validMoney } from '@/lib/security';
import { writeAudit } from '@/lib/audit';

// A withdrawal can only debit the authenticated user's own account.
export async function POST(req) {
  const originError = enforceSameOrigin(req);
  if (originError) return originError;
  const auth = await requireUser(['customer', 'admin']);
  if (auth.error) return auth.error;
  const info = clientInfo(req);
  const limited = rateLimit(`withdraw:${auth.user.id}`, { limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const body = await req.json();
  const amount = validMoney(body.amount);
  if (!amount || typeof body.currentPassword !== 'string') {
    return NextResponse.json({ error: 'A valid amount and your password are required.' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const me = await client.query('SELECT balance, password_hash FROM users WHERE id = $1 FOR UPDATE', [auth.user.id]);
    if (!await verifyPassword(body.currentPassword, me.rows[0].password_hash)) {
      await writeAudit({ actorUserId: auth.user.id, action: 'transaction.withdrawal', outcome: 'denied', ip: info.ip, userAgent: info.userAgent, metadata: { reason: 'reauthentication_failed' }, db: client });
      await client.query('COMMIT');
      return NextResponse.json({ error: 'Password verification failed.' }, { status: 403 });
    }
    if (Number(amount) > Number(me.rows[0].balance)) {
      await writeAudit({ actorUserId: auth.user.id, action: 'transaction.withdrawal', outcome: 'denied', ip: info.ip, userAgent: info.userAgent, metadata: { reason: 'insufficient_funds', amount }, db: client });
      await client.query('COMMIT');
      return NextResponse.json({ error: 'Insufficient funds.' }, { status: 400 });
    }
    const updated = await client.query(
      'UPDATE users SET balance = balance - $1 WHERE id = $2 RETURNING balance',
      [amount, auth.user.id]
    );
    const balance = updated.rows[0].balance;
    const tx = await client.query(
      `INSERT INTO transactions (user_id, type, amount, balance_after)
       VALUES ($1, 'withdrawal', $2, $3) RETURNING id`,
      [auth.user.id, amount, balance]
    );
    await writeAudit({ actorUserId: auth.user.id, action: 'transaction.withdrawal', targetType: 'transaction', targetId: tx.rows[0].id, ip: info.ip, userAgent: info.userAgent, metadata: { amount }, db: client });
    await client.query('COMMIT');
    return NextResponse.json({ ok: true, balance });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('withdrawal error', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Withdrawal failed.' }, { status: 500 });
  } finally {
    client.release();
  }
}
