'use server';

import { sendPortalFeedbackEmail } from '@/lib/email/send-portal-feedback';
import { getBrandPortalSession } from '@/lib/brand/session';
import { getJournalistPortalSession } from '@/lib/journalist/session';
import type { PortalFeedbackActionState } from '@/lib/portal/feedback-state';

function parseMessage(raw: FormDataEntryValue | null): string | null {
  const message = String(raw ?? '').trim();
  if (!message) return null;
  if (message.length < 10) return null;
  if (message.length > 5000) return null;
  return message;
}

async function submitFeedbackForPortal(
  portal: 'brand' | 'journalist',
  formData: FormData
): Promise<PortalFeedbackActionState> {
  const message = parseMessage(formData.get('message'));
  if (!message) {
    return {
      error: 'Enter a message between 10 and 5,000 characters.',
    };
  }

  if (portal === 'brand') {
    const session = await getBrandPortalSession();
    if (!session.ok) {
      return { error: 'You must be signed in to send feedback.' };
    }
    if (!session.email) {
      return { error: 'Your account is missing an email address.' };
    }

    const result = await sendPortalFeedbackEmail({
      portal: 'brand',
      message,
      userEmail: session.email,
      userName: session.displayName,
      contextLabel: session.brand?.name ?? null,
    });

    if (!result.ok) {
      return { error: result.error };
    }

    return { error: null, success: true };
  }

  const session = await getJournalistPortalSession();
  if (!session.ok) {
    return { error: 'You must be signed in to send feedback.' };
  }
  if (!session.email) {
    return { error: 'Your account is missing an email address.' };
  }

  const result = await sendPortalFeedbackEmail({
    portal: 'journalist',
    message,
    userEmail: session.email,
    userName: session.displayName,
    contextLabel: session.journalistProfile?.publication ?? null,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  return { error: null, success: true };
}

export async function submitBrandFeedbackAction(
  _prev: PortalFeedbackActionState,
  formData: FormData
): Promise<PortalFeedbackActionState> {
  return submitFeedbackForPortal('brand', formData);
}

export async function submitJournalistFeedbackAction(
  _prev: PortalFeedbackActionState,
  formData: FormData
): Promise<PortalFeedbackActionState> {
  return submitFeedbackForPortal('journalist', formData);
}

