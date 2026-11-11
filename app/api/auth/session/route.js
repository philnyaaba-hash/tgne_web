import { NextResponse } from 'next/server';
import { resolveDashboardAccess } from '../../../../lib/dashboard-access';
import { clearSessionCookie, currentUser, invalidateCurrentSession, isLocalDemoMode, requireSameOrigin } from '../../../../lib/office-auth';
import { canViewPanel, OFFICE_PANELS } from '../../../../lib/office-panels';
import { isDemoQuickLoginEnabled } from '../../../../lib/demo-accounts';

export const runtime = 'nodejs';

export async function GET() {
  // With no database configured, development still offers the local demo roles.
  const demoQuickLogin = isDemoQuickLoginEnabled() || isLocalDemoMode();
  const user = await currentUser();
  if (!user) return NextResponse.json({ user: null, demoQuickLogin }, { headers: { 'cache-control': 'no-store' } });
  const access = resolveDashboardAccess(user.roles.map((role) => role.key));
  const officePanels = Object.keys(OFFICE_PANELS).filter((panel) => canViewPanel(user, panel));
  return NextResponse.json(
    { user, access: { ...access, officePanels }, demoQuickLogin },
    { headers: { 'cache-control': 'no-store', pragma: 'no-cache', expires: '0' } }
  );
}

export async function DELETE(request) {
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  try {
    await invalidateCurrentSession();
  } catch (error) {
    console.error('Session invalidation failed.', error?.message);
    return NextResponse.json({ error: 'Your session could not be invalidated. Please try again.' }, { status: 503 });
  }
  return clearSessionCookie(NextResponse.json({ ok: true }));
}
