import Link from 'next/link';
import Image from 'next/image';
import Icon from './icons';
import MobileMenu from './mobile-menu';
import SiteNav from './site-nav';
import { LAND_SITE } from '../../lib/land-site';

const LINKS = [
  { href: '/', label: 'Home', children: [{ href: '/about', label: 'About Us' }] },
  { href: '/login', label: 'Client login' },
  { href: '/services', label: 'Our Services' },
  { href: '/shop', label: 'Products' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/case-studies', label: 'Case Studies' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contact Us' }
];

export default function SiteHeader() {
  return (
    <header className="ls-header">
      <div className="ls-container ls-header-inner">
        <Link href="/" className="ls-brand">
          <span className="ls-brand-mark tgne-brand-mark">
            <Image src="/assets/tgne-logo.png" alt="TGNE Solutions" width={58} height={58} loading="eager" unoptimized />
          </span>
          <span className="ls-brand-copy">
            <strong>TGNE Solutions</strong>
            <small>Technology & design</small>
          </span>
        </Link>

        <SiteNav links={LINKS} />

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
