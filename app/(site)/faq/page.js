import Link from 'next/link';
import Icon from '../../../components/land/icons';
import { createPageMetadata } from '../../../lib/site-metadata';

export const metadata = createPageMetadata({
  title: 'TGNE Solutions FAQs',
  description: 'Answers to common questions about TGNE Solutions web development, design, ICT support, print, hosting and training services.',
  path: '/faq'
});

const QUESTIONS = [
  {
    q: 'What kinds of work does TGNE Solutions handle?',
    a: 'We support businesses with website development, branding and graphic design, ICT setup and support, print and production, hosting guidance and ICT education consultancy.'
  },
  {
    q: 'Do you work with businesses outside Tema?',
    a: 'Yes. We are based in Tema, Ghana, and support clients across the country depending on project scope and communication needs.'
  },
  {
    q: 'Can you help if I only need a small business website?',
    a: 'Yes. We work on projects ranging from a simple online presence to more detailed corporate and service-based websites.'
  },
  {
    q: 'Do you provide branding support?',
    a: 'Yes. We can help with brand identity, marketing creatives, presentation design and visual communication for your business.'
  },
  {
    q: 'Can you support ICT and hardware needs?',
    a: 'Yes. We offer practical ICT support and guidance for day-to-day tech operations, setup and dependable digital systems.'
  },
  {
    q: 'Do you offer training or consultancy?',
    a: 'Yes. Our consultancy work includes digital education and practical training designed to help teams build better technology skills and confidence.'
  },
  {
    q: 'How do I request a quote?',
    a: 'Use the contact form or email us with a brief description of your business need, your timeline and what you would like to achieve.'
  },
  {
    q: 'Can I discuss a project before committing?',
    a: 'Yes. We typically begin with a conversation to understand the challenge, then recommend the most suitable path forward.'
  }
];

export default function FaqPage() {
  return (
    <>
      <section className="ls-page-head ls-page-head-small">
        <div className="ls-container">
          <p className="ls-eyebrow">Straight answers</p>
          <div className="ls-page-head-row">
            <h1>Frequently asked questions</h1>
            <p>Helpful answers about our services, process and how we can support your business.</p>
          </div>
        </div>
      </section>

      <section className="ls-container ls-faq">
        {QUESTIONS.map((item, index) => (
          <details key={item.q} open={index === 0}>
            <summary>
              <span>{item.q}</span>
              <Icon name="chevronDown" size={18} />
            </summary>
            <p>{item.a}</p>
          </details>
        ))}
      </section>

      <section className="ls-container ls-faq-help">
        <div>
          <h2>Still have a question?</h2>
          <p>Tell us what you need and we will help you decide the most practical next step.</p>
        </div>
        <div className="ls-faq-actions">
          <Link href="/contact" className="ls-button ls-button-primary">Contact us <Icon name="arrowRight" size={15} /></Link>
          <a href="https://wa.me/233558122767" className="ls-text-link">Message us on WhatsApp</a>
        </div>
      </section>
    </>
  );
}
