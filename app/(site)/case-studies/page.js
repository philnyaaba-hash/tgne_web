import Link from 'next/link';
import Icon from '../../../components/land/icons';
import CaseStudyBrowser from '../../../components/tgne/case-study-browser';
import { CASE_STUDY_GROUPS, TGNE_CASE_STUDIES } from '../../../lib/tgne-case-studies';
import { createPageMetadata } from '../../../lib/site-metadata';

export const metadata = createPageMetadata({
  title: 'Case Studies',
  description:
    'How TGNE Solutions delivers web platforms, brand and print programmes, ICT infrastructure and digital education for organisations in Ghana. Six engagements, in detail.',
  path: '/case-studies'
});

const STATS = [
  { value: String(TGNE_CASE_STUDIES.length).padStart(2, '0'), label: 'Engagements documented' },
  { value: String(CASE_STUDY_GROUPS.length - 1).padStart(2, '0'), label: 'Service areas covered' },
  { value: 'Tema', label: 'Where the work is made' }
];

export default function CaseStudiesPage() {
  return (
    <>
      <section className="tgne-page-hero tgne-ed-hero">
        <div className="ls-container tgne-page-hero-inner">
          <p className="ls-eyebrow"><span /> Case studies</p>
          <h1>Work you can <em>point to.</em></h1>
          <p>
            Six engagements across software, brand, infrastructure and education — what the problem was,
            how we approached it, and what changed afterwards.
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

      <section className="ls-section tgne-ed-section" id="engagements">
        <div className="ls-container">
          <CaseStudyBrowser studies={TGNE_CASE_STUDIES} />
          <p className="tgne-ed-note">
            Engagements are described by sector and scope. Client names and references are available on request.
          </p>
        </div>
      </section>

      <section className="tgne-contact-band">
        <div className="ls-container tgne-contact-band-inner">
          <div>
            <p className="ls-eyebrow"><span /> Your project next</p>
            <h2>Something here looks<br /><em>like your problem?</em></h2>
            <p>Tell us what you are trying to fix. We will tell you honestly whether we are the right team for it.</p>
          </div>
          <div className="tgne-contact-band-actions">
            <Link href="/contact" className="ls-button ls-button-light">
              Start a conversation <Icon name="arrowRight" size={15} />
            </Link>
            <Link href="/services" className="tgne-contact-number">
              See what we do
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}