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

export default function SiteNav({ links, user }) {
  const pathname = usePathname();
  const isStaffUser = isStaff(user);

  // Build nav from props passed by header
  const navLinks = links ? [...links] : [
    { href: '/', label: 'Home', children: [{ href: '/about', label: 'About Us' }] },
    { href: '/services', label: 'Our Services' },
    { href: '/shop', label: 'Products' },
    { href: '/gallery', label: 'Gallery' },
    { href: '/case-studies', label: 'Case Studies' },
    { href: '/blog', label: 'Blog' },
    { href: '/contact', label: 'Contact Us' }
  ];

  if (user) {
    if (!isStaffUser) {
      navLinks.push({ href: '/client', label: 'Client Portal' });
    }
  } else {
    navLinks.push({ href: '/login', label: 'Client Login' });
  }

  return (
    <nav className="ls-nav" aria-label="Main navigation">
      {navLinks.map((link) => {
        const hasChildren = link.children && link.children.length > 0;
        return (
          <div key={link.href} className="ls-nav-item-wrapper">
            <Link
              href={link.href}
              className="ls-nav-link"
              aria-current={isActive(pathname, link.href) ? 'page' : undefined}
              aria-haspopup={hasChildren ? 'true' : undefined}
              aria-expanded={hasChildren ? 'false' : undefined}
            >
              {link.label}
              {hasChildren && <Icon name="chevronDown" size={10} />}
            </Link>
            {hasChildren && (
              <div className="ls-nav-dropdown">
                {link.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className="ls-nav-dropdown-link"
                    aria-current={isActive(pathname, child.href) ? 'page' : undefined}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
