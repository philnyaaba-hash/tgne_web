import SiteFooter from '../../components/land/site-footer';
import SiteHeader from '../../components/land/site-header';
import WhatsAppFloat from '../../components/land/whatsapp-float';
import { LAND_SITE } from '../../lib/land-site';
import { siteMetadataBase, tgneShareImage } from '../../lib/site-metadata';
import './land.css';
import './tgne-premium.css';

const shareTitle = 'TGNE Solutions — Technology, design and ICT support in Ghana';

export const metadata = {
  metadataBase: siteMetadataBase,
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
    images: [tgneShareImage]
  },
  twitter: {
    card: 'summary_large_image',
    title: shareTitle,
    description: LAND_SITE.description,
    images: [tgneShareImage]
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
