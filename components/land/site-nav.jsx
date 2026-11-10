'use client';

import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Icon from './icons';

const LINKS = [
  { href: '/', label: 'Home', children: [{ href: '/about', label: 'About Us' }] },
  { href: '/services', label: 'Our Services' },
  { href: '/shop', label: 'Products' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/case-studies', label: 'Case Studies' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contact Us' }
];

function isActive(pathname, href) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

export default function SiteNav() {
  const router = useRouter();
  const pathname = usePathname();

  const handleClick = (href) => (event) => {
    event.preventDefault();
    router.push(href);
  };

  return (
    <nav className="ls-nav" aria-label="Main navigation">
      {LINKS.map((link) => {
        const hasChildren = link.children && link.children.length > 0;
        return (
          <div key={link.href} className="ls-nav-item-wrapper">
            <a
              href={link.href}
              className="ls-nav-link"
              aria-current={isActive(pathname, link.href) ? 'page' : undefined}
              aria-haspopup={hasChildren ? 'true' : undefined}
              aria-expanded={hasChildren ? 'false' : undefined}
              onClick={handleClick(link.href)}
            >
              {link.label}
              {hasChildren && <Icon name="chevronDown" size={10} />}
            </a>
            {hasChildren && (
              <div className="ls-nav-dropdown">
                {link.children.map((child) => (
                  <a
                    key={child.href}
                    href={child.href}
                    className="ls-nav-dropdown-link"
                    aria-current={isActive(pathname, child.href) ? 'page' : undefined}
                    onClick={handleClick(child.href)}
                  >
                    {child.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
