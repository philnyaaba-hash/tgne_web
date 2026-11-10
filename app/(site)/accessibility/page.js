import Link from 'next/link';
import Icon from '../../../components/land/icons';
import { LAND_SITE } from '../../../lib/land-site';
import { createPageMetadata } from '../../../lib/site-metadata';

export const metadata = createPageMetadata({
  title: 'Accessibility',
  description: 'How TGNE Solutions makes its website usable for everyone, and how to tell us about an accessibility barrier.',
  path: '/accessibility'
});

export default function AccessibilityPage() {
  return (
    <>
      <section className="ls-page-head ls-page-head-small">
        <div className="ls-container">
          <p className="ls-eyebrow">Access for everyone</p>
          <h1>Accessibility at TGNE Solutions</h1>
          <p className="ls-legal-date">Last reviewed 9 November 2026</p>
        </div>
      </section>

      <article className="ls-container ls-legal">
        <section>
          <h2>Our commitment</h2>
          <p>
            We want this website to be useful to everyone, including people who use a keyboard, a screen reader,
            a screen magnifier, or reduced-motion settings. We aim to meet the Web Content Accessibility Guidelines
            (WCAG) 2.2 AA standard across our public pages.
          </p>
        </section>

        <section>
          <h2>What we have done</h2>
          <ul>
            <li>Every public page has a single main heading and a clear page title.</li>
            <li>Forms use visible labels, helpful error messages and a logical focus order.</li>
            <li>Interactive controls have visible focus styles and meaningful accessible names.</li>
            <li>Motion is reduced automatically when your device asks for less animation.</li>
            <li>Colour contrast is checked as part of our release process.</li>
          </ul>
        </section>

        <section>
          <h2>Known limitations</h2>
          <p>
            Some content is provided by third parties, including the embedded Google Map on our home page. We cannot
            control every aspect of those services, but we provide a direct link to Google Maps as an alternative.
            If you find another barrier, please tell us so we can fix it.
          </p>
        </section>

        <section>
          <h2>Tell us about a barrier</h2>
          <p>
            Email <a href={`mailto:${LAND_SITE.email}`}>{LAND_SITE.email}</a> or call{' '}
            <a href={`tel:${LAND_SITE.phone.replace(/[^\d+]/g, '')}`}>{LAND_SITE.phone}</a>. Describe the page and
            what happened, and we will respond within one working day where possible.
          </p>
          <p>Office hours: {LAND_SITE.hours}.</p>
        </section>

        <div className="ls-legal-foot">
          <Link href="/contact" className="ls-button ls-button-secondary">Contact us</Link>
          <Link href="/legal" className="ls-text-link">Terms and privacy</Link>
          <a href={LAND_SITE.mapUrl} className="ls-text-link" target="_blank" rel="noreferrer">
            Open the office location <Icon name="arrowUpRight" size={14} />
          </a>
        </div>
      </article>
    </>
  );
}
