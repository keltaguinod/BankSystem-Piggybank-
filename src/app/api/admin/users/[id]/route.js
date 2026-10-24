import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { clientInfo, enforceSameOrigin, requireUser } from '@/lib/security';
import { writeAudit } from '@/lib/audit';

const ROLES = new Set(['customer', 'auditor', 'admin']);
const STATUSES = new Set(['active', 'locked', 'disabled']);

export async function PATCH(req, { params }) {
  const originError = enforceSameOrigin(req);
  if (originError) return originError;
  const auth = await requireUser(['admin']);
  if (auth.error) return auth.error;
  const id = Number((await params).id);
  const body = await req.json();
  if (!Number.isInteger(id) || !ROLES.has(body.role) || !STATUSES.has(body.status)) {
    return NextResponse.json({ error: 'Invalid role or account status.' }, { status: 400 });
  }
  if (id === auth.user.id && (body.role !== 'admin' || body.status !== 'active')) {
    return NextResponse.json({ error: 'You cannot remove your own active administrator access.' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const targetResult = await client.query('SELECT id, role, status FROM users WHERE id = $1 FOR UPDATE', [id]);
    if (!targetResult.rowCount) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }
    const before = targetResult.rows[0];
    if (before.role === 'admin' && (body.role !== 'admin' || body.status !== 'active')) {
      const admins = await client.query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin' AND status = 'active'");
      if (admins.rows[0].count <= 1) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'At least one active administrator is required.' }, { status: 409 });
      }
    }
    const updated = await client.query(
      `UPDATE users SET role = $1, status = $2,
         locked_until = CASE WHEN $2 = 'locked' THEN NOW() + INTERVAL '15 minutes' ELSE NULL END,
         session_version = session_version + 1
       WHERE id = $3
       RETURNING id, full_name, email, account_number, role, status, last_login_at, created_at`,
      [body.role, body.status, id]
    );
    const info = clientInfo(req);
    await writeAudit({
      actorUserId: auth.user.id, action: 'admin.user_access_changed', targetType: 'user', targetId: id,
      ip: info.ip, userAgent: info.userAgent, metadata: { before: { role: before.role, status: before.status }, after: { role: body.role, status: body.status } }, db: client,
    });
    await client.query('COMMIT');
    return NextResponse.json({ ok: true, user: updated.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('role update error', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Access update failed.' }, { status: 500 });
  } finally {
    client.release();
  }
}
