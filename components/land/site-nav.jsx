import Link from 'next/link';
import Icon from './icons';

export default function SiteNav({ links }) {
  return (
    <nav className="ls-nav" aria-label="Main navigation">
      {links.map((link) => {
        const hasChildren = link.children && link.children.length > 0;
        return (
          <div key={link.href} className="ls-nav-item-wrapper">
            <Link
              href={link.href}
              className="ls-nav-link"
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
