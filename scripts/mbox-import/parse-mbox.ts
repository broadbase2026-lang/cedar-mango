import fs from 'node:fs';

const MBOX_BOUNDARY_LF = '\nFrom ';
const MBOX_BOUNDARY_CRLF = '\r\nFrom ';

/** Default read chunk size (4 MB) — keeps memory bounded on large mbox files. */
export const MBOX_STREAM_HIGH_WATER_MARK = 4 * 1024 * 1024;

/**
 * Split an mbox string into raw RFC822 message strings.
 * Mbox messages are separated by lines beginning with "From ".
 */
export function splitMboxContent(raw: string): string[] {
  const normalized = raw.replace(/\r\n/g, '\n');
  const parts = normalized.split(/\n(?=From )/);
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

function findMboxBoundary(
  buffer: string
): { index: number; separatorLength: number } | null {
  const crlfIdx = buffer.indexOf(MBOX_BOUNDARY_CRLF);
  const lfIdx = buffer.indexOf(MBOX_BOUNDARY_LF);

  if (crlfIdx !== -1 && (lfIdx === -1 || crlfIdx < lfIdx)) {
    return { index: crlfIdx, separatorLength: 2 };
  }
  if (lfIdx !== -1) {
    return { index: lfIdx, separatorLength: 1 };
  }
  return null;
}

export type StreamMboxOptions = {
  /** Stop after this many complete messages (skips reading the rest of the file). */
  maxMessages?: number;
  highWaterMark?: number;
};

/**
 * Stream an mbox file message-by-message without loading the entire file into memory.
 * With `maxMessages`, stops reading and closes the file handle once enough messages are yielded.
 */
export async function* streamMboxMessages(
  filePath: string,
  options: StreamMboxOptions = {}
): AsyncGenerator<string> {
  const stream = fs.createReadStream(filePath, {
    encoding: 'utf8',
    highWaterMark: options.highWaterMark ?? MBOX_STREAM_HIGH_WATER_MARK,
  });

  let buffer = '';
  let emitted = 0;
  const maxMessages = options.maxMessages;

  const emitIfNonEmpty = function* (raw: string): Generator<string, void> {
    const trimmed = raw.trim();
    if (!trimmed) return;
    yield trimmed;
    emitted++;
  };

  try {
    for await (const chunk of stream) {
      buffer += chunk;

      while (true) {
        const boundary = findMboxBoundary(buffer);
        if (!boundary) break;

        const message = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary.separatorLength);

        yield* emitIfNonEmpty(message);
        if (maxMessages != null && emitted >= maxMessages) {
          stream.destroy();
          return;
        }
      }
    }

    if (maxMessages == null || emitted < maxMessages) {
      yield* emitIfNonEmpty(buffer);
    }
  } finally {
    if (!stream.destroyed) {
      stream.destroy();
    }
  }
}

/** Collect all messages via streaming (avoid on multi-GB files). */
export async function readAndSplitMbox(filePath: string): Promise<string[]> {
  const out: string[] = [];
  for await (const message of streamMboxMessages(filePath)) {
    out.push(message);
  }
  return out;
}
