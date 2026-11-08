import Link from 'next/link';
import Image from 'next/image';
import Icon from './icons';
import { LAND_SITE } from '../../lib/land-site';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About Us' },
  { href: '/services', label: 'Our Services' },
  { href: '/shop', label: 'Products' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/contact', label: 'Contact Us' }
];

export default function SiteHeader() {
  return (
    <header className="ls-header">
      <div className="ls-container ls-header-inner">
        <Link href="/" className="ls-brand" aria-label="TGNE Solutions home">
          <span className="ls-brand-mark tgne-brand-mark">
            <Image src="/assets/tgne-logo.png" alt="TGNE Solutions" width={58} height={58} priority />
          </span>
          <span className="ls-brand-copy">
            <strong>TGNE Solutions</strong>
            <small>Technology & design</small>
          </span>
        </Link>

        <nav className="ls-nav" aria-label="Main navigation">
          {LINKS.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        </nav>

        <div className="ls-header-actions">
          <a href={'tel:' + LAND_SITE.phone.replace(/[^\d+]/g, '')} className="ls-button ls-button-primary ls-header-cta">
            Call Us
            <Icon name="arrowRight" size={15} />
          </a>
          <details className="ls-mobile-menu">
            <summary className="ls-menu-toggle" aria-label="Open or close navigation menu">
              <Icon name="menu" size={22} />
            </summary>
            <nav id="land-mobile-nav" className="ls-mobile-nav" aria-label="Mobile navigation">
              {LINKS.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
              <Link href="/contact" className="ls-button ls-button-primary">Contact Us <Icon name="arrowRight" size={15} /></Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
