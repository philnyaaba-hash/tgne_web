import Link from 'next/link';
import Image from 'next/image';
import Icon from './icons';
import MobileMenu from './mobile-menu';
import { LAND_SITE } from '../../lib/land-site';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About Us' },
  { href: '/services', label: 'Our Services' },
  { href: '/shop', label: 'Products' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/contact', label: 'Contact Us' },
  { href: '/dashboard#/client-home', label: 'Client area' }
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
          <MobileMenu links={LINKS} />
        </div>
      </div>
    </header>
  );
}
