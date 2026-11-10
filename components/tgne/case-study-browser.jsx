'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import Icon from '../land/icons';
import { CASE_STUDY_GROUPS } from '../../lib/tgne-case-studies';

export default function CaseStudyBrowser({ studies }) {
  const [group, setGroup] = useState('All work');
  const [query, setQuery] = useState('');

  const counts = useMemo(() => {
    const result = { 'All work': studies.length };
    for (const name of CASE_STUDY_GROUPS) {
      if (name !== 'All work') result[name] = studies.filter((study) => study.group === name).length;
    }
    return result;
  }, [studies]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return studies.filter((study) => {
      const inGroup = group === 'All work' || study.group === group;
      const haystack = `${study.title} ${study.summary} ${study.client} ${study.sector} ${study.services.join(' ')}`.toLowerCase();
      return inGroup && (!search || haystack.includes(search));
    });
  }, [group, query, studies]);

  const reset = () => {
    setGroup('All work');
    setQuery('');
  };

  return (
    <>
      <div className="tgne-ed-tools">
        <div className="tgne-ed-filters" role="group" aria-label="Filter case studies by service area">
          {CASE_STUDY_GROUPS.map((name) => (
            <button
              type="button"
              key={name}
              className={group === name ? 'is-active' : ''}
              aria-pressed={group === name}
              onClick={() => setGroup(name)}
            >
              {name}
              <span>{counts[name] || 0}</span>
            </button>
          ))}
        </div>
        <label className="tgne-ed-search">
          <Icon name="search" size={16} />
          <span className="tgne-ed-sr">Search case studies</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search engagements"
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
          {filtered.length} {filtered.length === 1 ? 'engagement' : 'engagements'}
          {group !== 'All work' ? ` in ${group}` : ''}
        </span>
        <span>Delivered from Tema, Ghana</span>
      </p>

      {filtered.length ? (
        <div className="tgne-case-grid">
          {filtered.map((study) => {
            const index = studies.findIndex((item) => item.slug === study.slug);
            return (
              <Link className="tgne-case-card" href={`/case-studies/${study.slug}`} key={study.slug}>
                <span className="tgne-case-card-media">
                  <Image
                    src={study.cover.src}
                    alt={study.cover.alt}
                    fill
                    sizes="(max-width: 700px) 100vw, (max-width: 900px) 50vw, 380px"
                  />
                  <span className="tgne-case-card-index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="tgne-case-card-year">{study.year}</span>
                </span>
                <span className="tgne-case-card-body">
                  <span className="tgne-case-card-meta">
                    <small>{study.sector}</small>
                    <i aria-hidden="true" />
                    {study.duration}
                  </span>
                  <strong>{study.title}</strong>
                  <span className="tgne-case-card-summary">{study.summary}</span>
                  <span className="tgne-case-card-metrics">
                    {study.metrics.slice(0, 2).map((metric) => (
                      <span key={metric.label}>
                        <b>{metric.value}</b>
                        {metric.label}
                      </span>
                    ))}
                  </span>
                  <span className="tgne-case-card-link">
                    Read the case study <Icon name="arrowUpRight" size={14} />
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="tgne-ed-empty">
          <span aria-hidden="true"><Icon name="search" size={22} /></span>
          <h3>No engagements match that search</h3>
          <p>Try a different term, or browse the full set of case studies.</p>
          <button type="button" className="ls-button ls-button-primary" onClick={reset}>
            Show all case studies <Icon name="arrowRight" size={15} />
          </button>
        </div>
      )}
    </>
  );
}