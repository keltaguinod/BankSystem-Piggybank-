import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/security';

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  return NextResponse.json({ user: auth.user });
}
