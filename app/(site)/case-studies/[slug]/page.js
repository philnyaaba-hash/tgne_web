import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import Icon from '../../../../components/land/icons';
import { BreadcrumbStructuredData } from '../../../../components/land/structured-data';
import {
  TGNE_CASE_STUDIES,
  getCaseStudy,
  getCaseStudyNeighbours,
  getRelatedCaseStudies
} from '../../../../lib/tgne-case-studies';
import { createPageMetadata } from '../../../../lib/site-metadata';

export function generateStaticParams() {
  return TGNE_CASE_STUDIES.map((study) => ({ slug: study.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const study = getCaseStudy(slug);
  if (!study) return createPageMetadata({ title: 'Case study not found', description: 'This case study could not be found.', path: '/case-studies', robots: { index: false, follow: true } });
  return createPageMetadata({
    title: study.title,
    description: study.summary,
    path: `/case-studies/${study.slug}`,
    image: { url: study.cover.src, width: 1200, height: 800, alt: study.cover.alt },
    type: 'article'
  });
}

export default async function CaseStudyPage({ params }) {
  const { slug } = await params;
  const study = getCaseStudy(slug);
  if (!study) notFound();

  const { previous, next } = getCaseStudyNeighbours(slug);
  const related = getRelatedCaseStudies(slug, 3);
  const index = TGNE_CASE_STUDIES.findIndex((item) => item.slug === slug);

  const facts = [
    { label: 'Client', value: study.client },
    { label: 'Sector', value: study.sector },
    { label: 'Location', value: study.location },
    { label: 'Year', value: study.year },
    { label: 'Duration', value: study.duration }
  ];

  return (
    <article className="tgne-case-detail">
      <header className="tgne-case-detail-hero">
        <div className="ls-container">
          <BreadcrumbStructuredData items={[
            { name: 'Home', path: '/' },
            { name: 'Case studies', path: '/case-studies' },
            { name: study.title, path: `/case-studies/${study.slug}` }
          ]} />
          <nav className="tgne-ed-crumb" aria-label="Breadcrumb">
            <Link href="/case-studies">Case studies</Link>
            <span aria-hidden="true">/</span>
            <span>{study.sector}</span>
          </nav>
          <p className="ls-eyebrow"><span /> {study.group}</p>
          <h1>{study.title}</h1>
          <p className="tgne-case-detail-intro">{study.intro}</p>
          <dl className="tgne-case-detail-meta">
            {facts.slice(0, 4).map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <div className="ls-container tgne-case-cover-wrap">
        <figure className="tgne-case-cover">
          <span className="tgne-case-cover-media">
            <Image src={study.cover.src} alt={study.cover.alt} fill priority sizes="(max-width: 700px) 260px, (max-width: 900px) 280px, 400px" />
          </span>
          <figcaption className="tgne-case-cover-caption">
            <span className="tgne-case-cover-kicker">From the engagement</span>
            <p>{study.summary}</p>
            <span className="tgne-case-cover-credit">
              <span>{String(index + 1).padStart(2, '0')} — {study.client}</span>
              <span>{study.duration} · {study.year}</span>
            </span>
          </figcaption>
        </figure>
      </div>

      <div className="ls-section tgne-case-layout-wrap">
        <div className="ls-container tgne-case-layout">
          <aside className="tgne-case-facts">
            <div className="tgne-case-facts-inner">
              <h2>Engagement facts</h2>
              <dl>
                {facts.map((fact) => (
                  <div key={fact.label}>
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
              </dl>
              <h3>Services involved</h3>
              <ul className="tgne-case-facts-services">
                {study.services.map((service) => (
                  <li key={service}><Icon name="check" size={14} /> {service}</li>
                ))}
              </ul>
              <h3>Tools & methods</h3>
              <div className="tgne-case-facts-tools">
                {study.tools.map((tool) => <span key={tool}>{tool}</span>)}
              </div>
              <Link href="/contact" className="ls-button ls-button-primary tgne-case-facts-cta">
                Start something similar <Icon name="arrowRight" size={15} />
              </Link>
            </div>
          </aside>

          <div className="tgne-case-body">
            <section className="tgne-case-block" id="challenge" aria-labelledby="challenge-title">
              <p className="tgne-case-block-kicker">01 — The starting point</p>
              <h2 id="challenge-title">The challenge</h2>
              {study.challenge.map((paragraph) => <p key={paragraph.slice(0, 40)}>{paragraph}</p>)}
            </section>

            <section className="tgne-case-block" id="approach" aria-labelledby="approach-title">
              <p className="tgne-case-block-kicker">02 — How we worked</p>
              <h2 id="approach-title">Our approach</h2>
              <ol className="tgne-case-steps">
                {study.approach.map((step, stepIndex) => (
                  <li key={step.title}>
                    <span className="tgne-case-step-number">{String(stepIndex + 1).padStart(2, '0')}</span>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.copy}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section className="tgne-case-block" id="delivered" aria-labelledby="delivered-title">
              <p className="tgne-case-block-kicker">03 — What shipped</p>
              <h2 id="delivered-title">What we delivered</h2>
              <ul className="tgne-case-delivered">
                {study.delivered.map((item) => (
                  <li key={item}><Icon name="check" size={15} /><span>{item}</span></li>
                ))}
              </ul>
            </section>

            <section className="tgne-case-block" id="outcomes" aria-labelledby="outcomes-title">
              <p className="tgne-case-block-kicker">04 — What changed</p>
              <h2 id="outcomes-title">Outcomes</h2>
              <div className="tgne-case-outcomes">
                {study.metrics.map((metric) => (
                  <div key={metric.label}>
                    <strong>{metric.value}</strong>
                    <span>{metric.label}</span>
                    <small>{metric.note}</small>
                  </div>
                ))}
              </div>
              {study.outcome.map((paragraph) => <p key={paragraph.slice(0, 40)}>{paragraph}</p>)}
            </section>

            <blockquote className="tgne-case-reflection">
              <Icon name="quote" size={26} />
              <p>{study.reflection.text}</p>
              <cite>{study.reflection.attribution}</cite>
            </blockquote>
          </div>
        </div>
      </div>

      <nav className="tgne-ed-pager" aria-label="More case studies">
        <div className="ls-container tgne-ed-pager-inner">
          <Link href={`/case-studies/${previous.slug}`} className="tgne-ed-pager-link">
            <small><Icon name="arrowLeft" size={13} /> Previous</small>
            <strong>{previous.title}</strong>
          </Link>
          <Link href="/case-studies" className="tgne-ed-pager-all">All case studies</Link>
          <Link href={`/case-studies/${next.slug}`} className="tgne-ed-pager-link tgne-ed-pager-next">
            <small>Next <Icon name="arrowRight" size={13} /></small>
            <strong>{next.title}</strong>
          </Link>
        </div>
      </nav>

      <section className="ls-section tgne-ed-related" aria-labelledby="related-work-title">
        <div className="ls-container">
          <div className="ls-section-head tgne-section-head">
            <div>
              <p className="ls-eyebrow"><span /> Keep reading</p>
              <h2 id="related-work-title">Related work</h2>
            </div>
            <Link href="/case-studies" className="ls-text-link">
              All case studies <Icon name="arrowRight" size={15} />
            </Link>
          </div>
          <div className="tgne-ed-related-grid">
            {related.map((item) => (
              <Link className="tgne-ed-mini" href={`/case-studies/${item.slug}`} key={item.slug}>
                <span className="tgne-ed-mini-media">
                  <Image src={item.cover.src} alt={item.cover.alt} fill sizes="(max-width: 700px) 116px, 380px" />
                </span>
                <span className="tgne-ed-mini-body">
                  <small>{item.sector} · {item.year}</small>
                  <strong>{item.title}</strong>
                  <span>Read the case study <Icon name="arrowUpRight" size={13} /></span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="tgne-contact-band">
        <div className="ls-container tgne-contact-band-inner">
          <div>
            <p className="ls-eyebrow"><span /> Let’s talk</p>
            <h2>Have a similar<br /><em>challenge?</em></h2>
            <p>Tell us what you are working on. We will help you find the right next step.</p>
          </div>
          <div className="tgne-contact-band-actions">
            <Link href="/contact" className="ls-button ls-button-light">
              Talk to TGNE <Icon name="arrowRight" size={15} />
            </Link>
            <a href="https://wa.me/233558122767" className="tgne-contact-number">WhatsApp +233 55 812 2767</a>
          </div>
        </div>
      </section>
    </article>
  );
}