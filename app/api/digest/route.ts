import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Digest cron not implemented (Batch 4)' },
    { status: 501 }
  );
}
