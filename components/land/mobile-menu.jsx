'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { clearCachedUserState } from '../../lib/session-cleanup';
import Icon from './icons';

function isActive(pathname, href) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

export default function MobileMenu({ links, signedIn }) {
  const pathname = usePathname();
  const [logoutError, setLogoutError] = useState('');

  async function handleLogout() {
    setLogoutError('');
    clearCachedUserState();
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Your session could not be invalidated.');
      window.location.assign('/login');
    } catch (error) {
      setLogoutError(error.message || 'Sign out could not be completed. Please try again.');
    }
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
        {links.map((link) => {
          if (!link.children || link.children.length === 0) {
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
        {signedIn && (
          <button
            type="button"
            className="ls-mobile-signout"
            onClick={handleLogout}
          >
            <Icon name="logout" size={14} />
            Sign out
          </button>
        )}
        {logoutError && <p role="alert">{logoutError}</p>}
      </nav>
    </details>
  );
}
