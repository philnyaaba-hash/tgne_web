const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL;

export const siteMetadataBase = siteUrl && /^https:\/\/[^/]+/i.test(siteUrl)
  ? new URL(siteUrl)
  : new URL('https://tgne-solutions.com');

export const tgneShareImage = {
  url: '/assets/tgne-logo.png',
  width: 225,
  height: 225,
  type: 'image/png',
  alt: 'TGNE Solutions — Technology, design and ICT support in Ghana'
};
