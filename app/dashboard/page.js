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

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } catch {}
    window.location.href = '/login';
  }

  return (
    <>
      <div className="dashboard-logout-bar" style={{ marginBottom: 16 }}>
        <button type="button" onClick={handleLogout} className="dashboard-logout-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 6, border: '1px solid var(--ls-line)', background: 'transparent', color: 'var(--ls-ink)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background-color .15s ease' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
          </svg>
          Sign out
        </button>
      </div>
      <LegacyApp />
      <WorkspaceAssistant />
    </>
  );
}
