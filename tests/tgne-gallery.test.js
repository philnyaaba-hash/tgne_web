'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { existsSync, readdirSync } = require('node:fs');
const { join } = require('node:path');

let gallery;
let shop;
let homeSlides;

async function load() {
  if (!gallery) gallery = await import('../lib/tgne-gallery.js');
  if (!shop) shop = await import('../lib/tgne-shop.js');
  if (!homeSlides) homeSlides = await import('../lib/tgne-home-slides.js');
  return { ...gallery, ...shop, ...homeSlides };
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

test('homepage slideshow contains optimized hero images and all configured portraits', async () => {
  const { TGNE_HOME_SLIDES } = await load();
  const expectedSources = [
    'https://res.cloudinary.com/z43ds8bn/image/upload/f_auto,q_auto,w_1600,c_limit/v1794397377/Smiling_Tone_Solutions_Brand_Ambassador.png',
    'https://res.cloudinary.com/z43ds8bn/image/upload/f_auto,q_auto,w_1600,c_limit/v1794397790/TGNE_Solutions_Courier_Parcel_Delivery_Scene.png',
    'https://res.cloudinary.com/ea91sdts/image/upload/f_auto,q_auto,w_1600,c_limit/v1794174711/TGNE-Creative-Business-Design-Promotion.jpg',
    'https://res.cloudinary.com/ea91sdts/image/upload/f_auto,q_auto,w_1600,c_limit/v1794174770/TGNE-Software-Development-Branding.jpg',
    'https://res.cloudinary.com/z43ds8bn/image/upload/f_auto,q_auto,w_1600,c_limit/v1794425801/Confident_Professional_in_Green_Polo.png',
    'https://res.cloudinary.com/z43ds8bn/image/upload/f_auto,q_auto,w_1600,c_limit/v1794425505/Smiling_Woman_Showcasing_Tech_Logo.png',
    'https://res.cloudinary.com/z43ds8bn/image/upload/f_auto,q_auto,w_1600,c_limit/v1794425506/TGNE_Solutions_Brand_Portrait.png'
  ];

  assert.equal(TGNE_HOME_SLIDES.length, 7);
  assert.deepEqual(TGNE_HOME_SLIDES.map((slide) => slide.src), expectedSources);
  assert.equal(TGNE_HOME_SLIDES[0].category, "Let's work together");
  assert.equal(TGNE_HOME_SLIDES[0].title, "Ready to grow your business? Let's talk.");
  for (const slide of TGNE_HOME_SLIDES) {
    assert.ok(slide.title);
    assert.ok(slide.category);
    assert.match(slide.src, /\/upload\/f_auto,q_auto,w_1600,c_limit\//);
  }
});

test('homepage product and service image mappings are assigned to the matching offerings', async () => {
  const { TGNE_SHOP_ITEMS } = await load();
  const imageByProduct = {
    computers: 'https://res.cloudinary.com/ea91sdts/image/upload/v1794219149/serving.avif',
    'software-ai': 'https://res.cloudinary.com/ea91sdts/image/upload/v1794219443/ai.avif',
    branding: 'https://res.cloudinary.com/ea91sdts/image/upload/v1794174702/TGNE-Branded-Food-Product-Jars-Alternate.jpg',
    print: 'https://res.cloudinary.com/ea91sdts/image/upload/v1794174732/TGNE-Custom-Printed-Notebooks.jpg',
    signage: 'https://res.cloudinary.com/ea91sdts/image/upload/v1794174748/TGNE-Educational-Booklet-Printing-Third.jpg',
    hosting: 'https://res.cloudinary.com/ea91sdts/image/upload/v1794219150/network-servers-set_1284-12642.avif',
    education: 'https://res.cloudinary.com/ea91sdts/image/upload/v1794219149/edu_consult.avif'
  };

  assert.ok(TGNE_SHOP_ITEMS.length > 0);
  for (const item of TGNE_SHOP_ITEMS) {
    if (imageByProduct[item.id]) {
      assert.equal(item.image, imageByProduct[item.id]);
    } else {
      assert.equal(Object.hasOwn(item, 'image'), false, `${item.id} should not add an image to its offering card`);
    }
  }
});
