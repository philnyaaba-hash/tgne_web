import { redirect } from 'next/navigation';
import ClientPortal from '../../../components/client-portal/client-portal';
import { requireClientUser } from '../../../lib/route-access';

const CLIENT_PAGES = {
  profile: 'profile',
  settings: 'settings',
  orders: 'orders',
  tracking: 'tracking',
  quotes: 'quotes',
  invoices: 'invoices',
  documents: 'documents',
  team: 'team',
  support: 'support',
  'new-order': 'new-order'
};

export default async function ClientSectionPage({ params, searchParams }) {
  const user = await requireClientUser();
  const [{ segments }, query = {}] = await Promise.all([params, searchParams]);
  const initialPage = segments.length === 1 ? CLIENT_PAGES[segments[0]] : null;
  if (!initialPage) redirect('/client');
  const initialSelectedId = typeof query?.order === 'string' ? query.order : undefined;
  return <ClientPortal key={`${user.id}:${initialPage}:${initialSelectedId || ''}`} mode="client" user={user} initialPage={initialPage} initialSelectedId={initialSelectedId} />;
}
