'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  COMPLIANCE_CATEGORIES,
  COMPLIANCE_DISCLAIMER,
  COMPLIANCE_FREQUENCIES,
  COMPLIANCE_OBLIGATIONS,
  COMPLIANCE_STATUSES,
  GHANA_AUTHORITIES,
  daysUntil,
  effectiveStatus
} from '../../lib/compliance-ghana';
import { api, Empty, Field, formatDate, Icon, jsonBody, Modal, PageHeading, Panel, Stat, StatusBadge } from './ui';

const CATALOG = new Map(COMPLIANCE_OBLIGATIONS.map((item) => [item.key, item]));

const EMPTY_FORM = {
  title: '',
  authority: '',
  category: 'TAX',
  frequency: 'ONCE',
  statute: '',
  dueDate: '',
  reference: '',
  status: 'PENDING',
  ownerId: '',
  evidenceUrl: '',
  notes: ''
};

function dueHint(item) {
  if (!item.dueDate) return 'No due date';
  const days = daysUntil(item.dueDate);
  if (days == null) return 'No due date';
  if (item.effective === 'OVERDUE') return Math.abs(days) + ' days overdue';
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return 'In ' + days + ' days';
}

function formFromItem(item) {
  return {
    ...EMPTY_FORM,
    title: item.title,
    authority: item.authority,
    category: item.category,
    frequency: item.frequency,
    statute: item.statute || '',
    dueDate: item.dueDate ? String(item.dueDate).slice(0, 10) : '',
    reference: item.reference || '',
    status: item.status,
    ownerId: item.ownerId || '',
    evidenceUrl: item.evidenceUrl || '',
    notes: item.notes || ''
  };
}

