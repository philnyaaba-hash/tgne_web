import Link from 'next/link';
import Icon from '../../components/land/icons';

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
