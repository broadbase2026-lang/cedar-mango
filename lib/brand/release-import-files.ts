export const RELEASE_IMPORT_MAX_BYTES = 15 * 1024 * 1024;

export const RELEASE_IMPORT_ACCEPT =
  '.pdf,.docx,.txt,.html,.htm,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/html';

export type ReleaseImportFileKind = 'pdf' | 'docx' | 'text' | 'html';

export function classifyReleaseImportFile(file: File): ReleaseImportFileKind | null {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf') || file.type === 'application/pdf') return 'pdf';
  if (
    name.endsWith('.docx') ||
    file.type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx';
  }
  if (name.endsWith('.txt') || file.type === 'text/plain') return 'text';
  if (
    name.endsWith('.html') ||
    name.endsWith('.htm') ||
    file.type === 'text/html'
  ) {
    return 'html';
  }
  return null;
}

export function validateReleaseImportFile(file: File): string | null {
  if (!classifyReleaseImportFile(file)) {
    return 'Supported formats: PDF, Word (.docx), plain text (.txt), or HTML (.html).';
  }
  if (file.size > RELEASE_IMPORT_MAX_BYTES) {
    return 'File too large (max 15MB).';
  }
  return null;
}

export const RELEASE_IMPORT_FORMATS_LABEL = 'PDF, .docx, .txt, or .html';
