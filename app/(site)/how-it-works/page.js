import Link from 'next/link';
import Icon from '../../../components/land/icons';
import { createPageMetadata } from '../../../lib/site-metadata';

export const metadata = createPageMetadata({
  title: 'How TGNE Solutions works',
  description: 'See how TGNE Solutions turns business needs into practical digital, design and ICT solutions through a clear, collaborative process.',
  path: '/how-it-works'
});

const STEPS = [
  {
    title: 'Start with the challenge',
    copy: 'We begin by listening to your goals, the audience you need to reach and the operational issues you want to solve.',
    detail: 'Every project starts with understanding the real problem before choosing a solution.'
  },
  {
    title: 'Define the direction',
    copy: 'We map the right mix of strategy, design and technical support so the project matches your goals and budget.',
    detail: 'This stage helps clarify priorities, deliverables and timeline.'
  },
  {
    title: 'Design and build',
    copy: 'From branding and website layout to systems setup and host configuration, we shape the solution into a working plan.',
    detail: 'We keep communication practical and review progress as the work develops.'
  },
  {
    title: 'Launch and support',
    copy: 'Once the solution is ready, we help with launch, adjustments and the ongoing support needed to keep it effective.',
    detail: 'The goal is a clean handoff and a smoother experience for your team.'
  }
];

export default function HowItWorksPage() {
  return (
    <>
      <section className="ls-page-head">
        <div className="ls-container ls-page-head-row">
          <div>
            <p className="ls-eyebrow">The process</p>
            <h1>From business need to polished execution.</h1>
          </div>
          <p>
            We keep the process simple and collaborative: understand the problem, design the right response, deliver the work,
            and support the outcome after launch.
          </p>
        </div>
      </section>

      <section className="ls-container ls-process">
        {STEPS.map((step, index) => (
          <article key={step.title} className="ls-process-step">
            <span className="ls-process-number">0{index + 1}</span>
            <div>
              <h2>{step.title}</h2>
              <p>{step.copy}</p>
              <small>{step.detail}</small>
            </div>
          </article>
        ))}
      </section>

      <section className="ls-section ls-section-tight">
        <div className="ls-container ls-split">
          <div className="tgne-process-art" aria-hidden="true">
            <span className="tgne-process-art-ring" />
            <span className="tgne-process-art-line" />
            <div className="tgne-process-art-card">
              <small>PROJECT FLOW</small>
              <strong>Brief <b>→</b> Build <b>→</b> Better</strong>
              <span><i /> Clear steps. Shared progress.</span>
            </div>
          </div>
          <div className="ls-split-copy">
            <p className="ls-eyebrow">What we focus on</p>
            <h2>Practical delivery, not just presentation.</h2>
            <ul className="ls-check-list">
              <li><Icon name="check" size={15} /> Clear communication and branding</li>
              <li><Icon name="check" size={15} /> Digital presence that supports growth</li>
              <li><Icon name="check" size={15} /> Technical systems that stay usable</li>
              <li><Icon name="check" size={15} /> Training and guidance for the people using the tools</li>
              <li><Icon name="check" size={15} /> Simple next steps with realistic timelines</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="ls-section ls-section-tight">
        <div className="ls-container ls-cta">
          <div>
            <p className="ls-eyebrow">Ready to start?</p>
            <h2>Tell us about your current challenge.</h2>
            <p>We will help guide the right path, whether it is design, technology, brand strategy or structured ICT support.</p>
          </div>
          <div className="ls-cta-actions">
            <Link href="/contact" className="ls-button ls-button-light">Request a quote <Icon name="arrowRight" size={15} /></Link>
            <Link href="/faq" className="ls-button ls-button-outline-light">Read FAQs</Link>
          </div>
        </div>
      </section>
    </>
  );
}
