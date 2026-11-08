import { NextResponse } from 'next/server';
import { resolveDashboardAccess } from '../../../../lib/dashboard-access';
import { clearSessionCookie, currentUser, requireSameOrigin } from '../../../../lib/office-auth';
import { canViewPanel, OFFICE_PANELS } from '../../../../lib/office-panels';
import { isDemoQuickLoginEnabled } from '../../../../lib/demo-accounts';

export const runtime = 'nodejs';

export async function GET() {
  const demoQuickLogin = isDemoQuickLoginEnabled();
  const user = await currentUser();
  if (!user) return NextResponse.json({ user: null, demoQuickLogin }, { headers: { 'cache-control': 'no-store' } });
  const access = resolveDashboardAccess(user.roles.map((role) => role.key));
  const officePanels = Object.keys(OFFICE_PANELS).filter((panel) => canViewPanel(user, panel));
  return NextResponse.json(
    { user, access: { ...access, officePanels }, demoQuickLogin },
    { headers: { 'cache-control': 'no-store' } }
  );
}

export async function DELETE(request) {
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  return clearSessionCookie(NextResponse.json({ ok: true }));
}
