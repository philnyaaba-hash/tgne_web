'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { existsSync, readdirSync } = require('node:fs');
const { join } = require('node:path');

let gallery;
let shop;

async function load() {
  if (!gallery) gallery = await import('../lib/tgne-gallery.js');
  if (!shop) shop = await import('../lib/tgne-shop.js');
  return { ...gallery, ...shop };
}

test('homepage slideshow includes every portfolio image', async () => {
  const { TGNE_GALLERY_ITEMS } = await load();
  const imageDirectory = join(process.cwd(), 'public', 'assets', 'tgne-collection');
  const sourceImages = readdirSync(imageDirectory).filter((filename) => /\.(jpe?g|png|webp)$/i.test(filename));

  assert.equal(TGNE_GALLERY_ITEMS.length, 62);
  assert.equal(TGNE_GALLERY_ITEMS.length, sourceImages.length);
  assert.equal(new Set(TGNE_GALLERY_ITEMS.map((item) => item.src)).size, sourceImages.length);
  for (const item of TGNE_GALLERY_ITEMS) {
    assert.ok(item.title);
    assert.ok(item.category);
    assert.ok(existsSync(join(process.cwd(), 'public', item.src.slice(1))));
  }
});

test('homepage product and service offerings remain text-led without card image mappings', async () => {
  const { TGNE_SHOP_ITEMS } = await load();

  assert.ok(TGNE_SHOP_ITEMS.length > 0);
  for (const item of TGNE_SHOP_ITEMS) {
    assert.equal(Object.hasOwn(item, 'image'), false, `${item.id} should not add an image to its offering card`);
  }
});
