'use client';

import { useState } from 'react';
import Link from 'next/link';
import Icon from './icons';
import { formatGhs, reservationLabel } from '../../lib/land-commerce';

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TrackForm() {
  const [reference, setReference] = useState('');
  const [email, setEmail] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('idle');

  async function submit(event) {
    event.preventDefault();
    setStatus('checking');
    setError('');
    setResult(null);
    try {
      const response = await fetch('/api/land/reservations/lookup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reference, email })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || 'We could not find that reservation.');
        setStatus('error');
        return;
      }
      setResult(data.reservation);
      setStatus('done');
    } catch {
      setError('We could not reach the office. Check your connection and try again.');
      setStatus('error');
    }
  }

  return (
    <div className="ls-track">
      <form className="ls-form" onSubmit={submit} noValidate>
        {error ? <div className="ls-form-alert" role="alert">{error}</div> : null}
        <div className="ls-field">
          <label htmlFor="track-reference">Reservation reference</label>
          <input
            id="track-reference"
            name="reference"
            value={reference}
            onChange={(event) => setReference(event.target.value.toUpperCase())}
            placeholder="LL-2026-XXXXXX"
            autoComplete="off"
            required
          />
        </div>
        <div className="ls-field">
          <label htmlFor="track-email">Email used on the reservation</label>
          <input
            id="track-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <button type="submit" className="ls-button ls-button-primary ls-button-block" disabled={status === 'checking'}>
          {status === 'checking' ? 'Checking…' : 'Find my reservation'}
          {status === 'checking' ? null : <Icon name="search" size={15} />}
        </button>
      </form>

      {result ? (
        <article className="ls-track-result" aria-live="polite">
          <header>
            <div>
              <p className="ls-eyebrow">Reservation</p>
              <h3>{result.reference}</h3>
            </div>
            <span className={'ls-status ls-status-' + String(result.status).toLowerCase()}>{reservationLabel(result.status)}</span>
          </header>
          <dl>
            <div><dt>Plot</dt><dd><Link href={'/listings/' + result.listing.slug}>{result.listing.title}</Link></dd></div>
            <div><dt>Location</dt><dd>{[result.listing.district, result.listing.region].join(', ')}</dd></div>
            <div><dt>Reservation fee</dt><dd>{formatGhs(result.amount)}</dd></div>
            <div><dt>Requested</dt><dd>{formatDate(result.createdAt)}</dd></div>
            <div><dt>Contact email</dt><dd>{result.email}</dd></div>
          </dl>
          <p>
            {result.status === 'PENDING'
              ? 'The office is reviewing this reservation. Payment instructions are sent to your email; the plot is not held until the fee is confirmed.'
              : result.status === 'CONFIRMED'
                ? 'Your reservation is confirmed. The office will contact you with the next documents and payment schedule.'
                : result.status === 'COMPLETED'
                  ? 'This reservation has completed. The office can provide the sale documents and receipts.'
                  : 'This reservation was cancelled. You can reserve another plot or contact the office for details.'}
          </p>
        </article>
      ) : null}
    </div>
  );
}
