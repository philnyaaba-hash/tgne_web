import InquiryForm from '../../../components/land/inquiry-form';
import Icon from '../../../components/land/icons';
import { LAND_SITE } from '../../../lib/land-site';
import { createPageMetadata } from '../../../lib/site-metadata';

export const metadata = createPageMetadata({
  title: 'Start a project with TGNE Solutions',
  description: 'Request a project quote from TGNE Solutions for web development, branding, ICT support and digital services in Ghana.',
  path: '/sell'
});

export default function SellPage() {
  return (
    <>
      <section className="ls-page-head">
        <div className="ls-container ls-page-head-row">
          <div>
            <p className="ls-eyebrow">Project enquiry</p>
            <h1>Let’s plan the right digital solution for your business.</h1>
          </div>
          <p>
            We help businesses define the practical next step for design, digital systems, brand improvements and local ICT support.
          </p>
        </div>
      </section>

      <section className="ls-container ls-sell-layout">
        <div className="ls-sell-main">
          <div className="ls-panel">
            <div className="ls-panel-head">
              <span className="ls-panel-icon"><Icon name="document" size={19} /></span>
              <div>
                <h2>What to share</h2>
                <p>Helpful context makes it easier to recommend the right solution.</p>
              </div>
            </div>
            <ul className="ls-check-list">
              <li><Icon name="check" size={15} /> What you are trying to achieve</li>
              <li><Icon name="check" size={15} /> Your business type and target audience</li>
              <li><Icon name="check" size={15} /> Current challenges or pain points</li>
              <li><Icon name="check" size={15} /> Timeline and budget expectations</li>
              <li><Icon name="check" size={15} /> Any examples or references you like</li>
            </ul>
          </div>

          <div className="ls-panel">
            <h2>How we usually move</h2>
            <ol className="ls-numbered">
              <li><strong>Initial conversation.</strong> We understand the challenge and the business context.</li>
              <li><strong>Recommendation.</strong> We propose the most suitable service or package based on the goals.</li>
              <li><strong>Planning.</strong> We align scope, timing and deliverables before work begins.</li>
              <li><strong>Delivery.</strong> We design and build the solution with review checkpoints along the way.</li>
              <li><strong>Support.</strong> We help with launch and the support needed after deployment.</li>
            </ol>
            <p className="ls-fineprint">
              The right approach depends on your needs, so we prefer to discuss scope and expectations before recommending a fixed path.
            </p>
          </div>

          <div className="ls-panel" id="submit">
            <InquiryForm
              defaultService="Other / not sure"
              heading="Tell us about your project"
              intro="Share your goals, timeline and the kind of support you need. We will follow up with the most suitable next step."
            />
          </div>
        </div>

        <aside className="ls-sell-aside">
          <div className="tgne-sell-art" aria-hidden="true">
            <span className="ls-eyebrow"><span /> TGNE / PROJECTS</span>
            <strong>From a clear brief<br />to a confident launch.</strong>
            <span className="tgne-sell-art-rule" />
            <small>Design · Technology · Support</small>
          </div>
          <div className="ls-aside-help">
            <h3>What we can help with</h3>
            <ul className="ls-check-list is-compact">
              <li><Icon name="check" size={13} /> Website and app development</li>
              <li><Icon name="check" size={13} /> Brand and graphic design</li>
              <li><Icon name="check" size={13} /> ICT support and operational tools</li>
              <li><Icon name="check" size={13} /> Training and digital consultancy</li>
            </ul>
            <p>Questions? <a href="https://wa.me/233558122767">WhatsApp +233 55 812 2767</a></p>
            <p>{LAND_SITE.hours}</p>
          </div>
        </aside>
      </section>
    </>
  );
}
