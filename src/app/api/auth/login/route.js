import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyPassword, createSession } from '@/lib/auth';
import { clientInfo, enforceSameOrigin, rateLimit, validEmail } from '@/lib/security';
import { writeAudit } from '@/lib/audit';
import { logLogin } from "@/lib/loginHistory";

export async function POST(req) {
  const originError = enforceSameOrigin(req);
  if (originError) return originError;

  const info = clientInfo(req);

  const limited = rateLimit(`login:${info.ip || 'unknown'}`, {
    limit: 10,
    windowMs: 15 * 60_000
  });

  if (limited) return limited;

  try {
    const { email: rawEmail, password, remember = false } = await req.json();

    const email = validEmail(rawEmail);

    if (!email || typeof password !== 'string' || password.length > 128) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const result = await query(
      `SELECT id, password_hash, role, status, session_version,
              failed_login_attempts, locked_until
       FROM users
       WHERE email = $1`,
      [email]
    );

    // User not found
    if (result.rowCount === 0) {

      // NEW
      await logLogin({
        status: "FAILED",
        ipAddress: info.ip,
        userAgent: info.userAgent
      });

      await writeAudit({
        action: 'auth.login',
        outcome: 'failure',
        ip: info.ip,
        userAgent: info.userAgent,
        metadata: { reason: 'invalid_credentials' }
      });

      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // Account locked / inactive
    if (
      user.status !== 'active' ||
      (user.locked_until && new Date(user.locked_until) > new Date())
    ) {

      // NEW
      await logLogin({
        userId: user.id,
        status: "LOCKED",
        ipAddress: info.ip,
        userAgent: info.userAgent
      });

      await writeAudit({
        actorUserId: user.id,
        action: 'auth.login',
        outcome: 'denied',
        ip: info.ip,
        userAgent: info.userAgent,
        metadata: { reason: 'account_unavailable' }
      });

      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const ok = await verifyPassword(password, user.password_hash);

    // Wrong password
    if (!ok) {

      await query(
        `UPDATE users
         SET failed_login_attempts = failed_login_attempts + 1,
             locked_until =
               CASE
                 WHEN failed_login_attempts + 1 >= 5
                 THEN NOW() + INTERVAL '15 minutes'
                 ELSE locked_until
               END
         WHERE id = $1`,
        [user.id]
      );

      // NEW
      await logLogin({
        userId: user.id,
        status: "FAILED",
        ipAddress: info.ip,
        userAgent: info.userAgent
      });

      await writeAudit({
        actorUserId: user.id,
        action: 'auth.login',
        outcome: 'failure',
        ip: info.ip,
        userAgent: info.userAgent,
        metadata: { reason: 'invalid_credentials' }
      });

      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Successful login
    await query(
      `UPDATE users
       SET failed_login_attempts = 0,
           locked_until = NULL,
           last_login_at = NOW()
       WHERE id = $1`,
      [user.id]
    );

    await createSession(user, Boolean(remember));

    // NEW
    await logLogin({
      userId: user.id,
      status: "SUCCESS",
      ipAddress: info.ip,
      userAgent: info.userAgent
    });

    await writeAudit({
      actorUserId: user.id,
      action: 'auth.login',
      ip: info.ip,
      userAgent: info.userAgent
    });

    return NextResponse.json({ ok: true });

  } catch (err) {

    console.error(
      'login error',
      err instanceof Error ? err.message : 'unknown'
    );

    return NextResponse.json(
      { error: 'Server error.' },
      { status: 500 }
    );
  }
}