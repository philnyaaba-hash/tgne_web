import Link from 'next/link';
import Image from 'next/image';
import Icon from './icons';
import MobileMenu from './mobile-menu';
import SiteNav from './site-nav';
import { LAND_SITE } from '../../lib/land-site';
import { isAdminUser, workspacePathForUser } from '../../lib/auth-redirect';

function initialsFor(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'TG';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function SiteHeader({ user }) {
  const isStaffUser = isAdminUser(user);
  const workspacePath = user ? workspacePathForUser(user) : '/login';
  const workspaceLabel = user
    ? (isStaffUser ? 'TGNE Workspace' : 'Client Portal')
    : 'Client Login';

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
    // Staff reach the workspace straight after sign-in, so the public menu stays clean.
    if (!isStaffUser) {
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

        <SiteNav links={navLinks} />

        <div className="ls-header-actions">
          {user ? (
            <Link href={workspacePath} className="ls-user-chip" aria-label={`Signed in as ${user.name}. Open ${workspaceLabel}.`}>
              <span className="ls-user-avatar" aria-hidden="true">{initialsFor(user.name)}</span>
              <span className="ls-user-meta">
                <strong>{user.name}</strong>
                <small>{workspaceLabel}</small>
              </span>
            </Link>
          ) : (
            <Link href="/login" className="ls-button ls-button-primary ls-header-cta">
              Client Login
              <Icon name="arrowRight" size={15} />
            </Link>
          )}
          <a href={'tel:' + LAND_SITE.phone.replace(/[^\d+]/g, '')} className="ls-button ls-button-primary ls-header-cta">
            Call Us
            <Icon name="arrowRight" size={15} />
          </a>
          <MobileMenu links={navLinks} signedIn={Boolean(user)} />
        </div>
      </div>
    </header>
  );
}
