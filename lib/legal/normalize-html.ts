function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function subsectionId(num: string, title?: string): string {
  return title ? slugify(`${num}-${title}`) : slugify(num);
}

function subsectionHeading(num: string, title?: string): string {
  const label = title ? `${num} ${title}` : num;
  const id = subsectionId(num, title);
  return `<h3 id="${id}" class="legal-subsection-heading">${label}</h3>`;
}

/** Normalise mammoth/docx HTML into consistent legal document structure. */
export function normalizeLegalHtml(html: string): string {
  let out = html ?? '';

  out = out.replace(
    /<p><strong>If you do not agree to these Terms, you must not create an Account or use the Platform\.<\/strong><\/p>/,
    '<p class="legal-callout"><strong>If you do not agree to these Terms, you must not create an Account or use the Platform.</strong></p>',
  );

  out = out.replace(
    /<p><strong>("(?:[^"]+)")<\/strong>\s+means/g,
    '<p class="legal-definition"><strong>$1</strong> means',
  );

  out = out.replace(
    /<p><strong>(\d+\.\d+)\s+([^<]+?)<\/strong>\s+([\s\S]*?)<\/p>/g,
    (_, num, title, body) => {
      const cleanTitle = title.trim().replace(/\.$/, '');
      return `${subsectionHeading(num.trim(), cleanTitle)}<p>${body.trim()}</p>`;
    },
  );

  out = out.replace(
    /<p><strong>(\d+\.\d+)\s*<\/strong>\s*([\s\S]*?)<\/p>/g,
    (_, num, body) => `${subsectionHeading(num.trim())}<p>${body.trim()}</p>`,
  );

  out = out.replace(
    /<p><strong>\(([a-z])\)\s*([^:<]+):<\/strong>\s+/gi,
    '<p class="legal-subclause"><span class="legal-subclause-label">($1)</span> <strong>$2:</strong> ',
  );

  out = out.replace(
    /(<li>[\s\S]*?) <strong>\(([a-z])\)\s*([^:<]+):<\/strong>\s*([\s\S]*?)<\/li>/gi,
    (_, liContent, letter, label, body) =>
      `${liContent}</li><p class="legal-subclause"><span class="legal-subclause-label">(${letter})</span> <strong>${label}:</strong> ${body.trim()}</p>`,
  );

  return out;
}
