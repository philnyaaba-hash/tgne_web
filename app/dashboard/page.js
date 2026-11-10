import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import LegacyApp from '../../components/LegacyApp';
import WorkspaceAssistant from '../../components/assistant/workspace-assistant';

export const metadata = {
  title: 'Workspace | TGNE Solutions',
  robots: { index: false, follow: false }
};

const SESSION_COOKIE = 'landledger.office.session';
const STAFF_ROLES = ['SUPER_ADMIN', 'OFFICE_MANAGER', 'ACCOUNTANT', 'SURVEYOR', 'RECEPTIONIST'];

async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const secret = process.env.AUTH_SECRET || 'landledger-local-demo-secret-development-only';
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ['HS256'] });
    if (payload.purpose !== 'office-session' || typeof payload.sub !== 'string') return null;
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      roles: payload.roles || [],
      demo: payload.demo === true
    };
  } catch {
    return null;
  }
}

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  const isStaff = user.roles.some((r) => STAFF_ROLES.includes(r.key));
  if (!isStaff) {
    redirect('/client');
  }
  return (
    <>
      <LegacyApp />
      <WorkspaceAssistant />
    </>
  );
}
