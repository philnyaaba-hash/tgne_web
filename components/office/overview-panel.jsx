'use client';

import { useEffect, useState } from 'react';
import {
  api, Avatar, formatDate, formatDateTime, formatTime, Icon, money, PageHeading,
  Panel, Stat, StatusBadge, Empty
} from './ui';

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

export default function OverviewPanel({ user, navigate }) {
  const [data, setData] = useState({ visits: null, staff: null, reports: null, finance: null, clients: null, attendance: null });
  const [loading, setLoading] = useState(true);

  const can = (permission) => user.permissions.includes(permission);

  useEffect(() => {
    let active = true;
    async function load() {
      const requests = [
        can('visitors.view') ? api('/api/office/visitors') : Promise.resolve(null),
        can('staff.view') ? api('/api/office/users') : Promise.resolve(null),
        can('reports.view') ? api('/api/office/reports') : Promise.resolve(null),
        can('finance.view') ? api('/api/office/finance') : Promise.resolve(null),
        can('client.view') ? api('/api/office/clients') : Promise.resolve(null),
        api('/api/office/attendance')
      ];
      const settled = await Promise.allSettled(requests);
      if (!active) return;
      const value = (index) => settled[index].status === 'fulfilled' ? settled[index].value : null;
      setData({
        visits: value(0),
        staff: value(1),
        reports: value(2),
        finance: value(3),
        clients: value(4),
        attendance: value(5)
      });
      setLoading(false);
    }
    load();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = data.visits?.counts || {};
  const visitsToday = ['EXPECTED', 'AWAITING_APPROVAL', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'DENIED']
    .reduce((sum, key) => sum + (counts[key] || 0), 0);
  const myRecord = data.attendance?.myRecord;
  const mySummary = data.attendance?.summary;
  const finance = data.finance?.summary;
  const staffCount = data.staff?.users?.length || 0;
  const activeStaff = data.staff?.users?.filter((person) => person.status === 'ACTIVE').length || 0;
  const services = data.clients?.services || [];
  const openServices = services.filter((service) => !['COMPLETED', 'CANCELLED'].includes(service.status));
  const awaitingQuote = services.filter((service) => service.status === 'SUBMITTED').length;
  const attention = [];

  if (can('visitors.view')) {
    if (counts.AWAITING_APPROVAL) attention.push({ tone: 'warn', icon: 'shield', title: counts.AWAITING_APPROVAL + ' visit' + (counts.AWAITING_APPROVAL === 1 ? '' : 's') + ' awaiting approval', detail: 'Restricted visits cannot be checked in until a manager decides.', action: () => navigate('visitors') });
    if (counts.OVERDUE) attention.push({ tone: 'danger', icon: 'alert', title: counts.OVERDUE + ' visitor' + (counts.OVERDUE === 1 ? '' : 's') + ' past expected check-out', detail: 'Confirm departure, collect the visitor card, and revoke QR access.', action: () => navigate('visitors') });
  }
  if (!myRecord?.checkInAt) attention.push({ tone: 'info', icon: 'clock', title: 'You have not clocked in today', detail: 'Record your attendance from the attendance workspace.', action: () => navigate('attendance') });
  if (can('client.view') && awaitingQuote) attention.push({ tone: 'warn', icon: 'file', title: awaitingQuote + ' service request' + (awaitingQuote === 1 ? '' : 's') + ' awaiting a quote', detail: 'Review client requirements and prepare a service estimate.', action: () => navigate('clients') });
  if (can('finance.approve') && finance?.expensesPending) attention.push({ tone: 'info', icon: 'money', title: 'Expenses awaiting approval', detail: 'Pending claims total ' + money(finance.expensesPending, finance.currency) + '.', action: () => navigate('finance') });

  const quick = [
    { key: 'clients', label: 'Clients & services', detail: 'Manage relationships and requests', icon: 'users', show: can('client.view') },
    { key: 'visitors', label: 'Register a visitor', detail: 'Appointments and walk-ins', icon: 'badge', show: can('visitors.register') },
    { key: 'verify', label: 'Verify a pass', detail: 'Scan a visitor QR code', icon: 'scan', show: can('visitors.view') },
    { key: 'staff', label: 'Staff directory', detail: 'People, roles, and contacts', icon: 'users', show: can('staff.view') },
    { key: 'reports', label: 'Visitor reports', detail: 'Movement and compliance', icon: 'report', show: can('reports.view') },
    { key: 'finance', label: 'Finance desk', detail: 'Invoices, payments, expenses', icon: 'money', show: can('finance.view') },
    { key: 'settings', label: 'System settings', detail: 'Cards, email, and security', icon: 'settings', show: can('settings.manage') }
  ].filter((item) => item.show);

  function greetingName() {
    return String(user.name || '').split(/\s+/)[0] || 'there';
  }

  return (
    <>
      <PageHeading
        eyebrow="TGNE BUSINESS MANAGEMENT"
        title={greeting() + ', ' + greetingName()}
        description={formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' · ' + (user.roles.map((role) => role.name).join(', ') || 'Office staff')}
        actions={can('visitors.register') ? <button className="office-button primary" type="button" onClick={() => navigate('visitors')}><Icon name="plus" size={15} /> Register visitor</button> : null}
      />

      {can('client.view') ? (
        <div className="office-stat-grid">
          <Stat label="Clients" value={loading ? '—' : data.clients?.clients?.length || 0} hint="Registered client workspaces" icon="users" />
          <Stat label="Open service requests" value={loading ? '—' : openServices.length} hint="Active client work" icon="settings" tone={openServices.length ? 'warn' : ''} />
          <Stat label="Awaiting quote" value={loading ? '—' : awaitingQuote} hint="Requests to review" icon="file" tone={awaitingQuote ? 'warn' : ''} />
          <Stat label="Outstanding" value={money(finance?.outstanding, finance?.currency)} hint="Open customer balances" icon="money" tone={finance?.outstanding ? 'warn' : ''} />
        </div>
      ) : can('finance.view') ? (
        <div className="office-stat-grid">
          <Stat label="Invoiced" value={money(finance?.invoiced, finance?.currency)} hint={finance?.invoiceCount ? finance.invoiceCount + ' invoices recorded' : 'No invoices yet'} icon="report" />
          <Stat label="Collected" value={money(finance?.collected, finance?.currency)} hint="Recorded payments" icon="money" tone="positive" />
          <Stat label="Outstanding" value={money(finance?.outstanding, finance?.currency)} hint="Open customer balances" icon="alert" tone={finance?.outstanding ? 'warn' : ''} />
          <Stat label="Pending expenses" value={money(finance?.expensesPending, finance?.currency)} hint="Awaiting approval" icon="clock" />
        </div>
      ) : can('visitors.view') ? (
        <div className="office-stat-grid">
          <Stat label="Visitors today" value={loading ? '—' : visitsToday} hint="Expected, inside, and checked out" icon="badge" />
          <Stat label="Currently inside" value={loading ? '—' : counts.INSIDE || 0} hint="Live occupancy" icon="users" tone="positive" />
          <Stat label="Awaiting approval" value={loading ? '—' : counts.AWAITING_APPROVAL || 0} hint="Manager decision required" icon="shield" tone={counts.AWAITING_APPROVAL ? 'warn' : ''} />
          <Stat label="Overdue" value={loading ? '—' : counts.OVERDUE || 0} hint="Past expected check-out" icon="alert" tone={counts.OVERDUE ? 'danger' : ''} />
        </div>
      ) : (
        <div className="office-stat-grid">
          <Stat label="Active staff" value={activeStaff || staffCount} hint="Across all departments" icon="users" />
          <Stat label="My attendance" value={myRecord?.checkInAt ? 'Clocked in' : 'Not clocked in'} hint={myRecord?.checkInAt ? 'Since ' + formatTime(myRecord.checkInAt) : 'Start your day from attendance'} icon="clock" tone={myRecord?.checkInAt ? 'positive' : 'warn'} />
          <Stat label="On site now" value={mySummary?.onSite || 0} hint="Staff currently clocked in" icon="building" />
          <Stat label="On leave today" value={mySummary?.leave || 0} hint="Recorded absences" icon="calendar" />
        </div>
      )}

      <div className="office-overview-grid">
        <Panel title="Needs attention" subtitle="Items that require an action from you." className="office-overview-attention">
          {attention.length ? (
            <ul className="office-attention-list">
              {attention.map((item, index) => (
                <li key={index} className={item.tone}>
                  <span className="office-attention-icon"><Icon name={item.icon} size={16} /></span>
                  <div><strong>{item.title}</strong><small>{item.detail}</small></div>
                  <button type="button" onClick={item.action}>Open <Icon name="arrow" size={13} /></button>
                </li>
              ))}
            </ul>
          ) : <p className="office-muted">Nothing needs your attention right now. The front desk is clear.</p>}
        </Panel>

        <Panel title="Your day" subtitle="Personal attendance and workspace shortcuts." className="office-overview-day">
          <div className="office-day-card">
            <div>
              <span className="office-eyebrow">ATTENDANCE</span>
              <strong>{myRecord?.checkInAt ? 'Checked in at ' + formatTime(myRecord.checkInAt) : 'Not checked in yet'}</strong>
              <small>{myRecord?.checkOutAt ? 'Clocked out at ' + formatTime(myRecord.checkOutAt) : myRecord?.status ? 'Status · ' + myRecord.status : 'Record your arrival to start the day.'}</small>
            </div>
            <button className="office-button secondary" type="button" onClick={() => navigate('attendance')}>Open attendance</button>
          </div>
          {quick.length ? (
            <div className="office-quick-grid">
              {quick.map((item) => (
                <button key={item.key} type="button" className="office-quick-tile" onClick={() => navigate(item.key)}>
                  <span><Icon name={item.icon} size={16} /></span>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </button>
              ))}
            </div>
          ) : null}
        </Panel>
      </div>

      {can('visitors.view') && data.visits ? (
        <Panel
          title="Visitor movement"
          subtitle="Most recent visitor activity across the office."
          action={<button className="office-button secondary" type="button" onClick={() => navigate('visitors')}>Open register <Icon name="arrow" size={13} /></button>}
        >
          <div className="office-table-wrap">
            <table className="office-table">
              <thead><tr><th>Visitor</th><th>Host</th><th>Purpose</th><th>Timing</th><th>Status</th></tr></thead>
              <tbody>
                {(data.visits.visits || []).slice(0, 6).map((visit) => (
                  <tr key={visit.id}>
                    <td>
                      <div className="office-person-cell">
                        <Avatar name={visit.visitor.fullName} size={32} />
                        <div><strong>{visit.visitor.fullName}</strong><small>{visit.visitor.visitorId} · {visit.visitor.phone}</small></div>
                      </div>
                    </td>
                    <td><strong>{visit.host?.name || 'No host'}</strong><small>{visit.department?.name || 'Unassigned'}</small></td>
                    <td><strong>{visit.purpose}</strong><small>{visit.meetingRoom?.name || 'No room'}</small></td>
                    <td><strong>{visit.checkedInAt ? formatTime(visit.checkedInAt) : formatTime(visit.expectedArrival)}</strong><small>{formatDateTime(visit.expectedCheckout)}</small></td>
                    <td><StatusBadge value={visit.status} /></td>
                  </tr>
                ))}
                {!(data.visits.visits || []).length ? <Empty colSpan={5}>No visitor activity has been recorded yet.</Empty> : null}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      {can('staff.view') && data.staff ? (
        <Panel title="Team snapshot" subtitle="Active staff and department coverage." action={<button className="office-button secondary" type="button" onClick={() => navigate('staff')}>Open directory <Icon name="arrow" size={13} /></button>}>
          <div className="office-team-strip">
            {(data.staff.users || []).filter((person) => person.status === 'ACTIVE').slice(0, 8).map((person) => (
              <div className="office-team-chip" key={person.id}>
                <Avatar src={person.photoUrl} name={person.name} size={34} />
                <div><strong>{person.name}</strong><small>{person.jobTitle || person.department?.name || 'Staff'}</small></div>
              </div>
            ))}
            {staffCount > 8 ? <div className="office-team-chip more"><strong>+{staffCount - 8} more</strong><small>View the full directory</small></div> : null}
            {!staffCount ? <p className="office-muted">No staff records available.</p> : null}
          </div>
        </Panel>
      ) : null}
    </>
  );
}
