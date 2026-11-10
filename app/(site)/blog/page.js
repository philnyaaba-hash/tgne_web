import Link from 'next/link';
import Icon from '../../../components/land/icons';
import BlogBrowser from '../../../components/tgne/blog-browser';
import { BLOG_CATEGORIES, TGNE_BLOG_POSTS } from '../../../lib/tgne-blog';
import { createPageMetadata } from '../../../lib/site-metadata';

export const metadata = createPageMetadata({
  title: 'Blog',
  description:
    'Practical writing from the TGNE Solutions team on websites, hosting, branding, print, ICT education and running technology in a Ghanaian business.',
  path: '/blog'
});

const STATS = [
  { value: String(TGNE_BLOG_POSTS.length).padStart(2, '0'), label: 'Articles published' },
  { value: String(BLOG_CATEGORIES.length - 1).padStart(2, '0'), label: 'Topics covered' },
  { value: 'Free', label: 'Advice, no signup' }
];

export default function BlogPage() {
  return (
    <>
      <section className="tgne-page-hero tgne-ed-hero">
        <div className="ls-container tgne-page-hero-inner">
          <p className="ls-eyebrow"><span /> The TGNE journal</p>
          <h1>Notes from the <em>workshop.</em></h1>
          <p>
            What we learn building websites, running print jobs, setting up networks and teaching ICT —
            written down so it is useful to someone else.
          </p>
          <dl className="tgne-ed-stats">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <dt>{stat.label}</dt>
                <dd>{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="ls-section tgne-ed-section" id="articles">
        <div className="ls-container">
          <BlogBrowser posts={TGNE_BLOG_POSTS} />
        </div>
      </section>

      <section className="tgne-contact-band">
        <div className="ls-container tgne-contact-band-inner">
          <div>
            <p className="ls-eyebrow"><span /> Ask us something</p>
            <h2>Reading is useful.<br /><em>Answers are better.</em></h2>
            <p>If your situation is not covered here, tell us about it. We will give you a straight answer.</p>
          </div>
          <div className="tgne-contact-band-actions">
            <Link href="/contact" className="ls-button ls-button-light">
              Talk to the team <Icon name="arrowRight" size={15} />
            </Link>
            <Link href="/case-studies" className="tgne-contact-number">
              See the work behind the writing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}