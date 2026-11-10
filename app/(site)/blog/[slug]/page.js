import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import Icon from '../../../../components/land/icons';
import { ArticleToc, ReadingProgress, ShareArticle } from '../../../../components/tgne/article-tools';
import { BreadcrumbStructuredData } from '../../../../components/land/structured-data';
import {
  TGNE_BLOG_POSTS,
  formatPostDate,
  getBlogPost,
  getRelatedPosts,
  slugifyHeading
} from '../../../../lib/tgne-blog';
import { absoluteSiteUrl, createPageMetadata } from '../../../../lib/site-metadata';

export function generateStaticParams() {
  return TGNE_BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) {
    return createPageMetadata({
      title: 'Article not found',
      description: 'This article could not be found.',
      path: '/blog',
      robots: { index: false, follow: true }
    });
  }
  return createPageMetadata({
    title: post.title,
    description: post.dek,
    path: `/blog/${post.slug}`,
    image: { url: post.cover.src, width: 1200, height: 800, alt: post.cover.alt },
    type: 'article'
  });
}

function ArticleBlock({ block }) {
  if (block.type === 'h2') return <h2 id={slugifyHeading(block.text)}>{block.text}</h2>;
  if (block.type === 'list') {
    return (
      <ul>
        {block.items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    );
  }
  if (block.type === 'quote') {
    return (
      <blockquote className="tgne-article-quote">
        <Icon name="quote" size={24} />
        <p>{block.text}</p>
        <cite>{block.cite}</cite>
      </blockquote>
    );
  }
  if (block.type === 'callout') {
    return (
      <aside className="tgne-article-callout">
        <span className="tgne-article-callout-mark" aria-hidden="true"><Icon name="info" size={17} /></span>
        <div>
          <strong>{block.title}</strong>
          <p>{block.text}</p>
        </div>
      </aside>
    );
  }
  return <p>{block.text}</p>;
}

export default async function BlogArticlePage({ params }) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const related = getRelatedPosts(slug, 3);
  const shareUrl = absoluteSiteUrl(`/blog/${post.slug}`);

  return (
    <article className="tgne-article">
      <ReadingProgress targetId="tgne-article-body" />

      <header className="tgne-article-hero">
        <div className="ls-container tgne-article-hero-inner">
          <BreadcrumbStructuredData items={[
            { name: 'Home', path: '/' },
            { name: 'Journal', path: '/blog' },
            { name: post.title, path: `/blog/${post.slug}` }
          ]} />
          <nav className="tgne-ed-crumb" aria-label="Breadcrumb">
            <Link href="/blog">Journal</Link>
            <span aria-hidden="true">/</span>
            <span>{post.category}</span>
          </nav>
          <h1>{post.title}</h1>
          <p className="tgne-article-dek">{post.dek}</p>
          <div className="tgne-article-byline">
            <span className="tgne-article-author">
              <span className="tgne-article-author-mark" aria-hidden="true">
                <Image src="/assets/tgne-logo.png" alt="" width={38} height={38} unoptimized />
              </span>
              <span>
                <strong>{post.author}</strong>
                <small>Technology & design · Tema, Ghana</small>
              </span>
            </span>
            <span className="tgne-article-byline-meta">
              <time dateTime={post.date}>{formatPostDate(post.date)}</time>
              <i aria-hidden="true" />
              {post.readingMinutes} min read
            </span>
          </div>
        </div>
      </header>

      <div className="ls-container tgne-article-cover-wrap">
        <figure className="tgne-article-cover">
          <Image src={post.cover.src} alt={post.cover.alt} fill priority sizes="420px" />
        </figure>
      </div>

      <div className="ls-section tgne-article-layout-wrap">
        <div className="ls-container tgne-article-layout">
          <aside className="tgne-article-aside">
            <div className="tgne-article-aside-inner">
              <ArticleToc items={post.toc} />
              <div className="tgne-article-aside-card">
                <p className="ls-eyebrow"><span /> Need a hand?</p>
                <strong>Put this into practice with us.</strong>
                <p>TGNE builds, prints, hosts and trains for organisations across Ghana.</p>
                <Link href="/contact" className="ls-button ls-button-primary">
                  Talk to TGNE <Icon name="arrowRight" size={15} />
                </Link>
              </div>
            </div>
          </aside>

          <div className="tgne-article-body" id="tgne-article-body">
            {post.body.map((block, index) => <ArticleBlock key={index} block={block} />)}

            <div className="tgne-article-tags">
              {post.tags.map((tag) => <span key={tag}>{tag}</span>)}
            </div>

            <ShareArticle title={post.title} url={shareUrl} />

            <div className="tgne-article-endnote">
              <span className="tgne-article-author-mark" aria-hidden="true">
                <Image src="/assets/tgne-logo.png" alt="" width={44} height={44} unoptimized />
              </span>
              <div>
                <strong>Written by {post.author}</strong>
                <p>
                  We are a technology and design company in Tema, Ghana, working across web and app development,
                  branding, print, ICT support, hosting and digital education.
                </p>
                <Link href="/about" className="ls-text-link">
                  More about the team <Icon name="arrowUpRight" size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="ls-section tgne-ed-related" aria-labelledby="related-articles-title">
        <div className="ls-container">
          <div className="ls-section-head tgne-section-head">
            <div>
              <p className="ls-eyebrow"><span /> Keep reading</p>
              <h2 id="related-articles-title">More from the journal</h2>
            </div>
            <Link href="/blog" className="ls-text-link">
              All articles <Icon name="arrowRight" size={15} />
            </Link>
          </div>
          <div className="tgne-ed-related-grid">
            {related.map((item) => (
              <Link className="tgne-ed-mini" href={`/blog/${item.slug}`} key={item.slug}>
                <span className="tgne-ed-mini-media">
                  <Image src={item.cover.src} alt={item.cover.alt} fill sizes="(max-width: 700px) 116px, 380px" />
                </span>
                <span className="tgne-ed-mini-body">
                  <small>{item.category} · {item.readingMinutes} min read</small>
                  <strong>{item.title}</strong>
                  <span>Read article <Icon name="arrowUpRight" size={13} /></span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </article>
  );
}