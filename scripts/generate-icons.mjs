import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const source = 'public/assets/tgne-logo.png';
const output = 'public/icons';
const background = '#f7f6f1';

await mkdir(output, { recursive: true });

async function square(size, name, fill = background) {
  await sharp(source)
    .resize(size, size, { fit: 'contain', background: fill })
    .png({ compressionLevel: 9, quality: 92 })
    .toFile(`${output}/${name}`);
}

await square(16, 'icon-16.png');
await square(32, 'icon-32.png');
await square(180, 'apple-touch-icon.png');
await square(192, 'icon-192.png');
await square(512, 'icon-512.png');

// Maskable icons need breathing room inside the safe zone.
await sharp(source)
  .resize(410, 410, { fit: 'contain', background: '#0b2527' })
  .extend({ top: 51, bottom: 51, left: 51, right: 51, background: '#0b2527' })
  .png({ compressionLevel: 9, quality: 92 })
  .toFile(`${output}/icon-maskable-512.png`);

console.log(`Generated TGNE icons in ${output}`);
