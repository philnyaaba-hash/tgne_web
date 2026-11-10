import { TGNE_BLOG_POSTS } from '../lib/tgne-blog';
import { TGNE_CASE_STUDIES } from '../lib/tgne-case-studies';
import { absoluteSiteUrl } from '../lib/site-metadata';

const PUBLIC_ROUTES = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/services', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/shop', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/case-studies', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/blog', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/gallery', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/about', changeFrequency: 'yearly', priority: 0.7 },
  { path: '/how-it-works', changeFrequency: 'yearly', priority: 0.6 },
  { path: '/contact', changeFrequency: 'yearly', priority: 0.8 },
  { path: '/faq', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/legal', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/accessibility', changeFrequency: 'yearly', priority: 0.3 }
];

export default function sitemap() {
  const now = new Date();

  return [
    ...PUBLIC_ROUTES.map((route) => ({
      url: absoluteSiteUrl(route.path),
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority
    })),
    ...TGNE_BLOG_POSTS.map((post) => ({
      url: absoluteSiteUrl(`/blog/${post.slug}`),
      lastModified: new Date(`${post.date}T00:00:00Z`),
      changeFrequency: 'yearly',
      priority: 0.6
    })),
    ...TGNE_CASE_STUDIES.map((study) => ({
      url: absoluteSiteUrl(`/case-studies/${study.slug}`),
      lastModified: new Date(`${study.year}-01-01T00:00:00Z`),
      changeFrequency: 'yearly',
      priority: 0.6
    }))
  ];
}
