'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from './icons';

function isActive(pathname, href) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

export default function MobileMenu({ links }) {
  const pathname = usePathname();

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
        {links.map((link) => (
          <Link key={link.href} href={link.href} aria-current={isActive(pathname, link.href) ? 'page' : undefined}>
            {link.label}
            {link.submenu && (
              <span className="ls-mobile-submenu" aria-hidden="true">
                <Icon name="chevronDown" size={14} />
              </span>
            )}
          </Link>
        ))}
        <Link href="/contact" className="ls-button ls-button-primary">Contact Us <Icon name="arrowRight" size={15} /></Link>
      </nav>
    </details>
  );
}