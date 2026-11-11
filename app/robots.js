import { absoluteSiteUrl, siteMetadataBase } from '../lib/site-metadata';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/office', '/dashboard', '/admin', '/client', '/login', '/offline', '/track', '/listings', '/orders', '/reserve']
      }
    ],
    sitemap: absoluteSiteUrl('/sitemap.xml'),
    host: siteMetadataBase.origin
  };
}
