import { simpleParser, type Attachment, type ParsedMail } from 'mailparser';

export type ParsedAttachment = {
  fileName: string;
  contentType: string;
  size: number;
  content: Buffer;
};

export type ExtractedMessage = {
  messageId: string | null;
  subject: string;
  date: Date | null;
  from: string | null;
  html: string | null;
  text: string | null;
  headers: Record<string, string>;
  attachments: ParsedAttachment[];
};

function headerMap(parsed: ParsedMail): Record<string, string> {
  const out: Record<string, string> = {};
  if (!parsed.headers) return out;
  for (const [key, value] of parsed.headers) {
    if (typeof value === 'string') {
      out[key.toLowerCase()] = value;
    } else if (Array.isArray(value)) {
      out[key.toLowerCase()] = value.map(String).join(', ');
    } else if (value != null) {
      out[key.toLowerCase()] = String(value);
    }
  }
  return out;
}

function mapAttachment(att: Attachment): ParsedAttachment | null {
  const content = att.content;
  if (!Buffer.isBuffer(content) || content.length === 0) return null;
  return {
    fileName: att.filename || 'attachment',
    contentType: att.contentType || 'application/octet-stream',
    size: att.size ?? content.length,
    content,
  };
}

export async function extractMessage(raw: string): Promise<ExtractedMessage> {
  const parsed = await simpleParser(raw);
  const attachments = (parsed.attachments ?? [])
    .map(mapAttachment)
    .filter((a): a is ParsedAttachment => a !== null);

  return {
    messageId: parsed.messageId ?? null,
    subject: parsed.subject?.trim() || '(no subject)',
    date: parsed.date ?? null,
    from: parsed.from?.text ?? null,
    html: typeof parsed.html === 'string' ? parsed.html : null,
    text: typeof parsed.text === 'string' ? parsed.text : null,
    headers: headerMap(parsed),
    attachments,
  };
}

const OOO_SUBJECT_RE = /out of office|automatic reply|auto[- ]?reply/i;

export function shouldSkipMessage(msg: ExtractedMessage): string | null {
  const precedence = msg.headers.precedence?.toLowerCase() ?? '';
  if (precedence.includes('bulk') || precedence.includes('junk')) {
    return 'bulk/junk precedence';
  }
  if (msg.headers['list-unsubscribe']) {
    return 'list mail (List-Unsubscribe)';
  }
  if (OOO_SUBJECT_RE.test(msg.subject)) {
    return 'auto-reply subject';
  }
  if (!msg.from?.trim()) {
    return 'missing From header';
  }
  return null;
}

export function fallbackMessageId(msg: ExtractedMessage): string {
  const base = `${msg.subject}|${msg.date?.toISOString() ?? ''}|${msg.from ?? ''}`;
  return `hash:${Buffer.from(base).toString('base64url').slice(0, 32)}`;
}
