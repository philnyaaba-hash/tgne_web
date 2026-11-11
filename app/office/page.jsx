import { redirect } from 'next/navigation';
import { requireAdminUser } from '../../lib/route-access';

export const metadata = {
  title: 'Office | TGNE Solutions',
  robots: { index: false, follow: false }
};

export default async function OfficePage() {
  await requireAdminUser();
  redirect('/admin');
}
