import { requireAdminUser } from '../../lib/route-access';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Admin workspace | TGNE Solutions',
  robots: { index: false, follow: false }
};

export default async function AdminLayout({ children }) {
  await requireAdminUser();
  return children;
}
