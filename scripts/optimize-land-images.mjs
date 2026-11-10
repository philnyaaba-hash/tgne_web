import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const directory = 'public/assets/land';
const files = (await readdir(directory)).filter((file) => file.endsWith('.png'));

let saved = 0;

for (const file of files) {
  const target = path.join(directory, file);
  const before = (await stat(target)).size;
  const input = await readFile(target);
  const output = await sharp(input)
    .png({ palette: true, quality: 90, compressionLevel: 9 })
    .toBuffer();

  if (output.length < before) {
    await writeFile(target, output);
    saved += before - output.length;
    console.log(`${file}: ${(before / 1024).toFixed(0)} KB -> ${(output.length / 1024).toFixed(0)} KB`);
  } else {
    console.log(`${file}: already optimal (${(before / 1024).toFixed(0)} KB)`);
  }
}

console.log(`Saved ${(saved / 1024 / 1024).toFixed(2)} MB across ${files.length} images.`);
