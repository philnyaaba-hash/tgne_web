'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from './icons';
import { formatGhs, PAYMENT_METHODS, reservationAmount } from '../../lib/land-commerce';

export default function ReservationForm({ listing }) {
  const router = useRouter();
  const fee = reservationAmount(listing.price);
  const [form, setForm] = useState({ buyerName: '', email: '', phone: '', paymentMethod: 'BANK_TRANSFER', note: '', consent: false, website: '' });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setStatus('sending');
    setError('');
    setErrors({});
    try {
      const response = await fetch('/api/land/reservations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, listingSlug: listing.slug })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setErrors(result.fields || {});
        setError(result.error || 'The reservation could not be started.');
        setStatus('error');
        return;
      }
      router.push('/orders/' + result.reference + '?new=1');
    } catch {
      setError('We could not reach the office. Check your connection and try again.');
      setStatus('error');
    }
  }

  return (
    <form className="ls-form ls-reserve-form" onSubmit={submit} noValidate>
      {error ? <div className="ls-form-alert" role="alert">{error}</div> : null}

      <fieldset className="ls-fieldset">
        <legend>Your details</legend>
        <div className="ls-form-grid">
          <div className="ls-field">
            <label htmlFor="reserve-name">Full name</label>
            <input
              id="reserve-name"
              name="buyerName"
              value={form.buyerName}
              onChange={(event) => update('buyerName', event.target.value)}
              autoComplete="name"
              aria-invalid={Boolean(errors.buyerName)}
              required
            />
            {errors.buyerName ? <span className="ls-field-error">{errors.buyerName}</span> : null}
          </div>
          <div className="ls-field">
            <label htmlFor="reserve-email">Email</label>
            <input
              id="reserve-email"
              name="email"
              type="email"
              value={form.email}
              onChange={(event) => update('email', event.target.value)}
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              required
            />
            {errors.email ? <span className="ls-field-error">{errors.email}</span> : null}
          </div>
          <div className="ls-field">
            <label htmlFor="reserve-phone">Phone</label>
            <input
              id="reserve-phone"
              name="phone"
              value={form.phone}
              onChange={(event) => update('phone', event.target.value)}
              autoComplete="tel"
              aria-invalid={Boolean(errors.phone)}
              required
            />
            {errors.phone ? <span className="ls-field-error">{errors.phone}</span> : null}
          </div>
        </div>
      </fieldset>

      <fieldset className="ls-fieldset">
        <legend>How would you like to pay the reservation fee?</legend>
        <div className="ls-payment-options">
          {PAYMENT_METHODS.map((method) => (
            <label key={method.value} className={form.paymentMethod === method.value ? 'ls-payment is-selected' : 'ls-payment'}>
              <input
                type="radio"
                name="paymentMethod"
                value={method.value}
                checked={form.paymentMethod === method.value}
                onChange={(event) => update('paymentMethod', event.target.value)}
              />
              <Icon name={method.value === 'BANK_TRANSFER' ? 'bank' : method.value === 'MOBILE_MONEY' ? 'mobile' : 'mapPin'} size={18} />
              <span>{method.label}</span>
            </label>
          ))}
        </div>
        {errors.paymentMethod ? <span className="ls-field-error">{errors.paymentMethod}</span> : null}
        <p className="ls-field-note">
          No card is charged on this website. After review, the office sends payment instructions and a receipt for the
          reservation fee of {formatGhs(fee)}.
        </p>
      </fieldset>

      <div className="ls-field">
        <label htmlFor="reserve-note">Anything we should know? <span>optional</span></label>
        <textarea
          id="reserve-note"
          name="note"
          rows={4}
          value={form.note}
          onChange={(event) => update('note', event.target.value)}
          placeholder="Preferred site-visit day, questions about the title, or who you are buying with."
        />
      </div>

      <div className="ls-honeypot" aria-hidden="true">
        <label htmlFor="reserve-website">Website</label>
        <input id="reserve-website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => update('website', event.target.value)} />
      </div>

      <label className="ls-consent">
        <input
          type="checkbox"
          name="consent"
          checked={form.consent}
          onChange={(event) => update('consent', event.target.checked)}
          aria-invalid={Boolean(errors.consent)}
        />
        <span>
          I understand this is a reservation request, not a completed sale, and the office may contact me about this plot.
          {errors.consent ? <em className="ls-field-error">{errors.consent}</em> : null}
        </span>
      </label>

      <button type="submit" className="ls-button ls-button-primary ls-button-block" disabled={status === 'sending'}>
        {status === 'sending' ? 'Holding the plot…' : 'Request this reservation'}
        {status === 'sending' ? null : <Icon name="arrowRight" size={15} />}
      </button>
      <p className="ls-form-fineprint">
        We hold the plot for review and reply within one business day. The fee is {formatGhs(fee)}, credited against the
        purchase price if the sale completes under the published terms.
      </p>
    </form>
  );
}
