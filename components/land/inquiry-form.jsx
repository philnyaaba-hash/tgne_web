'use client';

import Link from 'next/link';
import { useId, useRef, useState } from 'react';
import Icon from './icons';
import { LAND_SITE } from '../../lib/land-site';

const SERVICES = [
  'Web & app development',
  'Graphic design & branding',
  'ICT solutions & hardware',
  'Print & production',
  'Hosting & web domains',
  'ICT education consultancy',
  'Other / not sure'
];

const LIMITS = {
  name: 120,
  email: 200,
  phone: 40,
  message: 2000
};

export default function InquiryForm({ listingSlug = '', defaultService = '', heading = 'Send a message', intro = '' }) {
  const [service, setService] = useState(defaultService);
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '', website: '' });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const successRef = useRef(null);
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const phoneRef = useRef(null);
  const messageRef = useRef(null);
  const fieldRefs = { name: nameRef, email: emailRef, phone: phoneRef, message: messageRef };

  const fieldId = (field) => `inquiry-${uid}-${field}`;
  const errorId = (field) => `${fieldId(field)}-error`;

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    if (error) setError('');
  }

  function validate() {
    const next = {};
    const name = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const message = form.message.trim();

    if (name.length < 2) next.name = 'Please enter your full name.';
    else if (name.length > LIMITS.name) next.name = `Please keep your name under ${LIMITS.name} characters.`;

    if (!email) next.email = 'Please enter your email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > LIMITS.email) {
      next.email = 'Please enter a valid email address.';
    }

    if (phone && (phone.replace(/\D/g, '').length < 7 || phone.length > LIMITS.phone)) {
      next.phone = 'Please enter a valid phone number, or leave it blank.';
    }

    if (message.length < 10) next.message = 'Please tell us a little more about what you need.';
    else if (message.length > LIMITS.message) next.message = `Please keep your message under ${LIMITS.message} characters.`;

    return next;
  }

  function focusFirstError(nextErrors) {
    const first = ['name', 'email', 'phone', 'message'].find((field) => nextErrors[field]);
    if (!first) return;
    window.requestAnimationFrame(() => fieldRefs[first].current?.focus());
  }

  async function submit(event) {
    event.preventDefault();
    if (status === 'sending') return;

    // Quietly accept honeypot submissions so bots do not learn the check.
    if (form.website) {
      setStatus('sent');
      return;
    }

    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      setError('Please check the highlighted fields and try again.');
      setStatus('idle');
      focusFirstError(nextErrors);
      return;
    }

    setStatus('sending');
    setError('');
    setErrors({});

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch('/api/land/inquiries', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          ...form,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          type: 'GENERAL',
          message: `${service ? `Service of interest: ${service}\n\n` : ''}${form.message.trim()}`,
          listingSlug
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const fields = result.fields || {};
        setErrors(fields);
        setError(result.error || 'Your message could not be sent. Please try again or contact us directly.');
        setStatus('error');
        focusFirstError(fields);
        return;
      }
      setStatus('sent');
      setForm({ name: '', email: '', phone: '', message: '', website: '' });
      window.requestAnimationFrame(() => successRef.current?.focus());
    } catch (caught) {
      setError(
        caught?.name === 'AbortError'
          ? 'The office did not respond in time. Please try again or call us directly.'
          : 'We could not reach the office. Check your connection and try again, or contact us directly.'
      );
      setStatus('error');
    } finally {
      window.clearTimeout(timeout);
    }
  }

  if (status === 'sent') {
    return (
      <div ref={successRef} tabIndex={-1} className="ls-form-success" role="status" aria-live="polite">
        <span className="ls-form-success-icon"><Icon name="check" size={20} /></span>
        <h3>Message received</h3>
        <p>
          Thank you for contacting TGNE Solutions. Our team will follow up using the contact details you provided,
          usually within one working day.
        </p>
        <div className="ls-form-actions">
          <button type="button" className="ls-button ls-button-secondary" onClick={() => setStatus('idle')}>
            Send another message
          </button>
          <a href={`mailto:${LAND_SITE.email}`} className="ls-text-link">Email us directly</a>
        </div>
      </div>
    );
  }

  return (
    <form className="ls-form" onSubmit={submit} noValidate aria-busy={status === 'sending'}>
      <div className="ls-form-head">
        <h3>{heading}</h3>
        {intro ? <p>{intro}</p> : null}
        <p className="ls-form-response">
          <Icon name="clock" size={14} /> We usually reply within one working day, Monday to Friday.
        </p>
      </div>

      {error ? <div className="ls-form-alert" role="alert">{error}</div> : null}

      <div className="ls-form-grid">
        <div className="ls-field">
          <label htmlFor={fieldId('name')}>Full name</label>
          <input
            ref={nameRef}
            id={fieldId('name')}
            name="name"
            value={form.name}
            onChange={(event) => update('name', event.target.value)}
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? errorId('name') : undefined}
            maxLength={LIMITS.name}
            required
          />
          {errors.name ? <span id={errorId('name')} className="ls-field-error">{errors.name}</span> : null}
        </div>
        <div className="ls-field">
          <label htmlFor={fieldId('email')}>Email</label>
          <input
            ref={emailRef}
            id={fieldId('email')}
            name="email"
            type="email"
            inputMode="email"
            value={form.email}
            onChange={(event) => update('email', event.target.value)}
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? errorId('email') : undefined}
            maxLength={LIMITS.email}
            required
          />
          {errors.email ? <span id={errorId('email')} className="ls-field-error">{errors.email}</span> : null}
        </div>
        <div className="ls-field">
          <label htmlFor={fieldId('phone')}>Phone <span>optional</span></label>
          <input
            ref={phoneRef}
            id={fieldId('phone')}
            name="phone"
            type="tel"
            inputMode="tel"
            value={form.phone}
            onChange={(event) => update('phone', event.target.value)}
            autoComplete="tel"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? errorId('phone') : undefined}
            maxLength={LIMITS.phone}
          />
          {errors.phone ? <span id={errorId('phone')} className="ls-field-error">{errors.phone}</span> : null}
        </div>
        <div className="ls-field">
          <label htmlFor={fieldId('service')}>Service of interest <span>optional</span></label>
          <select
            id={fieldId('service')}
            name="service"
            value={service}
            onChange={(event) => setService(event.target.value)}
          >
            <option value="">Select a service</option>
            {SERVICES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </div>

      <div className="ls-field">
        <label htmlFor={fieldId('message')}>Message</label>
        <textarea
          ref={messageRef}
          id={fieldId('message')}
          name="message"
          rows={5}
          value={form.message}
          onChange={(event) => update('message', event.target.value)}
          placeholder="Tell us what you want to achieve, the support you need and your preferred timeline."
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? errorId('message') : undefined}
          maxLength={LIMITS.message}
          required
        />
        {errors.message ? <span id={errorId('message')} className="ls-field-error">{errors.message}</span> : null}
      </div>

      <div className="ls-honeypot" aria-hidden="true">
        <label htmlFor={fieldId('website')}>Website</label>
        <input
          id={fieldId('website')}
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(event) => update('website', event.target.value)}
        />
      </div>

      <div className="ls-form-actions">
        <button type="submit" className="ls-button ls-button-primary" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Send message'}
          {status === 'sending' ? null : <Icon name="arrowRight" size={15} />}
        </button>
        <p className="ls-form-fineprint">
          We use your details only to answer this enquiry. Read our{' '}
          <Link href="/legal#privacy">privacy note</Link>. No marketing lists.
        </p>
      </div>
      <p className="ls-form-fallback">
        Prefer to talk? <a href={`tel:${LAND_SITE.phone.replace(/[^\d+]/g, '')}`}>Call {LAND_SITE.phone}</a>
        {' '}or <a href={`mailto:${LAND_SITE.email}`}>email {LAND_SITE.email}</a>.
      </p>
    </form>
  );
}
