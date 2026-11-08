import Link from 'next/link';
import { LAND_SITE } from '../../../lib/land-site';

export const metadata = {
  title: 'Terms and privacy',
  description: 'Website terms and privacy information for TGNE Solutions.'
};

export default function LegalPage() {
  return (
    <>
      <section className="ls-page-head ls-page-head-small">
        <div className="ls-container">
          <p className="ls-eyebrow">The fine print, in plain language</p>
          <h1>Terms and privacy</h1>
          <p className="ls-legal-date">Last updated 8 November 2026</p>
        </div>
      </section>

      <article className="ls-container ls-legal">
        <section>
          <h2>1. This website</h2>
          <p>
            This website is operated by {LAND_SITE.name}. It provides information about our services, project enquiries,
            and contact channels for businesses seeking technology, design and ICT support.
          </p>
          <p>
            Information on this site is provided for general business awareness. It does not replace direct consultation,
            a written quote, or any formal contractual agreement.
          </p>
        </section>

        <section>
          <h2>2. Service information</h2>
          <p>
            We aim to keep descriptions of our services accurate and current. However, the scope, timeline, and pricing of
            any project may vary depending on the client’s goals, technical requirements, and agreed deliverables.
          </p>
        </section>

        <section>
          <h2>3. Enquiries and quotes</h2>
          <p>
            When you send a message or request a quote, we may collect your name, email address, phone number, company
            information and a summary of your need. We use that information to respond to your enquiry and discuss the most
            suitable next step.
          </p>
          <p>
            A quote or project proposal is only binding when both parties accept the terms in writing.
          </p>
        </section>

        <section id="privacy">
          <h2>4. Privacy</h2>
          <p>
            We keep contact information only for communication related to your enquiry or project. We do not sell personal
            information or add it to unrelated marketing lists without clear consent.
          </p>
          <ul>
            <li>We use your details only to answer questions, prepare a quote, or manage agreed project communications.</li>
            <li>We will share information only with the people working directly on your project where required.</li>
            <li>You may ask us to correct or clarify the details we hold about you.</li>
          </ul>
        </section>

        <section>
          <h2>5. Liability</h2>
          <p>
            This website is offered as a general information and enquiry service. To the degree permitted by law, {LAND_SITE.name}
            is not responsible for business decisions made without direct consultation or written project terms.
          </p>
          <p>These terms are governed by the laws of Ghana.</p>
        </section>

        <section>
          <h2>6. Contact</h2>
          <p>
            Questions about these terms or a business enquiry: <a href={'tel:' + LAND_SITE.phone.replace(/[^\d+]/g, '')}>{LAND_SITE.phone}</a>.
            Office hours: {LAND_SITE.hours}.
          </p>
        </section>

        <div className="ls-legal-foot">
          <Link href="/contact" className="ls-button ls-button-secondary">Contact us</Link>
          <Link href="/faq" className="ls-text-link">Read the FAQs</Link>
        </div>
      </article>
    </>
  );
}
