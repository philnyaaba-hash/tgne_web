import Link from 'next/link';
import Icon from '../../../components/land/icons';
import { LAND_SITE } from '../../../lib/land-site';
import { createPageMetadata } from '../../../lib/site-metadata';

export const metadata = createPageMetadata({
  title: 'About Us',
  description: 'Meet TGNE Solutions, a Tema-based service company delivering ICT, graphic design and print, and education consultancy.',
  path: '/about'
});

const PRINCIPLES = [
  {
    title: 'Quality service and support',
    copy: 'We are committed to dependable service and support, with the aim of giving every client confidence and satisfaction in the work delivered.'
  },
  {
    title: 'A team with experience',
    copy: 'Our work draws on seasoned professionals and external consultants, bringing care and practical experience to a broad range of client needs.'
  },
  {
    title: 'Clients at the centre',
    copy: 'We work with clients through a total-involvement approach, keeping them at the centre of delivery from project inception through completion.'
  }
];

export default function AboutPage() {
  return (
    <>
      <section className="tgne-page-hero tgne-about-hero">
        <div className="ls-container tgne-page-hero-inner">
          <p className="ls-eyebrow"><span /> About {LAND_SITE.storeName}</p>
          <h1>Dream it. <em>See it.</em></h1>
          <p>
            TGNE Solutions is a service-oriented company based in Tema, Ghana, bringing together ICT, graphic design
            and print, and education consultancy.
          </p>
          <Link href="/services" className="ls-button ls-button-primary">
            Explore our services <Icon name="arrowRight" size={15} />
          </Link>
        </div>
      </section>

      <section className="ls-container ls-about-split tgne-about-story">
        <div className="tgne-about-art" aria-hidden="true">
          <span className="tgne-about-art-label">TGNE / SOLUTIONS</span>
          <div className="tgne-about-art-card">
            <span>OUR PROMISE</span>
            <strong>Ideas into<br />impact.</strong>
            <i />
            <small>Graphics · Technology · Education</small>
          </div>
          <span className="tgne-about-art-orbit" />
        </div>
        <div className="ls-about-copy">
          <p className="ls-eyebrow"><span /> What we stand for</p>
          <h2>Experience, care and a commitment to doing good work.</h2>
          <p>
            We draw on international best practices and experience to deliver a broad range of services. Our goal is
            to provide quality work and support so clients can feel confident in the service they choose.
          </p>
          <p>
            From the first conversation to the final delivery, we work alongside our clients and keep their needs at
            the centre of the project. That is what “Dream it. See it.” means to us.
          </p>
          <p className="tgne-about-location"><Icon name="mapPin" size={16} /> Based in {LAND_SITE.address}, Tema, Ghana</p>
        </div>
      </section>

      <section className="tgne-principles">
        <div className="ls-container tgne-principles-grid">
          <div>
            <p className="ls-eyebrow"><span /> The TGNE approach</p>
            <h2>Good service starts with <em>working together.</em></h2>
            <p>
              Every project is a partnership. We listen, bring the right experience to the table and stay involved
              throughout delivery.
            </p>
            <Link href="/contact" className="ls-button ls-button-light">
              Start a conversation <Icon name="arrowRight" size={15} />
            </Link>
          </div>
          <div className="tgne-principles-list">
            {PRINCIPLES.map((principle, index) => (
              <article key={principle.title}>
                <span>0{index + 1}</span>
                <div>
                  <h3>{principle.title}</h3>
                  <p>{principle.copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="tgne-service-note">
        <div className="ls-container tgne-service-note-inner">
          <div>
            <p className="ls-eyebrow"><span /> Let’s build something worthwhile</p>
            <h2>Have an idea you’re ready to see through?</h2>
            <p>Talk to our team about ICT, graphic design and print, or education consultancy.</p>
          </div>
          <Link href="/contact" className="ls-button ls-button-light">
            Contact TGNE <Icon name="arrowRight" size={15} />
          </Link>
        </div>
      </section>
    </>
  );
}
