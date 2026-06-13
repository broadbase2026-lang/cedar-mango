export type ParsedSender = {
  email: string;
  displayName: string;
  domain: string;
};

const EMAIL_RE = /<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?/;

/** Parse a From header value into email, display name, and domain key. */
export function parseSender(fromRaw: string | undefined | null): ParsedSender | null {
  const raw = (fromRaw ?? '').trim();
  if (!raw) return null;

  const emailMatch = raw.match(EMAIL_RE);
  if (!emailMatch) return null;

  const email = emailMatch[1].toLowerCase();
  const at = email.lastIndexOf('@');
  if (at <= 0) return null;

  const domain = email.slice(at + 1);
  if (!domain) return null;

  let displayName = raw
    .replace(EMAIL_RE, '')
    .replace(/^["'\s]+|["'\s]+$/g, '')
    .replace(/^<|>$/g, '')
    .trim();

  if (!displayName) {
    displayName = domain;
  }

  return { email, displayName, domain };
}

export function domainToSlug(domain: string): string {
  return domain
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function migrationUserEmail(domain: string): string {
  return `import+${domainToSlug(domain)}@migration.broadbase.local`;
}