export default function CompliancePanel({ notify, fail }) {
  const [data, setData] = useState({ items: [], members: [], stats: { score: 100, overdue: 0, dueSoon: 0, filedThisYear: 0 }, canManage: false });
  const [filters, setFilters] = useState({ q: '', category: '', status: 'open' });
  const [editor, setEditor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await api('/api/office/compliance');
      setData(result);
      fail('');
    } catch (reason) {
      fail(reason.message);
    } finally {
      setLoading(false);
    }
  }, [fail]);

  useEffect(() => { load(); }, [load]);

  const items = useMemo(
    () => data.items.map((item) => ({ ...item, effective: effectiveStatus(item) })),
    [data.items]
  );

  const filtered = useMemo(() => {
    const query = filters.q.trim().toLowerCase();
    return items.filter((item) => {
      if (filters.category && item.category !== filters.category) return false;
      if (filters.status === 'open' && (item.status === 'FILED' || item.status === 'WAIVED')) return false;
      if (filters.status === 'overdue' && item.effective !== 'OVERDUE') return false;
      if (filters.status === 'filed' && item.status !== 'FILED') return false;
      if (filters.status === 'waived' && item.status !== 'WAIVED') return false;
      if (query && !(item.title + ' ' + item.authority + ' ' + (item.reference || '')).toLowerCase().includes(query)) return false;
      return true;
    });
  }, [items, filters]);

  const upcoming = useMemo(
    () => items
      .filter((item) => item.dueDate && item.effective !== 'FILED' && item.effective !== 'WAIVED')
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 4),
    [items]
  );

  const meta = editor?.item ? CATALOG.get(editor.item.catalogKey) : null;

  function openCreate() {
    setEditor({ mode: 'create', form: { ...EMPTY_FORM } });
  }

  function openItem(item) {
    setEditor({ mode: 'edit', id: item.id, item, form: formFromItem(item) });
  }

  function setField(key, value) {
    setEditor((current) => (current ? { ...current, form: { ...current.form, [key]: value } } : current));
  }

  async function save(event) {
    event.preventDefault();
    if (!editor) return;
    setBusy(true);
    try {
      if (editor.mode === 'create') {
        await api('/api/office/compliance', {
          method: 'POST',
          ...jsonBody({
            title: editor.form.title,
            authority: editor.form.authority,
            category: editor.form.category,
            frequency: editor.form.frequency,
            statute: editor.form.statute,
            dueDate: editor.form.dueDate || null,
            notes: editor.form.notes,
            evidenceUrl: editor.form.evidenceUrl,
            ownerId: editor.form.ownerId || null
          })
        });
        notify('Compliance obligation added.');
      } else {
        await api('/api/office/compliance/' + editor.id, {
          method: 'PATCH',
          ...jsonBody({
            status: editor.form.status,
            dueDate: editor.form.dueDate || null,
            reference: editor.form.reference,
            notes: editor.form.notes,
            evidenceUrl: editor.form.evidenceUrl,
            ownerId: editor.form.ownerId || null
          })
        });
        notify(editor.form.status === 'FILED' ? 'Filing recorded.' : 'Compliance obligation updated.');
      }
      setEditor(null);
      await load();
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!editor?.item || !window.confirm('Delete this custom obligation? This cannot be undone.')) return;
    setBusy(true);
    try {
      await api('/api/office/compliance/' + editor.id, { method: 'DELETE' });
      notify('Custom obligation deleted.');
      setEditor(null);
      await load();
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="GOVERNANCE · GHANA"
        title="Ghana compliance"
        description="Track statutory registrations, tax filings, pension remittances, licences, and land registrations with their authorities and due dates."
        actions={data.canManage ? <button className="office-button primary" type="button" onClick={openCreate}><Icon name="plus" size={14} />Add obligation</button> : null}
      />

      <div className="office-stat-grid">
        <Stat label="On track" value={loading ? '—' : data.stats.score + '%'} hint={loading ? 'Loading…' : data.stats.overdue ? data.stats.overdue + ' overdue' : 'No overdue items'} icon="shield" tone={loading ? '' : data.stats.overdue ? 'attention' : 'positive'} />
        <Stat label="Overdue" value={loading ? '—' : data.stats.overdue} hint="Past the statutory due date" icon="alert" tone={loading ? '' : data.stats.overdue ? 'attention' : 'positive'} />
        <Stat label="Due in 30 days" value={loading ? '—' : data.stats.dueSoon} hint="Upcoming filings and renewals" icon="calendar" />
        <Stat label="Filed this year" value={loading ? '—' : data.stats.filedThisYear} hint="Recorded with reference" icon="check" tone={loading ? '' : 'positive'} />
      </div>

      {upcoming.length ? (
        <Panel title="Next deadlines" subtitle="Closest open obligations">
          <div className="compliance-next">
            {upcoming.map((item) => (
              <button className="compliance-next-item" type="button" key={item.id} onClick={() => openItem(item)}>
                <span className="compliance-next-date"><strong>{formatDate(item.dueDate, { day: '2-digit', month: 'short' })}</strong><small>{dueHint(item)}</small></span>
                <span className="compliance-next-copy"><strong>{item.title}</strong><small>{item.authority}</small></span>
                <StatusBadge value={item.effective} label={COMPLIANCE_STATUSES[item.effective]} />
              </button>
            ))}
          </div>
        </Panel>
      ) : null}

      <form className="office-filter-bar" onSubmit={(event) => event.preventDefault()}>
        <label className="grow"><Icon name="search" size={15} /><input value={filters.q} onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} placeholder="Search obligation, authority, or reference" aria-label="Search compliance obligations" /></label>
        <label>Category<select value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}><option value="">All categories</option>{Object.entries(COMPLIANCE_CATEGORIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label>Status<select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="open">Open items</option><option value="overdue">Overdue</option><option value="filed">Filed</option><option value="waived">Not applicable</option><option value="all">All</option></select></label>
      </form>

      <Panel title="Obligations" subtitle={filtered.length + ' shown · ' + items.length + ' tracked'}>
        <div className="office-table-wrap">
          <table className="office-table compliance-table">
            <thead><tr><th>Due</th><th>Obligation</th><th>Authority</th><th>Category</th><th>Status</th><th>Owner</th><th>Action</th></tr></thead>
            <tbody>
              {filtered.map((item) => {
                const catalog = CATALOG.get(item.catalogKey);
                return (
                  <tr key={item.id}>
                    <td><strong>{item.dueDate ? formatDate(item.dueDate) : 'No date'}</strong><small>{dueHint(item)}</small></td>
                    <td>
                      <strong>{item.title}</strong>
                      <small>{item.statute || COMPLIANCE_FREQUENCIES[item.frequency] || item.frequency}{catalog?.conditional ? <span className="compliance-conditional">Conditional</span> : null}</small>
                    </td>
                    <td>{item.authority}</td>
                    <td>{COMPLIANCE_CATEGORIES[item.category] || item.category}</td>
                    <td><StatusBadge value={item.effective} label={COMPLIANCE_STATUSES[item.effective]} /></td>
                    <td>{item.owner ? item.owner.name : '—'}</td>
                    <td><button className="office-button secondary small" type="button" onClick={() => openItem(item)}>{data.canManage ? (item.status === 'FILED' ? 'Update' : 'Record') : 'View'}</button></td>
                  </tr>
                );
              })}
              {!filtered.length ? <Empty colSpan={7}>{loading ? 'Loading compliance obligations…' : 'No obligations match these filters.'}</Empty> : null}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Ghana authorities" subtitle="Official portals for each regulator">
        <div className="compliance-authorities">
          {GHANA_AUTHORITIES.map((authority) => (
            <article className="compliance-authority" key={authority.key}>
              <strong>{authority.name}</strong>
              <p>{authority.scope}</p>
              {authority.url ? <a href={authority.url} target="_blank" rel="noreferrer">Open portal <Icon name="arrow" size={12} /></a> : <small>Apply through your district assembly</small>}
            </article>
          ))}
        </div>
        <p className="compliance-disclaimer">{COMPLIANCE_DISCLAIMER}</p>
      </Panel>

      {editor ? (
        <Modal
          title={editor.mode === 'create' ? 'Add compliance obligation' : editor.item.title}
          eyebrow={editor.mode === 'create' ? 'CUSTOM OBLIGATION' : (COMPLIANCE_CATEGORIES[editor.item.category] || editor.item.category)}
          description={meta ? meta.description : 'Track an additional statutory, contractual, or internal compliance obligation.'}
          onClose={() => (busy ? null : setEditor(null))}
          wide
        >
          {!data.canManage ? (
            <div className="compliance-detail">
              <dl>
                <div><dt>Authority</dt><dd>{editor.item.authority}</dd></div>
                <div><dt>Statute</dt><dd>{editor.item.statute || '—'}</dd></div>
                <div><dt>Due</dt><dd>{editor.item.dueDate ? formatDate(editor.item.dueDate) : 'No date'} · {dueHint(editor.item)}</dd></div>
                <div><dt>Status</dt><dd><StatusBadge value={editor.item.effective} label={COMPLIANCE_STATUSES[editor.item.effective]} /></dd></div>
                <div><dt>Reference</dt><dd>{editor.item.reference || '—'}</dd></div>
                <div><dt>Owner</dt><dd>{editor.item.owner ? editor.item.owner.name : '—'}</dd></div>
              </dl>
              {editor.item.notes ? <p>{editor.item.notes}</p> : null}
              {editor.item.evidenceUrl ? <a href={editor.item.evidenceUrl} target="_blank" rel="noreferrer">Open evidence <Icon name="arrow" size={12} /></a> : null}
            </div>
          ) : (
            <form className="office-form-grid" onSubmit={save}>
              {editor.mode === 'create' ? (
                <>
                  <Field label="Obligation title" full><input value={editor.form.title} onChange={(event) => setField('title', event.target.value)} maxLength={160} required placeholder="e.g. EPA permit for the new estate road" /></Field>
                  <Field label="Authority"><input value={editor.form.authority} onChange={(event) => setField('authority', event.target.value)} maxLength={120} required placeholder="e.g. Environmental Protection Agency" /></Field>
                  <Field label="Category"><select value={editor.form.category} onChange={(event) => setField('category', event.target.value)}>{Object.entries(COMPLIANCE_CATEGORIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
                  <Field label="Frequency"><select value={editor.form.frequency} onChange={(event) => setField('frequency', event.target.value)}>{Object.entries(COMPLIANCE_FREQUENCIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
                  <Field label="Statute or reference" hint="Optional citation"><input value={editor.form.statute} onChange={(event) => setField('statute', event.target.value)} maxLength={200} /></Field>
                </>
              ) : null}
              <Field label="Status"><select value={editor.form.status} onChange={(event) => setField('status', event.target.value)}>{['PENDING', 'IN_PROGRESS', 'FILED', 'WAIVED'].map((key) => <option key={key} value={key}>{COMPLIANCE_STATUSES[key]}</option>)}</select></Field>
              <Field label="Due date" hint="Leave blank for per-transaction obligations"><input type="date" value={editor.form.dueDate} onChange={(event) => setField('dueDate', event.target.value)} /></Field>
              <Field label="Owner"><select value={editor.form.ownerId} onChange={(event) => setField('ownerId', event.target.value)}><option value="">Unassigned</option>{data.members.map((member) => <option key={member.id} value={member.id}>{member.name}{member.jobTitle ? ' · ' + member.jobTitle : ''}</option>)}</select></Field>
              <Field label="Reference or receipt number"><input value={editor.form.reference} onChange={(event) => setField('reference', event.target.value)} maxLength={120} placeholder="Filing acknowledgement, licence number, receipt" /></Field>
              <Field label="Evidence link" full hint="Optional http(s) link to a receipt, certificate, or filing"><input type="url" value={editor.form.evidenceUrl} onChange={(event) => setField('evidenceUrl', event.target.value)} maxLength={500} placeholder="https://" /></Field>
              <Field label="Notes" full><textarea rows={3} value={editor.form.notes} onChange={(event) => setField('notes', event.target.value)} maxLength={2000} placeholder="Contact person, amount paid, next steps" /></Field>
              {meta?.evidence ? <p className="compliance-evidence-hint">Keep on file: {meta.evidence}{meta.portal ? <> · <a href={meta.portal} target="_blank" rel="noreferrer">Official portal</a></> : null}</p> : null}
              <footer className="office-modal-actions">
                {editor.mode === 'edit' && editor.item.catalogKey.startsWith('custom:') ? <button className="office-button danger" type="button" onClick={remove} disabled={busy}>Delete</button> : null}
                <button className="office-button secondary" type="button" onClick={() => setEditor(null)} disabled={busy}>Cancel</button>
                <button className="office-button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : editor.mode === 'create' ? 'Add obligation' : 'Save'}</button>
              </footer>
            </form>
          )}
        </Modal>
      ) : null}
    </>
  );
}
