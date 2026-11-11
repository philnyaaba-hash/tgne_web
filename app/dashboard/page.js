import { redirect } from 'next/navigation';
import { workspacePathForUser } from '../../lib/auth-redirect';
import { currentUser } from '../../lib/office-auth';

export const metadata = {
  title: 'Workspace | TGNE Solutions',
  robots: { index: false, follow: false }
};

export default async function Page() {
  const user = await currentUser();
  if (!user) redirect('/login');
  redirect(workspacePathForUser(user));
}
