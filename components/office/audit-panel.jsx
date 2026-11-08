'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, Empty, formatDateTime, Icon, PageHeading, Panel, Stat } from './ui';

export default function AuditPanel({ fail }) {
  const [events, setEvents] = useState([]);
  const [actions, setActions] = useState([]);
  const [filters, setFilters] = useState({ q: '', action: '', from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (next = filters) => {
    setBusy(true);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (next.q) params.set('q', next.q);
      if (next.action) params.set('action', next.action);
      if (next.from) params.set('from', new Date(next.from).toISOString());
      if (next.to) params.set('to', new Date(next.to + 'T23:59:59').toISOString());
      const data = await api('/api/office/audit?' + params.toString());
      setEvents(data.events);
      setActions(data.actions);
      fail('');
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }, [filters, fail]);

  useEffect(() => { load(filters); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const actors = new Set(events.map((event) => event.actor?.id).filter(Boolean)).size;

  return (
    <>
      <PageHeading eyebrow="SECURITY & ACCOUNTABILITY" title="Audit history" description="Immutable records of staff, visitor, finance, and security actions across the office portal." />

      <div className="office-stat-grid">
        <Stat label="Events shown" value={events.length} hint="Most recent matching entries" icon="audit" />
        <Stat label="Distinct actors" value={actors} hint="Staff who performed actions" icon="users" />
        <Stat label="Action types" value={actions.length} hint="Across the selected period" icon="grid" />
        <Stat label="Retention" value="Full" hint="Records are not editable" icon="shield" tone="positive" />
      </div>

      <form className="office-filter-bar" onSubmit={(event) => { event.preventDefault(); load(); }}>
        <label className="grow"><Icon name="search" size={15} /><input value={filters.q} onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} placeholder="Search action, entity, ID, or actor" aria-label="Search audit events" /></label>
        <label>Action<select value={filters.action} onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value }))}><option value="">All actions</option>{actions.map((item) => <option key={item.action} value={item.action}>{item.action} ({item.count})</option>)}</select></label>
        <label>From<input type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} /></label>
        <label>To<input type="date" value={filters.to} min={filters.from} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} /></label>
        <button className="office-button primary" type="submit" disabled={busy}>{busy ? 'Searching…' : 'Search'}</button>
      </form>

      <Panel title="Audit trail" subtitle={events.length + ' events · newest first'}>
        <div className="office-table-wrap">
          <table className="office-table audit">
            <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Record</th><th>Details</th></tr></thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td><strong>{formatDateTime(event.createdAt)}</strong></td>
                  <td><strong>{event.actor?.name || 'System'}</strong><small>{event.actor?.email || 'Automated event'}</small></td>
                  <td><code className="office-action-code">{event.action}</code></td>
                  <td>{event.entityType}<small>{event.entityId || '—'}</small></td>
                  <td className="office-audit-meta">{event.metadata ? <code>{JSON.stringify(event.metadata)}</code> : '—'}</td>
                </tr>
              ))}
              {!events.length ? <Empty colSpan={5}>{loading ? 'Loading audit history…' : 'No audit entries match these filters.'}</Empty> : null}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
