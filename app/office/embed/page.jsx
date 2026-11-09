import OfficePanelView from '../../../components/office/office-panel-view';
import { currentUser } from '../../../lib/office-auth';
import { OFFICE_PANELS } from '../../../lib/office-panels';

export const metadata = {
  title: 'Office workspace | TGNE Solutions',
  robots: { index: false, follow: false }
};

export default async function OfficeEmbedPage({ searchParams }) {
  const params = await searchParams;
  const panel = typeof params?.panel === 'string' && OFFICE_PANELS[params.panel] ? params.panel : 'overview';
  const user = await currentUser();
  if (!user) {
    return (
      <main className="office-embed">
        <section className="office-embed-denied">
          <h1>Sign in required</h1>
          <p>Your workspace session has ended. Return to the dashboard to sign in, then open this page again.</p>
          <a className="office-button primary" href="/dashboard" target="_top">Return to sign in</a>
        </section>
      </main>
    );
  }
  return <OfficePanelView initialUser={user} panel={panel} />;
}
