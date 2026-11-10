'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from './icons';

function isActive(pathname, href) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

const STAFF_ROLES = ['SUPER_ADMIN', 'OFFICE_MANAGER', 'ACCOUNTANT', 'SURVEYOR', 'RECEPTIONIST'];

function isStaff(user) {
  return user && user.roles.some((r) => STAFF_ROLES.includes(r.key));
}

export default function MobileMenu({ links, user }) {
  const pathname = usePathname();
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
    <details
      className="ls-mobile-menu"
      onClick={(event) => {
        if (event.target.closest('a')) event.currentTarget.open = false;
      }}
    >
      <summary className="ls-menu-toggle" aria-label="Open or close navigation menu">
        <Icon name="menu" size={22} />
      </summary>
      <nav id="land-mobile-nav" className="ls-mobile-nav" aria-label="Mobile navigation">
        {navLinks.map((link) => {
          if (!link.children) {
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(pathname, link.href) ? 'page' : undefined}
              >
                {link.label}
              </Link>
            );
          }

          return (
            <details key={link.href} className="ls-mobile-submenu-details">
              <summary className="ls-mobile-submenu-summary" aria-expanded="false">
                {link.label}
                <Icon name="chevronDown" size={14} />
              </summary>
              {link.children.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  className="ls-mobile-submenu-link"
                  aria-current={isActive(pathname, child.href) ? 'page' : undefined}
                >
                  {child.label}
                </Link>
              ))}
            </details>
          );
        })}
        <Link href="/contact" className="ls-button ls-button-primary">Contact Us <Icon name="arrowRight" size={15} /></Link>
        {user && (
          <button type="button" className="ls-button ls-button-primary" onClick={handleLogout} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 6, border: '1px solid var(--ls-line)', background: 'transparent', color: 'var(--ls-ink)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background-color .15s ease', width: '100%' }}>
            <Icon name="logout" size={14} />
            Sign out
          </button>
        )}
      </nav>
    </details>
  );
}

async function handleLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
  } catch {}
  window.location.href = '/login';
}
