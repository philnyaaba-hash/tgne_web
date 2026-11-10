import { Instrument_Sans } from 'next/font/google';
import OfflineBanner from '../components/OfflineBanner';
import { LAND_SITE } from '../lib/land-site';
import { siteMetadataBase, tgneShareImage } from '../lib/site-metadata';
import './globals.css';

const ui = Instrument_Sans({ subsets: ['latin'], variable: '--font-ui', display: 'swap' });

export const metadata = {
  metadataBase: siteMetadataBase,
  title: 'TGNE Solutions | Technology, design and ICT support in Ghana',
  description: LAND_SITE.description,
  applicationName: LAND_SITE.name,
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
    title: 'TGNE Solutions — Technology, design and ICT support in Ghana',
    description: LAND_SITE.description,
    type: 'website',
    locale: 'en_GH',
    siteName: 'TGNE Solutions',
    images: [tgneShareImage]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TGNE Solutions — Technology, design and ICT support in Ghana',
    description: LAND_SITE.description,
    images: [tgneShareImage]
  },
  appleWebApp: { capable: true, title: 'TGNE Solutions', statusBarStyle: 'black-translucent' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0b1f16',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={ui.variable}>
      <body className="auth-locked" suppressHydrationWarning>
        <OfflineBanner />
        {children}
      </body>
    </html>
  );
}
