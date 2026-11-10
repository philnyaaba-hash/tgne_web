import Link from 'next/link';
import Image from 'next/image';
import Icon from './icons';
import MobileMenu from './mobile-menu';
import SiteNav from './site-nav';
import { LAND_SITE } from '../../lib/land-site';

const STAFF_ROLES = ['SUPER_ADMIN', 'OFFICE_MANAGER', 'ACCOUNTANT', 'SURVEYOR', 'RECEPTIONIST'];

function isStaff(user) {
  return user && user.roles.some((r) => STAFF_ROLES.includes(r.key));
}

export default function SiteHeader({ user }) {
  const isStaffUser = isStaff(user);

  const navLinks = [
    { href: '/', label: 'Home', children: [{ href: '/about', label: 'About Us' }] },
    { href: '/services', label: 'Our Services' },
    { href: '/shop', label: 'Products' },
    { href: '/gallery', label: 'Gallery' },
    { href: '/case-studies', label: 'Case Studies' },
    { href: '/blog', label: 'Blog' },
    { href: '/contact', label: 'Contact Us' }
  ];

  if (user) {
    if (isStaffUser) {
      navLinks.push({ href: '/dashboard', label: 'Dashboard' });
    } else {
      navLinks.push({ href: '/client', label: 'Client Portal' });
    }
  } else {
    navLinks.push({ href: '/login', label: 'Client Login' });
  }

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

        <SiteNav links={navLinks} user={user} />

        <div className="ls-header-actions">
          <a href={'tel:' + LAND_SITE.phone.replace(/[^\d+]/g, '')} className="ls-button ls-button-primary ls-header-cta">
            Call Us
            <Icon name="arrowRight" size={15} />
          </a>
          <MobileMenu links={navLinks} user={user} />
        </div>
      </div>
    </header>
  );
}
