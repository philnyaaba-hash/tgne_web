import SiteFooter from '../../components/land/site-footer';
import SiteHeader from '../../components/land/site-header';
import ScrollControls from '../../components/land/scroll-controls';
import WhatsAppFloat from '../../components/land/whatsapp-float';
import { OrganizationStructuredData } from '../../components/land/structured-data';
import { LAND_SITE } from '../../lib/land-site';
import { siteMetadataBase, tgneShareImage } from '../../lib/site-metadata';
import './land.css';
import './tgne-premium.css';
import './editorial.css';

const shareTitle = 'TGNE Solutions — Technology, design and ICT support in Ghana';

export const metadata = {
  metadataBase: siteMetadataBase,
  title: {
    default: 'TGNE Solutions — Technology, design and ICT support in Ghana',
    template: '%s | TGNE Solutions'
  },
  description: LAND_SITE.description,
  applicationName: 'TGNE Solutions',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-16.png', sizes: '16x16', type: 'image/png' }
    ],
    shortcut: '/icons/icon-32.png',
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }]
  },
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
    images: [{ url: tgneShareImage.url, alt: tgneShareImage.alt }]
  },
  robots: { index: true, follow: true }
};

export default function LandLayout({ children }) {
  return (
    <div className="land-site">
      <OrganizationStructuredData />
      <a className="ls-skip" href="#land-main">Skip to content</a>
      <SiteHeader />
      <main id="land-main" tabIndex={-1}>{children}</main>
      <SiteFooter />
      <ScrollControls />
      <WhatsAppFloat />
    </div>
  );
}
