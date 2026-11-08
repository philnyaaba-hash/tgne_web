import SiteFooter from '../../components/land/site-footer';
import SiteHeader from '../../components/land/site-header';
import WhatsAppFloat from '../../components/land/whatsapp-float';
import { LAND_SITE } from '../../lib/land-site';
import './land.css';
import './tgne-premium.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL;
const metadataBase = siteUrl && /^https:\/\/[^/]+/i.test(siteUrl)
  ? new URL(siteUrl)
  : new URL('https://tgne-solutions.com');
const shareTitle = 'TGNE Solutions — Technology, design and ICT support in Ghana';

export const metadata = {
  metadataBase,
  title: {
    default: 'TGNE Solutions — Technology, design and ICT support in Ghana',
    template: '%s | TGNE Solutions'
  },
  description: LAND_SITE.description,
  applicationName: 'TGNE Solutions',
  icons: { icon: '/assets/tgne-logo.png', apple: '/assets/tgne-logo.png' },
  openGraph: {
    title: shareTitle,
    description: LAND_SITE.description,
    type: 'website',
    locale: 'en_GH',
    siteName: LAND_SITE.name,
    images: [{
      url: '/assets/tgne-logo.png',
      alt: 'TGNE Solutions — Technology, design and ICT support in Ghana'
    }]
  },
  twitter: {
    card: 'summary_large_image',
    title: shareTitle,
    description: LAND_SITE.description,
    images: ['/assets/tgne-logo.png']
  },
  robots: { index: true, follow: true }
};

export default function LandLayout({ children }) {
  return (
    <div className="land-site">
      <a className="ls-skip" href="#land-main">Skip to content</a>
      <SiteHeader />
      <main id="land-main">{children}</main>
      <SiteFooter />
      <WhatsAppFloat />
    </div>
  );
}
