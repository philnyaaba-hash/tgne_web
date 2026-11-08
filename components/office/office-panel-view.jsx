'use client';

import { useState } from 'react';
import { canViewPanel, OFFICE_PANELS } from '../../lib/office-panels';
import AttendancePanel from './attendance-panel';
import AuditPanel from './audit-panel';
import ClientPanel from './client-panel';
import ClientsPanel from './clients-panel';
import CompliancePanel from './compliance-panel';
import FinancePanel from './finance-panel';
import GrowthPanel from './growth-panel';
import LandPanel from './land-panel';
import OrganizationPanel from './organization-panel';
import OverviewPanel from './overview-panel';
import ReportsPanel from './reports-panel';
import RolesPanel from './roles-panel';
import SettingsPanel from './settings-panel';
import StaffPanel from './staff-panel';
import SurveyPanel from './survey-panel';
import VerifyPanel from './verify-panel';
import VisitorPanel from './visitor-panel';
import { Icon } from './ui';

const PANELS = {
  overview: OverviewPanel,
  visitors: VisitorPanel,
  verify: VerifyPanel,
  staff: StaffPanel,
  attendance: AttendancePanel,
  organization: OrganizationPanel,
  reports: ReportsPanel,
  finance: FinancePanel,
  survey: SurveyPanel,
  compliance: CompliancePanel,
  growth: GrowthPanel,
  land: LandPanel,
  clients: ClientsPanel,
  'client-overview': (props) => <ClientPanel initialTab="overview" {...props} />,
  'client-portfolio': (props) => <ClientPanel initialTab="portfolio" {...props} />,
  'client-buy': (props) => <ClientPanel initialTab="buy" {...props} />,
  'client-resale': (props) => <ClientPanel initialTab="resale" {...props} />,
  'client-services': (props) => <ClientPanel initialTab="services" {...props} />,
  'client-payments': (props) => <ClientPanel initialTab="payments" {...props} />,
  'client-documents': (props) => <ClientPanel initialTab="documents" {...props} />,
  'client-support': (props) => <ClientPanel initialTab="support" {...props} />,
  roles: RolesPanel,
  audit: AuditPanel,
  settings: SettingsPanel
};

export default function OfficePanelView({ initialUser, panel }) {
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const def = OFFICE_PANELS[panel] || OFFICE_PANELS.overview;
  const PanelComponent = PANELS[panel] || PANELS.overview;
  const allowed = canViewPanel(initialUser, panel);

  function navigate(key) {
    if (PANELS[key]) window.location.assign('/office/embed?panel=' + key);
  }

  return (
    <main className="office-embed">
      <div className="office-main">
        {error ? <div className="office-alert error" role="alert"><span>{error}</span><button type="button" aria-label="Dismiss" onClick={() => setError('')}><Icon name="close" size={13} /></button></div> : null}
        {notice ? <div className="office-alert success" role="status"><span>{notice}</span><button type="button" aria-label="Dismiss" onClick={() => setNotice('')}><Icon name="close" size={13} /></button></div> : null}
        {allowed ? (
          <PanelComponent user={initialUser} notify={setNotice} fail={setError} navigate={navigate} />
        ) : (
          <section className="office-embed-denied">
            <h1>Restricted</h1>
            <p>Your office role cannot open {def.label.toLowerCase()}. Ask an administrator if you need access.</p>
            <a className="office-button secondary" href="/dashboard" target="_top">Back to workspace</a>
          </section>
        )}
      </div>
    </main>
  );
}
