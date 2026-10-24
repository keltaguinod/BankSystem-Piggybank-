import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import {
  clientInfo,
  cleanText,
  enforceSameOrigin,
  rateLimit,
  validEmail,
  validPassword,
} from '@/lib/security';
import { writeAudit } from '@/lib/audit';
import crypto from 'crypto';

// Generate a unique 10-digit account number not already in use.
async function generateAccountNumber() {
  for (let i = 0; i < 10; i++) {
    const n = String(
      crypto.randomInt(1_000_000_000, 10_000_000_000)
    );

    const exists = await query(
      'SELECT 1 FROM users WHERE account_number = $1',
      [n]
    );

    if (exists.rowCount === 0) {
      return n;
    }
  }

  throw new Error('Could not generate a unique account number.');
}

export async function POST(req) {
  const originError = enforceSameOrigin(req);
  if (originError) return originError;

  const info = clientInfo(req);

  const limited = rateLimit(
    `register:${info.ip || 'unknown'}`,
    {
      limit: 5,
      windowMs: 60 * 60_000,
    }
  );

  if (limited) return limited;

  try {
    const body = await req.json();

    const fullName = cleanText(body.fullName, 120);
    const email = validEmail(body.email);
    const password = body.password;

    if (!fullName || !email || !password) {
      return NextResponse.json(
        {
          error: "All fields are required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!validPassword(password)) {
      return NextResponse.json(
        {
          error:
            "Use 12–128 characters with upper, lower, number, and symbol.",
        },
        {
          status: 400,
        }
      );
    }

    const existing = await query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existing.rowCount > 0) {
      return NextResponse.json(
        {
          error: "An account with that email already exists.",
        },
        {
          status: 409,
        }
      );
    }

    const hash = await hashPassword(password);

    const accountNumber = await generateAccountNumber();

    let result;

    try {
      result = await query(
        `
        INSERT INTO users
        (
          full_name,
          email,
          account_number,
          password_hash
        )
        VALUES
        (
          $1,
          $2,
          $3,
          $4
        )
        RETURNING
          id,
          role,
          session_version;
        `,
        [
          fullName,
          email,
          accountNumber,
          hash,
        ]
      );

    } catch (dbError) {

      console.error("DATABASE INSERT FAILED");
      console.error(dbError);

      return NextResponse.json(
        {
          error: "Database insert failed.",
          details:
            dbError instanceof Error
              ? dbError.message
              : "Unknown database error",
        },
        {
          status: 500,
        }
      );
    }

    const user = result.rows[0];

    try {
      await writeAudit({
        actorUserId: user.id,
        action: "auth.register",
        targetType: "user",
        targetId: user.id,
        ip: info.ip,
        userAgent: info.userAgent,
      });
    } catch (auditError) {
      // The account is already committed. Do not report registration as failed
      // merely because supplementary audit recording was unavailable.
      console.error("REGISTRATION AUDIT FAILED", auditError);
    }

    return NextResponse.json({ ok: true }, { status: 201 });

  } catch (err) {

    console.error("REGISTER ERROR");
    console.error(err);

    return NextResponse.json(
      {
        error: "Server error.",
        details:
          err instanceof Error
            ? err.message
            : "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}
