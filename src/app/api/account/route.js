import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { createSession, hashPassword, verifyPassword } from '@/lib/auth';
import { cleanText, clientInfo, enforceSameOrigin, requireUser, validPassword } from '@/lib/security';
import { writeAudit } from '@/lib/audit';

const CURRENCIES = new Set(['USD', 'EUR', 'GBP', 'JPY', 'PHP', 'AUD', 'CAD', 'SGD', 'CNY']);

export async function PATCH(req) {
  const originError = enforceSameOrigin(req);
  if (originError) return originError;
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const uid = auth.user.id;
  const info = clientInfo(req);

  const body = await req.json();
  const fullName = cleanText(body.fullName, 120);
  const phone = body.phone === '' ? null : cleanText(body.phone, 40);
  const address = body.address === '' ? null : cleanText(body.address, 500);
  const currency = CURRENCIES.has(body.currency) ? body.currency : null;
  if (!fullName || !currency || (body.phone && !phone) || (body.address && !address)) {
    return NextResponse.json({ error: 'Invalid account details.' }, { status: 400 });
  }

  const changingPassword = Boolean(body.newPassword);
  if (changingPassword && !validPassword(body.newPassword)) {
    return NextResponse.json({ error: 'Use 12–128 characters with upper, lower, number, and symbol.' }, { status: 400 });
  }

  const client = await pool.connect();
  let newSessionVersion = Number(auth.user.session_version);
  try {
    await client.query('BEGIN');
    if (changingPassword) {
      const current = await client.query('SELECT password_hash FROM users WHERE id = $1 FOR UPDATE', [uid]);
      if (!await verifyPassword(body.currentPassword || '', current.rows[0].password_hash)) {
        await writeAudit({ actorUserId: uid, action: 'account.password_changed', outcome: 'denied', targetType: 'user', targetId: uid, ip: info.ip, userAgent: info.userAgent, metadata: { reason: 'reauthentication_failed' }, db: client });
        await client.query('COMMIT');
        return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
      }
      const passwordHash = await hashPassword(body.newPassword);
      const changed = await client.query(
        `UPDATE users SET password_hash = $1, password_changed_at = NOW(), session_version = session_version + 1
         WHERE id = $2 RETURNING session_version`, [passwordHash, uid]
      );
      newSessionVersion = Number(changed.rows[0].session_version);
    }

    const result = await client.query(
      `UPDATE users SET full_name = $1, phone = $2, address = $3, currency = $4
       WHERE id = $5
       RETURNING id, full_name, email, account_number, phone, address, balance, currency, role, status, session_version, created_at`,
      [fullName, phone, address, currency, uid]
    );
    await writeAudit({ actorUserId: uid, action: changingPassword ? 'account.password_changed' : 'account.profile_updated', targetType: 'user', targetId: uid, ip: info.ip, userAgent: info.userAgent, db: client });
    await client.query('COMMIT');

    if (changingPassword) await createSession({ ...auth.user, session_version: newSessionVersion });
    return NextResponse.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('account update error', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Account update failed.' }, { status: 500 });
  } finally {
    client.release();
  }
}
