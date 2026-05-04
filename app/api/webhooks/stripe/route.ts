import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Stripe webhook not implemented (Batch 2)' },
    { status: 501 }
  );
}
