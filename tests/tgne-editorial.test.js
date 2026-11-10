'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { existsSync } = require('node:fs');
const { join } = require('node:path');

let caseStudies;
let blog;

async function load() {
  if (!caseStudies) caseStudies = await import('../lib/tgne-case-studies.js');
  if (!blog) blog = await import('../lib/tgne-blog.js');
  return { ...caseStudies, ...blog };
}

function assertCoverOnDisk(cover, label) {
  assert.ok(cover.src.startsWith('/assets/'), `${label} cover should use a local asset`);
  assert.ok(cover.alt.length > 20, `${label} cover needs descriptive alt text`);
  assert.ok(existsSync(join(process.cwd(), 'public', cover.src.slice(1))), `${label} cover is missing: ${cover.src}`);
}

test('case studies are complete, uniquely addressed and use real covers', async () => {
  const { TGNE_CASE_STUDIES, CASE_STUDY_GROUPS } = await load();
  assert.ok(TGNE_CASE_STUDIES.length >= 6);
  assert.equal(new Set(TGNE_CASE_STUDIES.map((study) => study.slug)).size, TGNE_CASE_STUDIES.length);

  for (const study of TGNE_CASE_STUDIES) {
    assert.match(study.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(CASE_STUDY_GROUPS.includes(study.group), `${study.slug} has an unknown group`);
    assert.ok(study.title.length > 15);
    assert.ok(study.summary.length > 60);
    assert.ok(study.intro.length > 100);
    assert.ok(study.services.length >= 2);
    assert.ok(study.tools.length >= 3);
    assert.equal(study.metrics.length, 3);
    assert.ok(study.challenge.length >= 2);
    assert.ok(study.approach.length >= 3);
    assert.ok(study.delivered.length >= 5);
    assert.ok(study.outcome.length >= 2);
    assert.ok(study.reflection.text.length > 40);
    assert.ok(study.reflection.attribution.length > 5);
    assert.match(study.year, /^20\d{2}$/);
    assertCoverOnDisk(study.cover, study.slug);

    for (const metric of study.metrics) {
      assert.ok(metric.value && metric.label && metric.note);
    }
    for (const step of study.approach) {
      assert.ok(step.title && step.copy.length > 60);
    }
  }
});

test('case study helpers resolve slugs, neighbours and related work', async () => {
  const { TGNE_CASE_STUDIES, getCaseStudy, getCaseStudyNeighbours, getRelatedCaseStudies, getFeaturedCaseStudies } = await load();

  assert.equal(getCaseStudy('does-not-exist'), null);
  const first = TGNE_CASE_STUDIES[0];
  const last = TGNE_CASE_STUDIES[TGNE_CASE_STUDIES.length - 1];

  assert.equal(getCaseStudy(first.slug).title, first.title);
  assert.equal(getCaseStudyNeighbours(first.slug).previous.slug, last.slug);
  assert.equal(getCaseStudyNeighbours(last.slug).next.slug, first.slug);
  assert.equal(getCaseStudyNeighbours('missing').previous, null);

  const related = getRelatedCaseStudies(first.slug, 3);
  assert.equal(related.length, 3);
  assert.ok(related.every((study) => study.slug !== first.slug));
  assert.equal(new Set(related.map((study) => study.slug)).size, related.length);

  const featured = getFeaturedCaseStudies(3);
  assert.equal(featured.length, 3);
  assert.ok(featured.every((study) => study.featured));
});

test('blog posts are complete, dated, uniquely addressed and use real covers', async () => {
  const { TGNE_BLOG_POSTS, BLOG_CATEGORIES } = await load();
  assert.ok(TGNE_BLOG_POSTS.length >= 6);
  assert.equal(new Set(TGNE_BLOG_POSTS.map((post) => post.slug)).size, TGNE_BLOG_POSTS.length);

  const today = new Date().toISOString().slice(0, 10);
  const allowedBlocks = new Set(['p', 'h2', 'list', 'quote', 'callout']);

  for (const post of TGNE_BLOG_POSTS) {
    assert.match(post.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(BLOG_CATEGORIES.includes(post.category), `${post.slug} has an unknown category`);
    assert.match(post.date, /^20\d{2}-\d{2}-\d{2}$/);
    assert.ok(post.date <= today, `${post.slug} is dated in the future`);
    assert.ok(post.title.length > 20);
    assert.ok(post.dek.length > 60);
    assert.ok(post.tags.length >= 3);
    assert.ok(post.readingMinutes >= 2);
    assertCoverOnDisk(post.cover, post.slug);

    assert.ok(post.body.length >= 10);
    for (const block of post.body) {
      assert.ok(allowedBlocks.has(block.type), `${post.slug} uses unsupported block ${block.type}`);
      if (block.type === 'list') {
        assert.ok(block.items.length >= 3);
        block.items.forEach((item) => assert.ok(item.length > 15));
      } else if (block.type === 'callout') {
        assert.ok(block.title && block.text.length > 40);
      } else if (block.type === 'quote') {
        assert.ok(block.text.length > 30 && block.cite);
      } else if (block.type === 'h2') {
        assert.ok(block.text.length > 5);
      } else {
        assert.ok(block.text.length > 30);
      }
    }

    const headings = post.body.filter((block) => block.type === 'h2');
    assert.ok(headings.length >= 4, `${post.slug} needs section headings for the table of contents`);
    assert.equal(post.toc.length, headings.length);
    assert.equal(new Set(post.toc.map((entry) => entry.id)).size, post.toc.length);
    post.toc.forEach((entry) => assert.match(entry.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/));
  }

  const dates = TGNE_BLOG_POSTS.map((post) => post.date);
  assert.deepEqual(dates, [...dates].sort((a, b) => b.localeCompare(a)));
});

test('blog helpers resolve slugs, related posts and stable dates', async () => {
  const { TGNE_BLOG_POSTS, getBlogPost, getFeaturedPost, getLatestPosts, getRelatedPosts, formatPostDate, slugifyHeading } = await load();

  assert.equal(getBlogPost('does-not-exist'), null);
  const newest = TGNE_BLOG_POSTS[0];
  assert.equal(getBlogPost(newest.slug).title, newest.title);
  assert.equal(getFeaturedPost().slug, newest.slug);
  assert.equal(getLatestPosts(3).length, 3);
  assert.equal(getLatestPosts(3)[0].slug, newest.slug);

  const related = getRelatedPosts(newest.slug, 3);
  assert.equal(related.length, 3);
  assert.ok(related.every((post) => post.slug !== newest.slug));
  assert.equal(new Set(related.map((post) => post.slug)).size, related.length);

  assert.equal(formatPostDate('2026-10-28'), '28 October 2026');
  assert.equal(slugifyHeading('1. It has to load on mobile data'), '1-it-has-to-load-on-mobile-data');
});