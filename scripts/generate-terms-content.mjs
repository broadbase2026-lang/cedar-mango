import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCX = process.argv[2] ?? path.join(process.env.HOME, 'Desktop/Broadbase T&C v2.docx');
const OUT = path.join(__dirname, '../constants/terms-and-conditions.ts');

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function postProcess(html) {
  const sections = [];

  const processed = html
    .replace(/<p><strong>(\d+\.\d+)\s*([^<]*)<\/strong><\/p>/g, (_, num, title) => {
      const label = title.trim() ? `${num} ${title.trim()}` : num;
      const id = slugify(label);
      return `<h3 id="${id}" class="legal-subsection-heading">${label}</h3>`;
    })
    .replace(
      /<p><strong>(\d{1,2})\.\s+([A-Za-z][^<]*)<\/strong><\/p>/g,
      (_, num, title) => {
        const trimmed = title.trim();
        const id = `${num}-${slugify(trimmed)}`;
        sections.push({ id, number: Number(num), title: trimmed });
        return `<h2 id="${id}" class="legal-section-heading"><span class="legal-section-number">${num}.</span> ${trimmed}</h2>`;
      },
    )
    .replace(/<p><strong>Broadbase — Terms and Conditions<\/strong><\/p>/, '')
    .replace(/<p><strong>Last updated:<\/strong>\s*([^<]+)<\/p>/, (_, date) => {
      globalThis.__termsLastUpdated = date.trim();
      return '';
    })
    .replace(
      /legal@broadbase\.app/g,
      '<a href="mailto:legal@broadbase.app">legal@broadbase.app</a>',
    )
    .replace(
      /(<strong>Email:<\/strong>\s*)<a href="mailto:legal@broadbase\.app">legal@broadbase\.app<\/a>/g,
      '$1<a href="mailto:legal@broadbase.app">legal@broadbase.app</a>',
    )
    .replace(
      /(<strong>Website:<\/strong>\s*)broadbase\.app/g,
      '$1<a href="https://broadbase.app">broadbase.app</a>',
    );

  return { html: processed, sections, lastUpdated: globalThis.__termsLastUpdated ?? 'June 8, 2026' };
}

const result = await mammoth.convertToHtml({ path: DOCX });
const { html, sections, lastUpdated } = postProcess(result.value);

const file = `// Auto-generated from Broadbase T&C v2.docx — do not edit by hand.
// Regenerate with: node scripts/generate-terms-content.mjs [path-to-docx]

export const TERMS_LAST_UPDATED = ${JSON.stringify(lastUpdated)};

export const TERMS_SECTIONS = ${JSON.stringify(sections, null, 2)} as const;

export const TERMS_HTML = ${JSON.stringify(html)};
`;

fs.writeFileSync(OUT, file);
console.log(`Wrote ${OUT} (${html.length} chars, ${sections.length} sections)`);

if (result.messages.length) {
  console.warn('Mammoth messages:', result.messages);
}
