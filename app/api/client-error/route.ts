import { NextResponse } from 'next/server';
import { db } from '@/db';
import { clientErrors } from '@/db/schema';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const payload = body || await req.text();
    console.error('Client error reported:', payload);

    // persist to DB for later inspection
    try {
      await db.insert(clientErrors).values({ message: payload?.error || String(payload), info: payload?.info || null, url: payload?.url || null, userAgent: payload?.userAgent || null });
    } catch (dbErr) {
      console.error('Failed to persist client error:', dbErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error receiving client error:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
