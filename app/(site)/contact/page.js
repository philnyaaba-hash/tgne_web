import InquiryForm from '../../../components/land/inquiry-form';
import Icon from '../../../components/land/icons';
import { LAND_SITE } from '../../../lib/land-site';
import { createPageMetadata } from '../../../lib/site-metadata';

export const metadata = createPageMetadata({
  title: 'Contact TGNE Solutions',
  description: 'Contact TGNE Solutions in Tema, Ghana about website design, branding, print, ICT support and business technology services.',
  path: '/contact'
});

export default function ContactPage() {
  return (
    <>
      <section className="ls-page-head">
        <div className="ls-container ls-page-head-row">
          <div>
            <p className="ls-eyebrow">Talk to us</p>
            <h1>Let’s shape the right solution for your next step.</h1>
          </div>
          <p>
            Share what you are working toward and where you need support. We will help identify the right service
            and a clear next step for your business.
          </p>
        </div>
      </section>

      <section className="ls-container ls-contact-layout">
        <div className="ls-contact-ways">
          {LAND_SITE.email ? (
            <article className="ls-contact-card">
              <span className="ls-contact-icon"><Icon name="mail" size={19} /></span>
              <h2>Email</h2>
              <p>Best for project enquiries, quotes and detailed briefs.</p>
              <a href={'mailto:' + LAND_SITE.email}>{LAND_SITE.email}</a>
            </article>
          ) : null}
          <article className="ls-contact-card">
            <span className="ls-contact-icon"><Icon name="phone" size={19} /></span>
            <h2>Phone</h2>
            <p>Speak with our team during office hours.</p>
            <a href={'tel:' + LAND_SITE.phone.replace(/[^\d+]/g, '')}>{LAND_SITE.phone}</a>
            <a href={'tel:' + LAND_SITE.phoneAlt.replace(/[^\d+]/g, '')}>{LAND_SITE.phoneAlt}</a>
            <a href={'tel:' + LAND_SITE.officePhone.replace(/[^\d+]/g, '')}>{LAND_SITE.officePhone}</a>
            <a href="https://wa.me/233558122767">Message us on WhatsApp</a>
          </article>
          <article className="ls-contact-card">
            <span className="ls-contact-icon"><Icon name="mapPin" size={19} /></span>
            <h2>Location</h2>
            <p>Based in Tema, serving businesses across Ghana.</p>
            <span>{LAND_SITE.address}</span>
            <span>Mail: {LAND_SITE.mailingAddress}</span>
          </article>
          <article className="ls-contact-card">
            <span className="ls-contact-icon"><Icon name="clock" size={19} /></span>
            <h2>Office Hours</h2>
            <p>We're here to help during business hours.</p>
            <span>{LAND_SITE.hours}</span>
          </article>

          <div className="ls-warning is-soft tgne-response-card">
            <span className="tgne-response-icon"><Icon name="clock" size={19} /></span>
            <div>
              <span className="tgne-response-kicker">A QUICK RESPONSE STARTS HERE</span>
              <strong>Help us make our first reply useful.</strong>
              <p>
                Tell us what you want to achieve, the challenge you're facing, and when you need support. We'll
                review your brief and recommend the right service and practical next step.
              </p>
              <div className="tgne-response-points">
                <span>Your goal</span>
                <span>Your challenge</span>
                <span>Your timeframe</span>
              </div>
            </div>
          </div>
        </div>

        <div className="ls-contact-form">
          <InquiryForm
            heading="Send a message"
            intro="Share your goals, requirements and preferred timeframe. Include the service you have in mind, if you know it, and our team will guide you from there."
          />
        </div>
      </section>
    </>
  );
}
