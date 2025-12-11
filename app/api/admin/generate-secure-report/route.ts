import { NextResponse } from 'next/server';
import { generateSecureReport } from '../../../admin/actions';

export async function POST(req: Request) {
  try {
    const datosProyecto = await req.json();
    const result = await generateSecureReport(datosProyecto);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
