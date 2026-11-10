import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import ClientPortal from '../../components/client-portal/client-portal';

export const metadata = {
  title: 'Client Portal | TGNE Solutions',
  robots: { index: false, follow: false }
};

const SESSION_COOKIE = 'landledger.office.session';

async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const secret = process.env.AUTH_SECRET || 'landledger-local-demo-secret-development-only';
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ['HS256'] });
    if (payload.purpose !== 'office-session' || typeof payload.sub !== 'string') return null;
    return { id: payload.sub, email: payload.email, name: payload.name, demo: payload.demo === true };
  } catch {
    return null;
  }
}

export default async function ClientPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  return <ClientPortal mode="client" user={user} />;
}
