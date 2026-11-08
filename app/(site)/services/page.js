import Link from 'next/link';
import Icon from '../../../components/land/icons';
import { TGNE_SERVICES } from '../../../lib/tgne-services';

export const metadata = {
  title: 'Services',
  description: 'Explore TGNE Solutions services: web and app development, branding, ICT hardware support, print, hosting and ICT education consultancy.'
};

export default function ServicesPage() {
  return (
    <>
      <section className="tgne-page-hero">
        <div className="ls-container tgne-page-hero-inner">
          <p className="ls-eyebrow"><span /> Services</p>
          <h1>Good work happens when the right pieces come together.</h1>
          <p>From the first idea to the details that keep it running, get creative and technical support in one place.</p>
          <Link href="/contact" className="ls-button ls-button-primary">Discuss your project <Icon name="arrowRight" size={15} /></Link>
        </div>
      </section>

      <section className="ls-section" id="products">
        <div className="ls-container">
          <div className="tgne-service-grid tgne-service-grid-page">
            {TGNE_SERVICES.map((service, index) => (
              <article className="tgne-service-card" key={service.title}>
                <span className="tgne-service-top"><span>0{index + 1}</span><Icon name={service.icon} size={20} /></span>
                <h2>{service.title}</h2>
                <p>{service.copy}</p>
                <Link href="/contact" className="tgne-service-link">Discuss this service <Icon name="arrowRight" size={14} /></Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="tgne-service-note">
        <div className="ls-container tgne-service-note-inner">
          <div>
            <p className="ls-eyebrow"><span /> A clear place to start</p>
            <h2>Not sure which service fits?</h2>
            <p>Tell us what you want to improve. We’ll help shape the right mix of technology, design and support.</p>
          </div>
          <Link href="/contact" className="ls-button ls-button-light">Talk to our team <Icon name="arrowRight" size={15} /></Link>
        </div>
      </section>
    </>
  );
}
