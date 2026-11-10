'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from './icons';

function isActive(pathname, href) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

export default function SiteNav({ links }) {
  const pathname = usePathname();

  return (
    <nav className="ls-nav" aria-label="Main navigation">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={isActive(pathname, link.href) ? 'page' : undefined}
        >
          {link.label}
          {link.submenu && (
            <span className="ls-nav-submenu" aria-hidden="true">
              <Icon name="chevronDown" size={10} />
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
