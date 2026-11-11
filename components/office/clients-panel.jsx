'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SERVICE_STATUSES,
  serviceStatusLabel,
  serviceTypeLabel
} from '../../lib/client-portal';
import { Empty, Field, Icon, Modal, PageHeading, Panel, Stat, StatusBadge, api, formatDate, formatDateTime, jsonBody, money } from './ui';

const EMPTY = {
  clients: [],
  services: [],
  assignees: [],
  canManage: false,
  canFinance: false,
  stats: { clients: 0, openServices: 0, awaitingQuote: 0 }
};

function Status({ value, label }) {
  return <StatusBadge value={value} label={label} />;
}

function toInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function ClientsPanel({ notify, fail }) {
  const [data, setData] = useState(EMPTY);
  const [tab, setTab] = useState('clients');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    try {
      const result = await api('/api/office/clients');
      setData({ ...EMPTY, ...result });
      fail('');
    } catch (reason) {
      fail(reason.message);
    } finally {
      setLoading(false);
    }
  }, [fail]);

  useEffect(() => { load(); }, [load]);

  async function run(task, success) {
    setBusy(true);
    try {
      await task();
      notify(success);
      await load();
      return true;
    } catch (reason) {
      fail(reason.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const clients = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return data.clients;
    return data.clients.filter((client) => [client.user?.name, client.user?.email, client.clientCode, client.companyName, client.user?.phone]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(needle));
  }, [data.clients, query]);

  const openServices = data.services.filter((service) => !['COMPLETED', 'CANCELLED'].includes(service.status));

  function serviceAction(service, payload, success) {
    const body = typeof payload === 'string' ? { action: payload } : payload;
    return run(
      () => api('/api/office/clients/services/' + service.id, { method: 'PATCH', ...jsonBody(body) }),
      success
    );
  }

  return (
    <>
      <PageHeading
        eyebrow="TGNE Management · Client services"
        title="Clients and service delivery"
        description="Manage client relationships and take service requests from quote through completion."
        actions={<button className="office-button secondary" type="button" onClick={load} disabled={busy}><Icon name="refresh" size={14} />Refresh</button>}
      />

      <div className="office-stat-grid">
        <Stat label="Clients" value={loading ? '—' : data.stats.clients} hint="Registered client workspaces" icon="users" />
        <Stat label="Open service requests" value={loading ? '—' : data.stats.openServices} hint="Active client work" icon="settings" tone={data.stats.openServices ? 'attention' : ''} />
        <Stat label="Awaiting quote" value={loading ? '—' : data.stats.awaitingQuote} hint="Requests to review" icon="file" tone={data.stats.awaitingQuote ? 'attention' : ''} />
        <Stat label="Available staff" value={loading ? '—' : data.assignees.length} hint="Ready to be assigned" icon="users" />
      </div>

      <div className="growth-tabs">
        <div className="office-segmented" role="tablist" aria-label="Client desk sections">
          <button type="button" className={tab === 'clients' ? 'active' : ''} onClick={() => setTab('clients')}>Clients</button>
          <button type="button" className={tab === 'services' ? 'active' : ''} onClick={() => setTab('services')}>Services{data.stats.awaitingQuote ? ' · ' + data.stats.awaitingQuote : ''}</button>
        </div>
      </div>

      {tab === 'clients' ? (
        <>
          <form className="office-filter-bar" onSubmit={(event) => event.preventDefault()}>
            <label className="grow"><Icon name="search" size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, phone or client code" aria-label="Search clients" /></label>
          </form>
          <Panel title="Client register" subtitle={clients.length + ' shown · ' + data.clients.length + ' total'}>
            <div className="office-table-wrap">
              <table className="office-table">
                <thead><tr><th>Client</th><th>Contact</th><th>Code</th><th>Services</th><th>Documents</th><th>Joined</th></tr></thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id}>
                      <td><strong>{client.user?.name || 'Client'}</strong><small>{client.companyName || 'Individual'}{client.user?.status !== 'ACTIVE' ? ' · inactive' : ''}</small></td>
                      <td><strong>{client.user?.email}</strong><small>{client.user?.phone || 'No phone'}</small></td>
                      <td><strong>{client.clientCode}</strong></td>
                      <td><strong>{client._count?.services || 0}</strong></td>
                      <td><strong>{client._count?.documents || 0}</strong></td>
                      <td><small>{formatDate(client.createdAt)}</small></td>
                    </tr>
                  ))}
                  {!clients.length ? <Empty colSpan={6}>{loading ? 'Loading clients…' : 'No client workspaces yet. Clients appear here after their first sign-in.'}</Empty> : null}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      ) : null}

      {tab === 'services' ? (
        <Panel title="Service requests" subtitle={data.canFinance ? 'Quotes create an invoice automatically; completing the work records the matching payment.' : 'Quoting and completing require finance access. You can still schedule, start, update and cancel.'}>
          <div className="office-table-wrap">
            <table className="office-table">
              <thead><tr><th>Reference</th><th>Client</th><th>Request</th><th>Quote</th><th>Status</th><th>Schedule</th><th>Action</th></tr></thead>
              <tbody>
                {data.services.map((service) => (
                  <tr key={service.id}>
                    <td><strong>{service.reference}</strong><small>{formatDate(service.createdAt)}</small></td>
                    <td><strong>{service.client?.user?.name}</strong><small>{service.client?.clientCode} · {service.client?.user?.email}</small></td>
                    <td><strong>{service.title}</strong><small>{serviceTypeLabel(service.type)} · {service.location || 'No location provided'}</small></td>
                    <td><strong>{service.quoteAmount ? money(service.quoteAmount) : '—'}</strong><small>{service.invoiceNumber || 'No invoice'}</small></td>
                    <td><Status value={service.status} label={serviceStatusLabel(service.status)} /><small>{service.updates?.[0]?.message?.slice(0, 70) || ''}</small></td>
                    <td><small>{service.scheduledFor ? formatDateTime(service.scheduledFor) : 'Not scheduled'}</small><small>{service.assignedTo?.name || 'Unassigned'}</small></td>
                    <td>
                      {data.canManage ? (
                        <div className="office-action-group">
                          {!['COMPLETED', 'CANCELLED'].includes(service.status) ? <button className="office-button primary small" type="button" disabled={busy} onClick={() => setModal({ type: 'service-quote', service })}>Quote</button> : null}
                          {!['COMPLETED', 'CANCELLED'].includes(service.status) ? <button className="office-button secondary small" type="button" disabled={busy} onClick={() => setModal({ type: 'service-schedule', service })}>Schedule</button> : null}
                          {['SCHEDULED', 'APPROVED'].includes(service.status) ? <button className="office-button secondary small" type="button" disabled={busy} onClick={() => serviceAction(service, 'start', 'Work marked in progress.')}>Start</button> : null}
                          {['IN_PROGRESS', 'SCHEDULED'].includes(service.status) ? <button className="office-button secondary small" type="button" disabled={busy} onClick={() => serviceAction(service, 'complete', 'Service completed and accounts updated.')}>Complete</button> : null}
                          {!['COMPLETED', 'CANCELLED'].includes(service.status) ? <button className="office-button secondary small" type="button" disabled={busy} onClick={() => setModal({ type: 'service-update', service })}>Update</button> : null}
                          {!['COMPLETED', 'CANCELLED'].includes(service.status) ? <button className="office-button secondary small" type="button" disabled={busy} onClick={() => serviceAction(service, { action: 'cancel' }, 'Service request cancelled.')}>Cancel</button> : null}
                        </div>
                      ) : <small>View only</small>}
                    </td>
                  </tr>
                ))}
                {!data.services.length ? <Empty colSpan={7}>{loading ? 'Loading services…' : 'No service requests yet.'}</Empty> : null}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      {modal?.type === 'service-quote' ? (
        <QuoteModal
          service={modal.service}
          busy={busy}
          onClose={() => setModal(null)}
          onSubmit={async (form) => {
            const ok = await serviceAction(modal.service, { action: 'quote', ...form }, 'Quote issued and invoice prepared.');
            if (ok) setModal(null);
          }}
        />
      ) : null}

      {modal?.type === 'service-schedule' ? (
        <ScheduleModal
          service={modal.service}
          assignees={data.assignees}
          busy={busy}
          onClose={() => setModal(null)}
          onSubmit={async (form) => {
            const ok = await serviceAction(modal.service, { action: 'schedule', ...form }, 'Service scheduled.');
            if (ok) setModal(null);
          }}
        />
      ) : null}

      {modal?.type === 'service-update' ? (
        <UpdateModal
          service={modal.service}
          busy={busy}
          onClose={() => setModal(null)}
          onSubmit={async (form) => {
            const ok = await serviceAction(modal.service, { action: 'update', ...form }, 'Client updated.');
            if (ok) setModal(null);
          }}
        />
      ) : null}
    </>
  );
}

