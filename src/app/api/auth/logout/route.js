import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth';
import { getSession } from '@/lib/auth';
import { clientInfo, enforceSameOrigin } from '@/lib/security';
import { writeAudit } from '@/lib/audit';

export async function POST(req) {
  const originError = enforceSameOrigin(req);
  if (originError) return originError;
  const session = await getSession();
  await destroySession();
  if (session?.uid) {
    const info = clientInfo(req);
    await writeAudit({ actorUserId: session.uid, action: 'auth.logout', ip: info.ip, userAgent: info.userAgent });
  }
  return NextResponse.json({ ok: true });
}
