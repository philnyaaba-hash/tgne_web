import Link from 'next/link';
import Icon from '../../../components/land/icons';
import TrackForm from '../../../components/land/track-form';
import { LAND_SITE } from '../../../lib/land-site';

export const metadata = {
  title: 'Track a reservation',
  description: 'Look up a land reservation with your reference and the email address used to reserve.'
};

export default function TrackPage() {
  return (
    <>
      <section className="ls-page-head ls-page-head-small">
        <div className="ls-container">
          <p className="ls-eyebrow">Reservation desk</p>
          <div className="ls-page-head-row">
            <h1>Track a reservation</h1>
            <p>Enter the reference from your confirmation email and the email address you used. The office updates the status when payment is confirmed.</p>
          </div>
        </div>
      </section>

      <section className="ls-container ls-track-layout">
        <TrackForm />
        <aside className="ls-aside-help">
          <h3>Finding your reference</h3>
          <p>It looks like <strong>LL-2026-AB12CD</strong> and appears on the confirmation page and email.</p>
          <p>If you cannot find it, email the office with the plot name and the name you reserved under.</p>
          <a href={'mailto:' + LAND_SITE.email} className="ls-text-link">Contact the office <Icon name="arrowRight" size={13} /></a>
          <Link href="/listings" className="ls-text-link">Browse land <Icon name="arrowRight" size={13} /></Link>
        </aside>
      </section>
    </>
  );
}
