import Link from 'next/link';
import Icon from '../components/land/icons';
import SiteFooter from '../components/land/site-footer';
import SiteHeader from '../components/land/site-header';
import './(site)/land.css';

export const metadata = {
  title: 'Page not found | TGNE Solutions',
  description: 'This TGNE Solutions page could not be found.',
  robots: { index: false, follow: true }
};

export default function NotFound() {
  return (
    <div className="land-site">
      <SiteHeader />
      <main>
        <section className="ls-container ls-standalone">
          <span className="ls-empty-icon"><Icon name="mapPin" size={24} /></span>
          <p className="ls-eyebrow">404</p>
          <h1>This page is not on the site.</h1>
          <p>The link may be old or mistyped. Browse the current land list or tell us what you are looking for.</p>
          <div className="ls-standalone-actions">
            <Link href="/listings" className="ls-button ls-button-primary">Browse land</Link>
            <Link href="/contact" className="ls-button ls-button-secondary">Contact the office</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
