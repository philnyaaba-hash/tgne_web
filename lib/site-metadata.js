import { LAND_SITE } from './land-site';

function httpsBase(value) {
  if (!value) return null;
  try {
    const candidate = String(value).includes('://') ? String(value) : `https://${value}`;
    const url = new URL(candidate);
    return url.protocol === 'https:' ? new URL(`${url.origin}/`) : null;
  } catch {
    return null;
  }
}

export const siteMetadataBase =
  httpsBase(process.env.NEXT_PUBLIC_SITE_URL) ||
  httpsBase(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
  httpsBase(process.env.APP_URL) ||
  new URL('https://www.tgnesolutions.com/');

export function absoluteSiteUrl(path = '/') {
  return new URL(path, siteMetadataBase).toString();
}

export const tgneShareImage = {
  url: absoluteSiteUrl('/assets/tgne-share.png'),
  secureUrl: absoluteSiteUrl('/assets/tgne-share.png'),
  width: 1200,
  height: 630,
  type: 'image/png',
  alt: 'TGNE Solutions — technology, design and digital support for businesses in Ghana'
};

function shareImages(images, fallbackAlt) {
  const entries = Array.isArray(images) ? images : [images];
  return entries.filter(Boolean).map((image) => {
    const entry = typeof image === 'string' ? { url: image } : image;
    const url = new URL(entry.url, siteMetadataBase).toString();
    if (!url.startsWith('https://')) throw new Error('Social preview images must use HTTPS.');
    return {
      url,
      secureUrl: url,
      ...(entry.width ? { width: entry.width } : {}),
      ...(entry.height ? { height: entry.height } : {}),
      ...(entry.type ? { type: entry.type } : {}),
      alt: entry.alt || fallbackAlt
    };
  });
}

export function createPageMetadata({ title, description, path = '/', image = tgneShareImage, type = 'website', robots } = {}) {
  const pageTitle = /TGNE Solutions/i.test(title) ? title : `${title} | ${LAND_SITE.name}`;
  const images = shareImages(image, pageTitle);
  const url = absoluteSiteUrl(path);

  return {
    title: { absolute: pageTitle },
    description,
    alternates: { canonical: url },
    openGraph: {
      title: pageTitle,
      description,
      url,
      type,
      siteName: LAND_SITE.name,
      locale: 'en_GH',
      images
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
      images: images.map(({ url: imageUrl, alt }) => ({ url: imageUrl, alt }))
    },
    ...(robots ? { robots } : {})
  };
}
