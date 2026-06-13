import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { chooseExtractionStrategy } from './build-release';
import type { ExtractedMessage } from './extract-message';
import { splitMboxContent, streamMboxMessages } from './parse-mbox';
import { domainToSlug, migrationUserEmail, parseSender } from './parse-sender';

function baseMessage(overrides: Partial<ExtractedMessage> = {}): ExtractedMessage {
  return {
    messageId: '<test@example.com>',
    subject: 'Test release',
    date: new Date('2024-01-01'),
    from: 'Acme Corp <press@acme.com>',
    html: null,
    text: null,
    headers: {},
    attachments: [],
    ...overrides,
  };
}

const SAMPLE_MBOX = [
  'From user@example.com Mon Jan 01 00:00:00 2024',
  'Subject: First',
  '',
  'Body one',
  'From user@example.com Tue Jan 02 00:00:00 2024',
  'Subject: Second',
  '',
  'Body two',
  'From user@example.com Wed Jan 03 00:00:00 2024',
  'Subject: Third',
  '',
  'Body three',
].join('\n');

describe('splitMboxContent', () => {
  it('splits on From lines', () => {
    const parts = splitMboxContent(SAMPLE_MBOX);
    expect(parts).toHaveLength(3);
    expect(parts[0]).toContain('Subject: First');
    expect(parts[1]).toContain('Subject: Second');
    expect(parts[2]).toContain('Subject: Third');
  });
});

describe('streamMboxMessages', () => {
  const tempFiles: string[] = [];

  afterEach(() => {
    for (const file of tempFiles) {
      try {
        fs.unlinkSync(file);
      } catch {
        // ignore
      }
    }
    tempFiles.length = 0;
  });

  function writeTempMbox(content: string): string {
    const file = path.join(
      os.tmpdir(),
      `broadbase-mbox-test-${Date.now()}-${Math.random().toString(36).slice(2)}.mbox`
    );
    fs.writeFileSync(file, content, 'utf8');
    tempFiles.push(file);
    return file;
  }

  async function collectStreamed(filePath: string, maxMessages?: number) {
    const out: string[] = [];
    for await (const message of streamMboxMessages(filePath, { maxMessages })) {
      out.push(message);
    }
    return out;
  }

  it('yields the same messages as splitMboxContent', async () => {
    const file = writeTempMbox(SAMPLE_MBOX);
    const streamed = await collectStreamed(file);
    expect(streamed).toEqual(splitMboxContent(SAMPLE_MBOX));
  });

  it('stops after maxMessages without reading the whole file', async () => {
    const file = writeTempMbox(SAMPLE_MBOX);
    const streamed = await collectStreamed(file, 2);
    expect(streamed).toHaveLength(2);
    expect(streamed[0]).toContain('Subject: First');
    expect(streamed[1]).toContain('Subject: Second');
  });
});

describe('parseSender', () => {
  it('parses display name, email, and domain', () => {
    const parsed = parseSender('Acme Corp <press@acme.com>');
    expect(parsed).toEqual({
      email: 'press@acme.com',
      displayName: 'Acme Corp',
      domain: 'acme.com',
    });
  });

  it('falls back to domain when display name missing', () => {
    const parsed = parseSender('press@beta.io');
    expect(parsed?.displayName).toBe('beta.io');
    expect(parsed?.domain).toBe('beta.io');
  });

  it('builds stable migration email slug', () => {
    expect(domainToSlug('acme.com')).toBe('acme-com');
    expect(migrationUserEmail('acme.com')).toBe(
      'import+acme-com@migration.broadbase.local'
    );
  });
});

describe('chooseExtractionStrategy', () => {
  it('prefers direct HTML when body is substantial', () => {
    const html = `<p>${'Press release content. '.repeat(20)}</p>`;
    const strategy = chooseExtractionStrategy(
      baseMessage({ html, text: 'short' })
    );
    expect(strategy).toBe('direct_html');
  });

  it('uses gemini PDF when no usable HTML but PDF attached', () => {
    const strategy = chooseExtractionStrategy(
      baseMessage({
        attachments: [
          {
            fileName: 'release.pdf',
            contentType: 'application/pdf',
            size: 1024,
            content: Buffer.from('%PDF'),
          },
        ],
      })
    );
    expect(strategy).toBe('gemini_pdf');
  });

  it('uses gemini text for plain text only', () => {
    const strategy = chooseExtractionStrategy(
      baseMessage({
        text: 'Plain text press release with enough content to parse.',
      })
    );
    expect(strategy).toBe('gemini_text');
  });

  it('returns null when nothing usable', () => {
    expect(chooseExtractionStrategy(baseMessage())).toBeNull();
  });
});
