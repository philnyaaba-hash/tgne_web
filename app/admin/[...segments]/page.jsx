import AdminWorkspace from '../../../components/admin-workspace';
import { notFound, redirect } from 'next/navigation';
import { OFFICE_PANELS } from '../../../lib/office-panels';
import { requireAdminUser } from '../../../lib/route-access';

export default async function AdminSectionPage({ params }) {
  const [user, { segments }] = await Promise.all([requireAdminUser(), params]);
  const requestedPanel = segments.length === 1 ? segments[0] : '';
  if (requestedPanel === 'office-overview') redirect('/admin');
  if (!OFFICE_PANELS[requestedPanel]) notFound();
  return <AdminWorkspace initialUser={user} panel={requestedPanel} />;
}
