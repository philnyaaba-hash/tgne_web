import OfficePanelView from '../../../components/office/office-panel-view';
import { requireAdminUser } from '../../../lib/route-access';
import { OFFICE_PANELS } from '../../../lib/office-panels';

export const metadata = {
  title: 'Admin workspace | TGNE Solutions',
  robots: { index: false, follow: false }
};

export default async function AdminEmbedPage({ searchParams }) {
  const [user, params] = await Promise.all([requireAdminUser(), searchParams]);
  const panel = typeof params?.panel === 'string' && OFFICE_PANELS[params.panel] ? params.panel : 'overview';
  return <OfficePanelView initialUser={user} panel={panel} />;
}
