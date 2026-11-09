import Link from 'next/link';
import Icon from '../../../../components/land/icons';
import { formatDate, formatGhs, labelFor, PAYMENT_METHODS, RESERVATION_STATUSES } from '../../../../lib/land-commerce';
import { getReservationByReference } from '../../../../lib/land-store';
import { LAND_SITE } from '../../../../lib/land-site';
import { createPageMetadata } from '../../../../lib/site-metadata';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { reference } = await params;
  return createPageMetadata({
    title: 'Reservation status',
    description: 'View the current status of your TGNE reservation request.',
    path: `/orders/${encodeURIComponent(reference)}`,
    robots: { index: false, follow: false }
  });
}

function maskEmail(value) {
  const [name, domain] = String(value || '').split('@');
  if (!name || !domain) return '—';
  return name.slice(0, 1) + '***@' + domain;
}

const STEPS = ['Request received', 'Office review', 'Payment confirmed', 'Documents issued'];
const STEP_INDEX = { PENDING: 1, CONFIRMED: 2, COMPLETED: 3, CANCELLED: 0 };

export default async function OrderPage({ params, searchParams }) {
  const { reference } = await params;
  const query = await searchParams;
  const isNew = query?.new === '1';
  const reservation = await getReservationByReference(reference);

  if (!reservation) {
    return (
      <section className="ls-container ls-standalone">
        <span className="ls-empty-icon"><Icon name="info" size={24} /></span>
        <h1>We could not open that reservation</h1>
        <p>Check the reference in your email, or look it up with the reference and the email address you used.</p>
        <div className="ls-standalone-actions">
          <Link href="/track" className="ls-button ls-button-primary">Track a reservation</Link>
          <Link href="/listings" className="ls-button ls-button-secondary">Browse land</Link>
        </div>
      </section>
    );
  }

  const step = STEP_INDEX[reservation.status] ?? 0;
  const cancelled = reservation.status === 'CANCELLED';

  return (
    <>
      <section className="ls-order-hero">
        <div className="ls-container">
          {isNew ? (
            <>
              <span className="ls-order-check"><Icon name="check" size={24} /></span>
              <p className="ls-eyebrow">Request received</p>
              <h1>Your reservation request is with the office.</h1>
              <p className="ls-order-lead">
                Keep the reference below. A land officer will review the plot and contact you at {maskEmail(reservation.email)}{' '}
                within one business day with payment instructions.
              </p>
            </>
          ) : (
            <>
              <p className="ls-eyebrow">Reservation</p>
              <h1>{reservation.listing.title}</h1>
              <p className="ls-order-lead">Saved under {maskEmail(reservation.email)}.</p>
            </>
          )}
          <div className="ls-order-reference">
            <span>Reference</span>
            <strong>{reservation.reference}</strong>
            <span className={'ls-status ls-status-' + String(reservation.status).toLowerCase()}>{labelFor(RESERVATION_STATUSES, reservation.status)}</span>
          </div>
        </div>
      </section>

      <section className="ls-container ls-order-layout">
        <div className="ls-order-main">
          {!cancelled ? (
            <div className="ls-timeline">
              {STEPS.map((label, index) => (
                <div key={label} className={index < step ? 'is-done' : index === step ? 'is-current' : ''}>
                  <span className="ls-timeline-dot">{index < step ? <Icon name="check" size={12} /> : index + 1}</span>
                  <strong>{label}</strong>
                  <small>
                    {index === 0 ? 'Received ' + formatDate(reservation.createdAt) : index === step ? 'Current stage' : 'Pending'}
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <div className="ls-form-alert">This reservation was cancelled. Contact the office if you believe this is a mistake.</div>
          )}

          <div className="ls-panel">
            <h2>Reservation details</h2>
            <dl className="ls-order-details">
              <div><dt>Plot</dt><dd><Link href={'/listings/' + reservation.listing.slug}>{reservation.listing.title}</Link></dd></div>
              <div><dt>Location</dt><dd>{[reservation.listing.district, reservation.listing.region].join(', ')}</dd></div>
              <div><dt>Buyer</dt><dd>{reservation.buyerName}</dd></div>
              <div><dt>Contact</dt><dd>{maskEmail(reservation.email)}</dd></div>
              <div><dt>Reservation fee</dt><dd>{formatGhs(reservation.amount)}</dd></div>
              <div><dt>Payment method</dt><dd>{labelFor(PAYMENT_METHODS, reservation.paymentMethod)}</dd></div>
              <div><dt>Requested</dt><dd>{formatDate(reservation.createdAt)}</dd></div>
              <div><dt>Status</dt><dd>{labelFor(RESERVATION_STATUSES, reservation.status)}</dd></div>
            </dl>
            {reservation.note ? (
              <>
                <h3 className="ls-subhead">Your note</h3>
                <p className="ls-order-note">{reservation.note}</p>
              </>
            ) : null}
          </div>

          <div className="ls-panel">
            <h2>What happens next</h2>
            <ol className="ls-numbered">
              <li><strong>The office checks the plot.</strong> We confirm availability, the title pack and any conditions attached to the sale.</li>
              <li><strong>You receive payment instructions.</strong> The reservation fee of {formatGhs(reservation.amount)} is paid by the method you selected. Never pay a fee to a different account.</li>
              <li><strong>The reservation is confirmed.</strong> Once payment clears, the status here changes to Confirmed and the plot is held for the agreed period.</li>
              <li><strong>Documents and completion.</strong> The sale agreement, receipts and title documents are issued from the office.</li>
            </ol>
          </div>
        </div>

        <aside className="ls-order-aside">
          <div className="ls-aside-help">
            <h3>Need help?</h3>
            <p>Quote reference <strong>{reservation.reference}</strong> when you contact the office.</p>
            <a href={'mailto:' + LAND_SITE.email}>{LAND_SITE.email}</a>
            <Link href="/track" className="ls-text-link">Track another reservation <Icon name="arrowRight" size={13} /></Link>
          </div>
          <Link href="/listings" className="ls-button ls-button-secondary ls-button-block">Browse more land</Link>
        </aside>
      </section>
    </>
  );
}