function QuoteModal({ service, busy, onClose, onSubmit }) {
  const [amount, setAmount] = useState(service.quoteAmount || '');
  const [scheduledFor, setScheduledFor] = useState(toInput(service.scheduledFor));
  const [note, setNote] = useState('');
  return (
    <Modal title={'Quote ' + service.reference} eyebrow={serviceTypeLabel(service.type)} description={'For ' + service.title} onClose={onClose} wide>
      <form className="office-form-grid" onSubmit={(event) => { event.preventDefault(); onSubmit({ amount, scheduledFor: scheduledFor || null, note }); }}>
        <Field label="Quote amount (GHS)"><input type="number" min="1" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} required /></Field>
        <Field label="Proposed date" hint="Optional at quote stage."><input type="datetime-local" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} /></Field>
        <Field label="Note to client" full><textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} placeholder="What the quote covers, assumptions or next steps." /></Field>
        <div className="office-modal-actions office-field-full">
          <button className="office-button secondary" type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="office-button primary" type="submit" disabled={busy}>{busy ? 'Issuing…' : 'Issue quote'}</button>
        </div>
      </form>
    </Modal>
  );
}

function ScheduleModal({ service, assignees, busy, onClose, onSubmit }) {
  const [scheduledFor, setScheduledFor] = useState(toInput(service.scheduledFor));
  const [assignedToId, setAssignedToId] = useState(service.assignedToId || '');
  const [note, setNote] = useState('');
  return (
    <Modal title={'Schedule ' + service.reference} eyebrow={serviceTypeLabel(service.type)} description={service.title} onClose={onClose} wide>
      <form className="office-form-grid" onSubmit={(event) => { event.preventDefault(); onSubmit({ scheduledFor, assignedToId: assignedToId || null, note }); }}>
        <Field label="Date and time"><input type="datetime-local" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} required /></Field>
        <Field label="Assign to"><select value={assignedToId} onChange={(event) => setAssignedToId(event.target.value)}><option value="">Unassigned</option>{assignees.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.name}{assignee.jobTitle ? ' · ' + assignee.jobTitle : ''}</option>)}</select></Field>
        <Field label="Note to client" full><textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} /></Field>
        <div className="office-modal-actions office-field-full">
          <button className="office-button secondary" type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="office-button primary" type="submit" disabled={busy}>{busy ? 'Scheduling…' : 'Schedule work'}</button>
        </div>
      </form>
    </Modal>
  );
}

function UpdateModal({ service, busy, onClose, onSubmit }) {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState(service.status);
  return (
    <Modal title={'Update ' + service.reference} eyebrow={serviceTypeLabel(service.type)} description={service.title} onClose={onClose} wide>
      <form className="office-form-grid" onSubmit={(event) => { event.preventDefault(); onSubmit({ message, status }); }}>
        <Field label="Status"><select value={status} onChange={(event) => setStatus(event.target.value)}>{SERVICE_STATUSES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
        <Field label="Update for the client" full><textarea rows={4} value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} required /></Field>
        <div className="office-modal-actions office-field-full">
          <button className="office-button secondary" type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="office-button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Post update'}</button>
        </div>
      </form>
    </Modal>
  );
}
