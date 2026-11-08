import { prisma } from '../../lib/prisma';
import { verifyUnsubscribeToken } from '../../lib/growth';

export const metadata = {
  title: 'Unsubscribe — LandLedger',
  robots: { index: false, follow: false }
};

export const dynamic = 'force-dynamic';

export default async function UnsubscribePage({ searchParams }) {
  const params = await searchParams;
  const token = typeof params?.token === 'string' ? params.token : '';
  const done = params?.done === '1';
  const invalidState = params?.state === 'invalid' || !token;

  const prospectId = invalidState ? '' : verifyUnsubscribeToken(token);
  let prospect = null;
  if (prospectId) {
    try {
      prospect = await prisma.prospect.findUnique({
        where: { id: prospectId },
        select: { company: true, suppressed: true, consentStatus: true }
      });
    } catch {
      prospect = null;
    }
  }

  const already = prospect?.suppressed && prospect?.consentStatus === 'WITHDRAWN';
  const valid = Boolean(prospect);

  return (
    <main className="unsubscribe-shell">
      <section className="unsubscribe-card">
        <p className="unsubscribe-eyebrow">Email preferences</p>
        {done || already ? (
          <>
            <h1>You have been unsubscribed</h1>
            <p>We will not send further marketing email to this address. Transactional messages tied to an active agreement may still be sent where required.</p>
            <p className="unsubscribe-note">If this was a mistake, contact the office directly and ask them to record a new consent.</p>
          </>
        ) : valid ? (
          <>
            <h1>Unsubscribe from outreach</h1>
            <p>This will stop marketing email to the address on file for <strong>{prospect.company}</strong> and add the record to the do-not-contact list.</p>
            <form className="unsubscribe-form" action="/api/unsubscribe" method="post">
              <input type="hidden" name="token" value={token} />
              <button className="office-button primary" type="submit">Unsubscribe</button>
            </form>
            <p className="unsubscribe-note">No account is required. The link can only be used for this recipient.</p>
          </>
        ) : (
          <>
            <h1>This link is not valid</h1>
            <p>The unsubscribe link may have expired or been copied incorrectly. Contact the office that emailed you and ask to be added to the do-not-contact list.</p>
          </>
        )}
      </section>
    </main>
  );
}
