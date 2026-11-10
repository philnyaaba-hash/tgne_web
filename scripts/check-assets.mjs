import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const roots = ['public/assets', 'public/icons'];
const maxFileBytes = 1_000_000;
const maxTotalBytes = 8_000_000;

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(target)));
    else if (entry.isFile()) files.push(target);
  }
  return files;
}

const files = [];
for (const root of roots) {
  try {
    files.push(...(await walk(root)));
  } catch {
    // A missing optional asset directory should not break the check.
  }
}

let total = 0;
const oversized = [];
const largest = [];

for (const file of files) {
  const size = (await stat(file)).size;
  total += size;
  largest.push({ file, size });
  if (size > maxFileBytes) oversized.push({ file, size });
}

largest.sort((a, b) => b.size - a.size);

console.log(`Checked ${files.length} assets: ${(total / 1024 / 1024).toFixed(2)} MB total.`);
for (const item of largest.slice(0, 8)) {
  console.log(`  ${(item.size / 1024).toFixed(0).padStart(5)} KB  ${item.file}`);
}

if (oversized.length) {
  console.error(`\n${oversized.length} file(s) exceed the 1 MB per-file budget:`);
  for (const item of oversized) console.error(`  ${(item.size / 1024).toFixed(0)} KB  ${item.file}`);
}
if (total > maxTotalBytes) {
  console.error(`\nTotal asset budget exceeded: ${(total / 1024 / 1024).toFixed(2)} MB > 8 MB.`);
}

if (oversized.length || total > maxTotalBytes) process.exit(1);
