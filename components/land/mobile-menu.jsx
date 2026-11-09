'use client';

import Link from 'next/link';
import Icon from './icons';

export default function MobileMenu({ links }) {
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
        {links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        <Link href="/contact" className="ls-button ls-button-primary">Contact Us <Icon name="arrowRight" size={15} /></Link>
      </nav>
    </details>
  );
}