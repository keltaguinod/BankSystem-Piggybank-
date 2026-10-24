import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { clientInfo, enforceSameOrigin, rateLimit, requireUser, validEmail, validMoney } from '@/lib/security';
import { writeAudit } from '@/lib/audit';

// Existing UI calls this a deposit; operationally it is a transfer to another account.
export async function POST(req) {
  const originError = enforceSameOrigin(req);
  if (originError) return originError;
  const auth = await requireUser(['customer', 'admin']);
  if (auth.error) return auth.error;
  const info = clientInfo(req);
  const limited = rateLimit(`transfer:${auth.user.id}`, { limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const body = await req.json();
  const amount = validMoney(body.amount);
  const account = typeof body.account === 'string' && /^\d{10,20}$/.test(body.account.trim()) ? body.account.trim() : null;
  const email = validEmail(body.email);
  if (!amount || !account || !email) {
    return NextResponse.json({ error: 'Enter valid recipient details and amount.' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query(
      `SELECT id FROM users
       WHERE account_number = $1 AND email = $2 AND status = 'active'`, [account, email]
    );
    if (!found.rowCount || found.rows[0].id === auth.user.id) {
      await writeAudit({ actorUserId: auth.user.id, action: 'transaction.transfer', outcome: 'denied', ip: info.ip, userAgent: info.userAgent, metadata: { reason: 'recipient_unverified', amount }, db: client });
      await client.query('COMMIT');
      return NextResponse.json({ error: 'Recipient details could not be verified.' }, { status: 400 });
    }
    const recipientId = found.rows[0].id;

    // Always lock in numeric id order to avoid reciprocal-transfer deadlocks.
    await client.query('SELECT id FROM users WHERE id = ANY($1::int[]) ORDER BY id FOR UPDATE', [[auth.user.id, recipientId]]);
    const parties = await client.query(
      'SELECT id, full_name, email, account_number, balance FROM users WHERE id = ANY($1::int[])',
      [[auth.user.id, recipientId]]
    );
    const sender = parties.rows.find((row) => row.id === auth.user.id);
    const recipient = parties.rows.find((row) => row.id === recipientId);
    if (Number(amount) > Number(sender.balance)) {
      await writeAudit({ actorUserId: sender.id, action: 'transaction.transfer', outcome: 'denied', ip: info.ip, userAgent: info.userAgent, metadata: { reason: 'insufficient_funds', amount, recipientUserId: recipient.id }, db: client });
      await client.query('COMMIT');
      return NextResponse.json({ error: 'Insufficient funds.' }, { status: 400 });
    }

    const senderUpdate = await client.query('UPDATE users SET balance = balance - $1 WHERE id = $2 RETURNING balance', [amount, sender.id]);
    const recipientUpdate = await client.query('UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance', [amount, recipient.id]);
    const outgoing = await client.query(
      `INSERT INTO transactions (user_id, type, amount, balance_after, counterparty_id, counterparty_account, counterparty_name, counterparty_email)
       VALUES ($1,'deposit',$2,$3,$4,$5,$6,$7) RETURNING id`,
      [sender.id, amount, senderUpdate.rows[0].balance, recipient.id, recipient.account_number, recipient.full_name, recipient.email]
    );
    await client.query(
      `INSERT INTO transactions (user_id, type, amount, balance_after, counterparty_id, counterparty_account, counterparty_name, counterparty_email)
       VALUES ($1,'withdrawal',$2,$3,$4,$5,$6,$7)`,
      [recipient.id, amount, recipientUpdate.rows[0].balance, sender.id, sender.account_number, sender.full_name, sender.email]
    );
    await writeAudit({ actorUserId: sender.id, action: 'transaction.transfer', targetType: 'transaction', targetId: outgoing.rows[0].id, ip: info.ip, userAgent: info.userAgent, metadata: { amount, recipientUserId: recipient.id }, db: client });
    await client.query('COMMIT');
    return NextResponse.json({ ok: true, balance: senderUpdate.rows[0].balance, recipient: recipient.full_name });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('transfer error', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Transfer failed.' }, { status: 500 });
  } finally {
    client.release();
  }
}
