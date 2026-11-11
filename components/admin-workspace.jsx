'use client';

import Image from 'next/image';
import Link from 'next/link';
import OfficePanelView from './office/office-panel-view';
import WorkspaceLogoutButton from './workspace-logout-button';
import { canViewPanel, OFFICE_PANELS } from '../lib/office-panels';
import styles from './admin-workspace.module.css';

const NAVIGATION_GROUPS = [
  { label: 'Overview & reports', panels: ['overview', 'reports'] },
  { label: 'Visitor operations', panels: ['visitors', 'verify'] },
  { label: 'People & workplace', panels: ['staff', 'attendance', 'organization'] },
  { label: 'Clients & business', panels: ['clients', 'finance', 'growth'] },
  { label: 'Governance', panels: ['compliance', 'roles', 'audit', 'settings'] }
];

export default function AdminWorkspace({ initialUser, panel = 'overview' }) {
  const panels = Object.entries(OFFICE_PANELS).filter(([key]) => canViewPanel(initialUser, key));
  const visiblePanels = new Set(panels.map(([key]) => key));
  const navigationGroups = NAVIGATION_GROUPS
    .map((group) => ({ ...group, panels: group.panels.filter((key) => visiblePanels.has(key)) }))
    .filter((group) => group.panels.length > 0);
  const roleNames = (initialUser.roles || []).map((role) => role.name).join(', ') || 'Office team';

  return (
    <div className={styles.workspace}>
      <aside className={styles.sidebar}>
        <Link className={styles.brand} href="/admin" aria-label="TGNE Solutions workspace home">
          <span className={styles.brandMark}><Image src="/assets/tgne-logo.png" alt="" width={42} height={42} priority unoptimized /></span>
          <span><strong>TGNE</strong><small>Solutions workspace</small></span>
        </Link>
        <p className={styles.sectionLabel}>WORKSPACE</p>
        <nav className={styles.navigation} aria-label="Admin navigation">
          {navigationGroups.map((group) => (
            <details className={styles.navGroup} key={group.label} open={group.panels.includes(panel)}>
              <summary className={styles.groupLabel}>
                <span>{group.label}</span>
                <svg className={styles.groupChevron} width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <div className={styles.navSubmenu}>
                {group.panels.map((key) => (
                  <Link
                    key={key}
                    href={key === 'overview' ? '/admin' : `/admin/${key}`}
                    className={`${styles.navLink} ${panel === key ? styles.navLinkActive : ''}`}
                    aria-current={panel === key ? 'page' : undefined}
                  >
                    {OFFICE_PANELS[key].label}
                  </Link>
                ))}
              </div>
            </details>
          ))}
        </nav>
        <div className={styles.account}>
          <span className={styles.avatar}>{String(initialUser.name || 'T').trim().slice(0, 1).toUpperCase()}</span>
          <span><strong>{initialUser.name}</strong><small>{roleNames}</small></span>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <div><span className={styles.topbarEyebrow}>TGNE SOLUTIONS</span><strong>{OFFICE_PANELS[panel]?.label || 'Business workspace'}</strong></div>
          <WorkspaceLogoutButton className={styles.logout} />
        </header>
        <OfficePanelView initialUser={initialUser} panel={panel} />
      </div>
    </div>
  );
}
