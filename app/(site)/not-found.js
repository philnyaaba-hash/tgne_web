import Link from 'next/link';
import Icon from '../../components/land/icons';
import { tgneShareImage } from '../../lib/site-metadata';

const notFoundTitle = 'Page not found | TGNE Solutions';
const notFoundDescription = 'This TGNE Solutions page could not be found. Explore our services or contact the team.';

export const metadata = {
  title: notFoundTitle,
  description: notFoundDescription,
  robots: { index: false, follow: true },
  openGraph: {
    title: notFoundTitle,
    description: notFoundDescription,
    type: 'website',
    siteName: 'TGNE Solutions',
    locale: 'en_GH',
    images: [tgneShareImage]
  },
  twitter: {
    card: 'summary_large_image',
    title: notFoundTitle,
    description: notFoundDescription,
    images: [{ url: tgneShareImage.url, alt: tgneShareImage.alt }]
  }
};

export default function TgnesolutionsNotFound() {
  return (
    <section className="ls-container ls-standalone">
      <span className="ls-empty-icon"><Icon name="info" size={24} /></span>
      <p className="ls-eyebrow">404</p>
      <h1>That page isn’t here.</h1>
      <p>The page may have moved. Explore TGNE Solutions services or get in touch with our team.</p>
      <div className="ls-standalone-actions">
        <Link href="/services" className="ls-button ls-button-primary">Explore services</Link>
        <Link href="/contact" className="ls-button ls-button-secondary">Contact TGNE</Link>
      </div>
    </section>
  );
}
