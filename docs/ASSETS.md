# Asset and image guide

## Budgets

- Maximum 1 MB per file under `public/assets` and `public/icons`.
- Maximum 8 MB total for those folders.
- Run `npm run check:assets` before committing new imagery.

## Land images

The seven large land PNGs under `public/assets/land/` are compressed in place by:

```bash
npm run assets:optimize
```

The script keeps the same filenames and dimensions, so no component or seeded
path needs to change. Re-run it after replacing one of those images.

## Icons and manifest

The PWA, favicon and Apple touch icons are generated from
`public/assets/tgne-logo.png`:

```bash
npm run icons
```

The manifest lives at `public/manifest.json`. It must keep `/` as the start URL,
TGNE branding, and 192 px, 512 px and maskable 512 px icons.

## Adding content images

- Prefer WebP or JPEG for photography; PNG is for graphics with transparency.
- Use `next/image` with a useful `sizes` value.
- Provide alt text that describes the content, or `alt=""` when the image is
  purely decorative.
- Do not commit multi-megabyte originals to `public/`; keep source files outside
  the deployment or optimise them first.
