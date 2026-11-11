import ClientPortal from '../../components/client-portal/client-portal';
import { requireClientUser } from '../../lib/route-access';

export const metadata = {
  title: 'Client Portal | TGNE Solutions',
  robots: { index: false, follow: false }
};

export default async function ClientPage() {
  const user = await requireClientUser();
  return <ClientPortal key={user.id} mode="client" user={user} initialPage="overview" />;
}
