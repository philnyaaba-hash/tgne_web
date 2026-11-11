import { requireClientUser } from '../../lib/route-access';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Client workspace | TGNE Solutions',
  robots: { index: false, follow: false }
};

export default async function ClientLayout({ children }) {
  await requireClientUser();
  return children;
}
