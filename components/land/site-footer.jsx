import Link from 'next/link';
import Icon from './icons';
import { LAND_SITE } from '../../lib/land-site';

export default function SiteFooter() {
  return (
    <footer className="ls-footer">
      <div className="ls-container">
        <div className="ls-footer-grid">
          <div className="ls-footer-brand">
            <strong>{LAND_SITE.storeName}</strong>
            <p>{LAND_SITE.tagline}</p>
            <p className="ls-footer-note">
              Technology, design, and digital support for Ghanaian businesses.
            </p>
          </div>

          <div>
            <h3>Explore</h3>
            <Link href="/services">Services</Link>
            <Link href="/shop">Products & shop</Link>
            <Link href="/case-studies">Case studies</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/gallery">Gallery</Link>
            <Link href="/about">About us</Link>
            <Link href="/how-it-works">How we work</Link>
            <Link href="/faq">Questions</Link>
            <Link href="/accessibility">Accessibility</Link>
            <Link href="/contact">Contact</Link>
          </div>

          <div>
            <h3>Solutions</h3>
            <Link href="/services#web-app-development">Website design</Link>
            <Link href="/services#graphic-design-branding">Graphic branding</Link>
            <Link href="/services#ict-solutions-hardware">ICT support</Link>
            <Link href="/services#ict-education-consultancy">Training & consultancy</Link>
          </div>

          <div>
            <h3>Talk to us</h3>
            {LAND_SITE.email ? (
              <a href={'mailto:' + LAND_SITE.email}>
                <Icon name="mail" size={15} />
                {LAND_SITE.email}
              </a>
            ) : null}
            <a href={'tel:' + LAND_SITE.phone.replace(/[^\d+]/g, '')}>
              <Icon name="phone" size={15} />
              {LAND_SITE.phone}
            </a>
            <a href={'tel:' + LAND_SITE.phoneAlt.replace(/[^\d+]/g, '')}>
              <Icon name="phone" size={15} />
              {LAND_SITE.phoneAlt}
            </a>
            <a href={'tel:' + LAND_SITE.officePhone.replace(/[^\d+]/g, '')}>
              <Icon name="phone" size={15} />
              {LAND_SITE.officePhone}
            </a>
            <a href="https://wa.me/233558122767">WhatsApp</a>
            <a href={LAND_SITE.facebookUrl} target="_blank" rel="noreferrer">Facebook</a>
            <span className="ls-footer-static">
              <Icon name="mapPin" size={15} />
              {LAND_SITE.address} · {LAND_SITE.mailingAddress}
            </span>
            <a href={LAND_SITE.mapUrl} target="_blank" rel="noreferrer">
              <Icon name="arrowUpRight" size={15} />
              View location on Google Maps
            </a>
            <span className="ls-footer-static">
              <Icon name="clock" size={15} />
              {LAND_SITE.hours}
            </span>
          </div>
        </div>

        <div className="ls-footer-bottom">
          <span>© {new Date().getFullYear()} {LAND_SITE.name}. All rights reserved.</span>
          <div>
            <Link href="/services">Services</Link>
            <Link href="/shop">Shop</Link>
            <Link href="/case-studies">Case studies</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/legal">Legal & privacy</Link>
            <Link href="/accessibility">Accessibility</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
