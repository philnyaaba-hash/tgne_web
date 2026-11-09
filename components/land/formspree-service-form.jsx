'use client';

import { useForm, ValidationError } from '@formspree/react';
import Icon from './icons';

const FORMSPREE_FORM_ID = 'xnppkdaj';
const SERVICES = [
  'Web & app development',
  'Graphic design & branding',
  'ICT solutions & hardware',
  'Print & production',
  'Hosting & web domains',
  'ICT education consultancy',
  'Other / not sure'
];

export default function FormspreeServiceForm({ defaultService }) {
  const [state, handleSubmit] = useForm(FORMSPREE_FORM_ID);

  if (state.succeeded) {
    return (
      <div className="ls-form-success" role="status">
        <span className="ls-form-success-icon"><Icon name="check" size={20} /></span>
        <h3>Request received</h3>
        <p>Thank you for contacting TGNE Solutions. Our team will follow up using the contact details you provided.</p>
      </div>
    );
  }

  return (
    <form className="ls-form" onSubmit={handleSubmit}>
      <div className="ls-form-head">
        <h3>Your details</h3>
        <p>Tell us what you need, including your preferred timeframe.</p>
      </div>

      {state.errors ? <div className="ls-form-alert" role="alert">We couldn’t send your request. Check the details and try again.</div> : null}

      <div className="ls-form-grid">
        <div className="ls-field">
          <label htmlFor="service-request-name">Full name</label>
          <input id="service-request-name" name="name" autoComplete="name" required />
          <ValidationError field="name" errors={state.errors} className="ls-field-error" />
        </div>
        <div className="ls-field">
          <label htmlFor="service-request-email">Email</label>
          <input id="service-request-email" name="email" type="email" autoComplete="email" required />
          <ValidationError field="email" errors={state.errors} className="ls-field-error" />
        </div>
        <div className="ls-field">
          <label htmlFor="service-request-phone">Phone <span>optional</span></label>
          <input id="service-request-phone" name="phone" type="tel" autoComplete="tel" />
        </div>
        <div className="ls-field">
          <label htmlFor="service-request-service">Service of interest</label>
          <select id="service-request-service" name="service" defaultValue={defaultService} required>
            <option value="">Select a service</option>
            {SERVICES.map((service) => <option key={service} value={service}>{service}</option>)}
          </select>
          <ValidationError field="service" errors={state.errors} className="ls-field-error" />
        </div>
      </div>

      <div className="ls-field">
        <label htmlFor="service-request-message">Message</label>
        <textarea
          id="service-request-message"
          name="message"
          rows={4}
          placeholder="Tell us what you want to achieve and when you need support."
          required
        />
        <ValidationError field="message" errors={state.errors} className="ls-field-error" />
      </div>

      <div className="ls-honeypot" aria-hidden="true">
        <label htmlFor="service-request-gotcha">Leave this field empty</label>
        <input id="service-request-gotcha" name="_gotcha" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="ls-form-actions">
        <button type="submit" className="ls-button ls-button-primary" disabled={state.submitting}>
          {state.submitting ? 'Sending…' : 'Send request'}
          {state.submitting ? null : <Icon name="arrowRight" size={15} />}
        </button>
        <p className="ls-form-fineprint">We use your details only to answer this enquiry. No marketing lists.</p>
      </div>
    </form>
  );
}