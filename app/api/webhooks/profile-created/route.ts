import { NextRequest, NextResponse } from "next/server";
import { notifySignup } from "@/lib/email/notify-signup";

// Supabase sends this row shape for an INSERT Database Webhook on `profiles`.
interface ProfileInsertPayload {
  type: "INSERT";
  table: string;
  schema: string;
  record: {
    id: string;
    email: string;
    user_type: "brand" | "journalist";
    first_name?: string | null;
    brand_name?: string | null;
    [key: string]: unknown;
  };
  old_record: null;
}

export async function POST(req: NextRequest) {
  // Supabase DB webhooks let you attach a custom header with a shared
  // secret. Verify it before trusting the payload — same pattern as the
  // Resend bounce webhook signature check.
  const secret = req.headers.get("x-webhook-secret");
  if (secret !== process.env.SUPABASE_PROFILE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = (await req.json()) as ProfileInsertPayload;
  const record = payload.record;

  if (!record?.email || !record?.user_type) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  try {
    await notifySignup({
      email: record.email,
      userType: record.user_type,
      firstName: record.first_name ?? undefined,
      brandName: record.brand_name ?? undefined,
    });
  } catch (err) {
    // Log and still return 200 — a failure here shouldn't cause Supabase
    // to keep retrying the webhook indefinitely.
    console.error("notifySignup failed", err);
  }

  return NextResponse.json({ ok: true });
}