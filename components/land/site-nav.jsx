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
      {links.map((link) => {
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
          <div key={link.href} className="ls-nav-dropdown-wrapper">
            <Link
              href={link.href}
              className="ls-nav-link ls-has-children"
              aria-current={isActive(pathname, link.href) ? 'page' : undefined}
              aria-haspopup="true"
              aria-expanded="false"
            >
              {link.label}
              <Icon name="chevronDown" size={10} />
            </Link>
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
          </div>
        );
      })}
    </nav>
  );
}
