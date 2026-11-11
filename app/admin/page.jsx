import AdminWorkspace from '../../components/admin-workspace';
import { requireAdminUser } from '../../lib/route-access';

export const metadata = {
  title: 'Admin dashboard | TGNE Solutions',
  robots: { index: false, follow: false }
};

export default async function AdminPage() {
  const user = await requireAdminUser();
  return <AdminWorkspace initialUser={user} panel="overview" />;
}
