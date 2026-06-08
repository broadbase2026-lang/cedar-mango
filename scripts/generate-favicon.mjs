/**
 * Letterbox the stamp favicon into square PNGs so browsers don't squash it.
 * Source: public/broadbase favicon.png
 */
import sharp from 'sharp';
import { join } from 'path';
import { fileURLToPath } from 'url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const src = join(root, 'public/broadbase favicon.png');

async function writeSquare(size, out) {
  await sharp(src)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(out);
}

await writeSquare(32, join(root, 'app/icon.png'));
await writeSquare(180, join(root, 'app/apple-icon.png'));
await writeSquare(192, join(root, 'public/favicon.png'));

console.log('Favicons generated (letterboxed, original proportions).');
