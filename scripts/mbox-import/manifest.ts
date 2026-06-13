import fs from 'node:fs';
import path from 'node:path';

export type ManifestDomainEntry = {
  brandId: string;
  ownerId: string;
  displayName: string;
};

export type ManifestMessageEntry = {
  releaseId: string;
  brandId: string;
  subject: string;
};

export type ImportManifest = {
  version: 1;
  domains: Record<string, ManifestDomainEntry>;
  messages: Record<string, ManifestMessageEntry>;
};

const EMPTY_MANIFEST: ImportManifest = {
  version: 1,
  domains: {},
  messages: {},
};

export function loadManifest(manifestPath: string): ImportManifest {
  if (!fs.existsSync(manifestPath)) {
    return { ...EMPTY_MANIFEST, domains: {}, messages: {} };
  }
  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    const parsed = JSON.parse(raw) as ImportManifest;
    if (parsed.version !== 1) {
      throw new Error(`Unsupported manifest version: ${parsed.version}`);
    }
    return {
      version: 1,
      domains: parsed.domains ?? {},
      messages: parsed.messages ?? {},
    };
  } catch (err) {
    throw new Error(
      `Failed to load manifest at ${manifestPath}: ${err instanceof Error ? err.message : err}`
    );
  }
}

export function saveManifest(manifestPath: string, manifest: ImportManifest): void {
  const dir = path.dirname(manifestPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
}

export function hasProcessedMessage(
  manifest: ImportManifest,
  messageId: string
): boolean {
  return Boolean(manifest.messages[messageId]);
}
