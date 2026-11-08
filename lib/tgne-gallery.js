import { readdirSync } from 'node:fs';
import { join } from 'node:path';

function categoryFor(filename) {
  if (/education|training|library|classroom|booklet/i.test(filename)) return 'Education';
  if (/computer|electronic|software|technology|digital|website|vehicle/i.test(filename)) return 'Technology';
  return 'Design & print';
}

function titleFor(filename) {
  return filename
    .replace(/^TGNE-/, '')
    .replace(/\.(jpe?g|png|webp)$/i, '')
    .replace(/-Alternate$|-Third$|-Product$/i, '')
    .replace(/-/g, ' ');
}

export const TGNE_GALLERY_ITEMS = readdirSync(join(process.cwd(), 'public', 'assets', 'tgne-collection'))
  .filter((filename) => /\.(jpe?g|png|webp)$/i.test(filename))
  .sort((a, b) => a.localeCompare(b))
  .map((filename) => ({
    src: `/assets/tgne-collection/${filename}`,
    title: titleFor(filename),
    category: categoryFor(filename)
  }));
