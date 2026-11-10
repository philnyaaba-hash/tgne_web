'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import Icon from '../land/icons';
import { BLOG_CATEGORIES, formatPostDate } from '../../lib/tgne-blog';

function PostCard({ post, sizes }) {
  return (
    <Link className="tgne-post-card" href={`/blog/${post.slug}`}>
      <span className="tgne-post-card-media">
        <Image src={post.cover.src} alt={post.cover.alt} fill sizes={sizes} />
        <span className="tgne-post-card-category">{post.category}</span>
      </span>
      <span className="tgne-post-card-body">
        <span className="tgne-post-card-meta">
          <time dateTime={post.date}>{formatPostDate(post.date)}</time>
          <i aria-hidden="true" />
          {post.readingMinutes} min read
        </span>
        <strong>{post.title}</strong>
        <span className="tgne-post-card-dek">{post.dek}</span>
        <span className="tgne-post-card-link">
          Read article <Icon name="arrowUpRight" size={14} />
        </span>
      </span>
    </Link>
  );
}

export default function BlogBrowser({ posts }) {
  const [category, setCategory] = useState('All posts');
  const [query, setQuery] = useState('');

  const counts = useMemo(() => {
    const result = { 'All posts': posts.length };
    for (const name of BLOG_CATEGORIES) {
      if (name !== 'All posts') result[name] = posts.filter((post) => post.category === name).length;
    }
    return result;
  }, [posts]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return posts.filter((post) => {
      const inCategory = category === 'All posts' || post.category === category;
      const haystack = `${post.title} ${post.dek} ${post.category} ${post.tags.join(' ')}`.toLowerCase();
      return inCategory && (!search || haystack.includes(search));
    });
  }, [category, posts, query]);

  const isDefaultView = category === 'All posts' && !query.trim();
  const lead = isDefaultView ? filtered[0] : null;
  const rest = lead ? filtered.slice(1) : filtered;

  const reset = () => {
    setCategory('All posts');
    setQuery('');
  };

  return (
    <>
      <div className="tgne-ed-tools">
        <div className="tgne-ed-filters" role="group" aria-label="Filter articles by topic">
          {BLOG_CATEGORIES.map((name) => (
            <button
              type="button"
              key={name}
              className={category === name ? 'is-active' : ''}
              aria-pressed={category === name}
              onClick={() => setCategory(name)}
            >
              {name}
              <span>{counts[name] || 0}</span>
            </button>
          ))}
        </div>
        <label className="tgne-ed-search">
          <Icon name="search" size={16} />
          <span className="tgne-ed-sr">Search articles</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the journal"
          />
          {query ? (
            <button type="button" onClick={() => setQuery('')} aria-label="Clear search">
              <Icon name="close" size={14} />
            </button>
          ) : null}
        </label>
      </div>

      <p className="tgne-ed-results" aria-live="polite">
        <span>
          {filtered.length} {filtered.length === 1 ? 'article' : 'articles'}
          {category !== 'All posts' ? ` in ${category}` : ''}
        </span>
        <span>Written by the TGNE team in Tema</span>
      </p>

      {lead ? (
        <Link className="tgne-post-lead" href={`/blog/${lead.slug}`}>
          <span className="tgne-post-lead-media">
            <Image src={lead.cover.src} alt={lead.cover.alt} fill priority sizes="(max-width: 700px) 300px, (max-width: 900px) 260px, 400px" />
            <span className="tgne-post-lead-flag">Latest article</span>
          </span>
          <span className="tgne-post-lead-body">
            <span className="tgne-post-card-meta">
              <small>{lead.category}</small>
              <i aria-hidden="true" />
              <time dateTime={lead.date}>{formatPostDate(lead.date)}</time>
              <i aria-hidden="true" />
              {lead.readingMinutes} min read
            </span>
            <strong>{lead.title}</strong>
            <span className="tgne-post-lead-dek">{lead.dek}</span>
            <span className="tgne-post-lead-tags">
              {lead.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}
            </span>
            <span className="tgne-post-card-link">
              Read the article <Icon name="arrowRight" size={15} />
            </span>
          </span>
        </Link>
      ) : null}

      {rest.length ? (
        <div className="tgne-post-grid">
          {rest.map((post) => (
            <PostCard key={post.slug} post={post} sizes="(max-width: 700px) 100vw, (max-width: 900px) 50vw, 380px" />
          ))}
        </div>
      ) : null}

      {!filtered.length ? (
        <div className="tgne-ed-empty">
          <span aria-hidden="true"><Icon name="search" size={22} /></span>
          <h3>Nothing published on that yet</h3>
          <p>Try another term or topic. If it is something you need answered, ask us directly.</p>
          <div className="tgne-ed-empty-actions">
            <button type="button" className="ls-button ls-button-primary" onClick={reset}>
              Show all articles <Icon name="arrowRight" size={15} />
            </button>
            <Link href="/contact" className="ls-text-link">Ask the team <Icon name="arrowUpRight" size={14} /></Link>
          </div>
        </div>
      ) : null}
    </>
  );
}