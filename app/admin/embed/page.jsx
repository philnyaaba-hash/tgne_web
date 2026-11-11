import { OFFICE_PANELS } from '../../../lib/office-panels';
import { redirect } from 'next/navigation';
import { requireAdminUser } from '../../../lib/route-access';

export const metadata = {
  title: 'Admin workspace | TGNE Solutions',
  robots: { index: false, follow: false }
};

export default async function AdminEmbedPage({ searchParams }) {
  await requireAdminUser();
  const params = await searchParams;
  const panel = typeof params?.panel === 'string' && OFFICE_PANELS[params.panel] ? params.panel : 'overview';
  redirect(panel === 'overview' ? '/admin' : '/admin/' + panel);
}
