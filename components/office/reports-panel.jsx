'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  api, Bars, CATEGORY_LABELS, downloadApiFile, Empty, formatDateTime, Icon,
  PageHeading, Panel, Stat, StatusBadge
} from './ui';

function isoDay(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function defaultRange() {
  const to = new Date();
  const from = new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);
  return { from: isoDay(from), to: isoDay(to) };
}

export default function ReportsPanel({ user, notify, fail }) {
  const initial = useMemo(defaultRange, []);
  const [range, setRange] = useState(initial);
  const [summary, setSummary] = useState(null);
  const [visits, setVisits] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const canExport = user.permissions.includes('reports.export');

  const load = useCallback(async (next = range) => {
    setBusy(true);
    try {
      const data = await api('/api/office/reports?from=' + encodeURIComponent(next.from) + '&to=' + encodeURIComponent(next.to));
      setSummary(data.summary);
      setVisits(data.visits);
      fail('');
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }, [range, fail]);

  useEffect(() => { load(initial); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function exportCsv() {
    try {
      await downloadApiFile('/api/office/reports?format=csv&from=' + encodeURIComponent(range.from) + '&to=' + encodeURIComponent(range.to), 'visitor-report.csv');
      notify('Visitor report exported.');
    } catch (reason) {
      fail(reason.message);
    }
  }

  const statusRows = Object.entries(summary?.byStatus || {}).sort((a, b) => b[1] - a[1]);
  const categoryRows = Object.entries(summary?.byCategory || {}).sort((a, b) => b[1] - a[1]);
  const departmentRows = Object.entries(summary?.byDepartment || {}).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }));

  return (
    <>
      <PageHeading
        eyebrow="OPERATIONS REPORTING"
        title="Visitor reports"
        description="Visitor volume, duration, compliance, and hosting patterns for a chosen period."
        actions={canExport ? <button className="office-button secondary" type="button" onClick={exportCsv} disabled={busy}><Icon name="download" size={15} /> Export CSV</button> : null}
      />

      <form className="office-filter-bar" onSubmit={(event) => { event.preventDefault(); load(); }}>
        <label>From<input type="date" value={range.from} max={range.to} onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))} /></label>
        <label>To<input type="date" value={range.to} min={range.from} onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))} /></label>
        <button className="office-button primary" type="submit" disabled={busy}>{busy ? 'Generating…' : 'Apply range'}</button>
        <div className="office-filter-quick">
          {[7, 30, 90].map((days) => (
            <button key={days} type="button" className="office-link-button" onClick={() => {
              const to = new Date();
              const from = new Date(to.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
              const next = { from: isoDay(from), to: isoDay(to) };
              setRange(next);
              load(next);
            }}>Last {days} days</button>
          ))}
        </div>
      </form>

      <div className="office-stat-grid">
        <Stat label="Total visits" value={summary?.totalVisits ?? '—'} hint="Appointments and walk-ins in range" icon="badge" />
        <Stat label="Average duration" value={summary ? summary.averageDurationMinutes + ' min' : '—'} hint="Checked-out visits" icon="clock" />
        <Stat label="Overdue" value={summary?.overdue ?? '—'} hint="Past expected check-out" icon="alert" tone={summary?.overdue ? 'danger' : ''} />
        <Stat label="Card return rate" value={summary ? summary.cardReturnRate + '%' : '—'} hint="Temporary cards returned" icon="print" tone={summary && summary.cardReturnRate < 95 ? 'warn' : 'positive'} />
      </div>

      <div className="office-overview-grid">
        <Panel title="Daily visitor volume" subtitle={range.from + ' to ' + range.to}>
          <Bars data={summary?.byDay || []} labelKey="date" valueKey="count" />
        </Panel>
        <Panel title="Status breakdown" subtitle="Includes overdue visits derived at report time.">
          <div className="office-breakdown">
            {statusRows.map(([status, count]) => (
              <div key={status}>
                <div><StatusBadge value={status} /><strong>{count}</strong></div>
                <span className="office-bar-track"><i style={{ width: Math.max(3, (count / Math.max(1, summary.totalVisits)) * 100) + '%' }} /></span>
              </div>
            ))}
            {!statusRows.length ? <p className="office-muted">No visits in this period.</p> : null}
          </div>
        </Panel>
      </div>

      <div className="office-three-grid">
        <Panel title="By category" subtitle="Visitor type mix.">
          <Bars data={categoryRows.map(([key, count]) => ({ name: CATEGORY_LABELS[key] || key, count }))} labelKey="name" valueKey="count" />
        </Panel>
        <Panel title="By department" subtitle="Hosting departments.">
          <Bars data={departmentRows} labelKey="name" valueKey="count" empty="No department activity." />
        </Panel>
        <Panel title="Top hosts" subtitle="Staff receiving the most visitors.">
          <Bars data={summary?.byHost || []} labelKey="name" valueKey="count" empty="No host activity." />
        </Panel>
      </div>

      <Panel title="Visit detail" subtitle={(summary?.totalVisits || 0) + ' visits · showing the latest ' + visits.length}>
        <div className="office-table-wrap">
          <table className="office-table">
            <thead><tr><th>Visit</th><th>Visitor</th><th>Host / department</th><th>Timing</th><th>Card</th><th>Status</th></tr></thead>
            <tbody>
              {visits.map((visit) => (
                <tr key={visit.id}>
                  <td><strong>{visit.visitCode}</strong><small>{CATEGORY_LABELS[visit.category] || visit.category}</small></td>
                  <td><strong>{visit.visitor.fullName}</strong><small>{visit.visitor.visitorId} · {visit.visitor.organization || 'Individual'}</small></td>
                  <td><strong>{visit.host?.name || '—'}</strong><small>{visit.department?.name || 'Unassigned'}</small></td>
                  <td><strong>{formatDateTime(visit.checkedInAt || visit.expectedArrival)}</strong><small>Out · {formatDateTime(visit.checkedOutAt || visit.expectedCheckout)}</small></td>
                  <td>{visit.cardReturned == null ? '—' : visit.cardReturned ? 'Returned' : <span className="office-text-danger">Not returned</span>}</td>
                  <td><StatusBadge value={visit.status} /></td>
                </tr>
              ))}
              {!visits.length ? <Empty colSpan={6}>{loading ? 'Generating report…' : 'No visits in this period.'}</Empty> : null}
            </tbody>
          </table>
        </div>
        {summary ? (
          <p className="office-hint-line">Staff accounts: {summary.staffActive} active of {summary.staffTotal} · currently inside: {summary.inside} · awaiting approval: {summary.awaiting} · missing cards: {summary.cardsMissing}.</p>
        ) : null}
      </Panel>
    </>
  );
}
