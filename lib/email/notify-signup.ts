import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type UserType = "brand" | "journalist";

interface NotifySignupParams {
  email: string;
  userType: UserType;
  firstName?: string;
  brandName?: string; // only meaningful when userType === "brand"
}

/**
 * Fires the event that triggers the "Brand welcome" / "Journalist welcome"
 * Automation in the Resend dashboard.
 *
 * This does NOT send an email itself — the Automation's trigger + Send
 * Email step does that, using the published Template you build in the
 * Resend dashboard. Set up the Automations first; see
 * README-welcome-email-integration.md.
 *
 * Call this once, right after the profile row is created (same place you'd
 * otherwise have called sendWelcomeEmail), or from a Supabase DB webhook —
 * both options are covered in the README.
 */
export async function notifySignup({
  email,
  userType,
  firstName,
  brandName,
}: NotifySignupParams) {
  const event = userType === "brand" ? "brand.signed_up" : "journalist.signed_up";

  return resend.events.send({
    event,
    email, // Resend will create/match the contact by email
    payload: {
      first_name: firstName ?? "",
      brand_name: brandName ?? "",
    },
  });
}