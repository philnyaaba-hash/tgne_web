'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SERVICE_STATUSES,
  resaleStatusLabel,
  serviceStatusLabel,
  serviceTypeLabel
} from '../../lib/client-portal';
import { Empty, Field, Icon, Modal, PageHeading, Panel, Stat, StatusBadge, api, formatDate, formatDateTime, jsonBody, money } from './ui';

const EMPTY = {
  clients: [],
  resales: [],
  services: [],
  assignees: [],
  canManage: false,
  canFinance: false,
  stats: { clients: 0, holdings: 0, pendingResales: 0, liveResales: 0, openServices: 0, awaitingQuote: 0 }
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

  const pendingResales = data.resales.filter((resale) => resale.status === 'SUBMITTED');
  const openServices = data.services.filter((service) => !['COMPLETED', 'CANCELLED'].includes(service.status));

  function resaleAction(resale, action, note) {
    return run(
      () => api('/api/office/clients/resales/' + resale.id, { method: 'PATCH', ...jsonBody({ action, note }) }),
      action === 'approve' ? 'Resale published to the storefront.' : action === 'reject' ? 'Resale returned to the client.' : action === 'sold' ? 'Resale marked sold.' : 'Review note saved.'
    );
  }

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
        eyebrow="Office · Client desk"
        title="Clients, requests and delivery"
        description="Manage client work requests from quote through completion, and keep each client's service and account records up to date."
        actions={<button className="office-button secondary" type="button" onClick={load} disabled={busy}><Icon name="refresh" size={14} />Refresh</button>}
      />

      <div className="office-stat-grid">
        <Stat label="Clients" value={loading ? '—' : data.stats.clients} hint="Registered client workspaces" icon="users" />
        <Stat label="Land under management" value={loading ? '—' : data.stats.holdings} hint="Holdings recorded by clients" icon="map" />
        <Stat label="Resales to review" value={loading ? '—' : data.stats.pendingResales} hint={data.stats.liveResales + ' live on the storefront'} icon="building" tone={data.stats.pendingResales ? 'attention' : ''} />
        <Stat label="Services awaiting quote" value={loading ? '—' : data.stats.awaitingQuote} hint={openServices.length + ' open service jobs'} icon="settings" tone={data.stats.awaitingQuote ? 'attention' : ''} />
      </div>

      <div className="growth-tabs">
        <div className="office-segmented" role="tablist" aria-label="Client desk sections">
          <button type="button" className={tab === 'clients' ? 'active' : ''} onClick={() => setTab('clients')}>Clients</button>
          <button type="button" className={tab === 'resales' ? 'active' : ''} onClick={() => setTab('resales')}>Resales{pendingResales.length ? ' · ' + pendingResales.length : ''}</button>
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
              <table className="office-table land-admin-table">
                <thead><tr><th>Client</th><th>Contact</th><th>Code</th><th>Holdings</th><th>Resales</th><th>Services</th><th>Joined</th></tr></thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id}>
                      <td><strong>{client.user?.name || 'Client'}</strong><small>{client.companyName || 'Individual'}{client.user?.status !== 'ACTIVE' ? ' · inactive' : ''}</small></td>
                      <td><strong>{client.user?.email}</strong><small>{client.user?.phone || 'No phone'}</small></td>
                      <td><strong className="land-admin-ref">{client.clientCode}</strong></td>
                      <td><strong>{client._count?.holdings || 0}</strong><small>{client._count?.documents || 0} documents</small></td>
                      <td><strong>{client._count?.resales || 0}</strong></td>
                      <td><strong>{client._count?.services || 0}</strong></td>
                      <td><small>{formatDate(client.createdAt)}</small></td>
                    </tr>
                  ))}
                  {!clients.length ? <Empty colSpan={7}>{loading ? 'Loading clients…' : 'No client workspaces yet. Clients appear here after their first sign-in.'}</Empty> : null}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      ) : null}

      {tab === 'resales' ? (
        <Panel title="Resale requests" subtitle="Approve publishes the land to the public storefront. Reject returns it to the client with a note.">
          <div className="office-table-wrap">
            <table className="office-table land-admin-table">
              <thead><tr><th>Reference</th><th>Client</th><th>Land</th><th>Asking price</th><th>Status</th><th>Note</th><th>Action</th></tr></thead>
              <tbody>
                {data.resales.map((resale) => (
                  <tr key={resale.id}>
                    <td><strong className="land-admin-ref">{resale.reference}</strong><small>{formatDate(resale.createdAt)}</small></td>
                    <td><strong>{resale.client?.user?.name}</strong><small>{resale.client?.clientCode} · {resale.client?.user?.email}</small></td>
                    <td><strong>{resale.title}</strong><small>{[resale.district, resale.region].filter(Boolean).join(' · ')} · {resale.sizeAcres} acres</small></td>
                    <td><strong>{money(resale.askingPrice)}</strong><small>{resale.holding?.title || 'No holding linked'}</small></td>
                    <td><Status value={resale.status} label={resaleStatusLabel(resale.status)} /><small>{resale.listing?.status || ''}</small></td>
                    <td><small>{resale.reviewNote || '—'}</small></td>
                    <td>
                      {data.canManage ? (
                        <div className="land-admin-actions">
                          {['SUBMITTED', 'APPROVED', 'REJECTED'].includes(resale.status) ? <button className="office-button primary small" type="button" disabled={busy} onClick={() => resaleAction(resale, 'approve')}>Approve</button> : null}
                          {['SUBMITTED', 'APPROVED', 'LIVE'].includes(resale.status) ? <button className="office-button secondary small" type="button" disabled={busy} onClick={() => setModal({ type: 'resale-note', mode: 'reject', resale })}>Return</button> : null}
                          {['LIVE', 'APPROVED'].includes(resale.status) ? <button className="office-button secondary small" type="button" disabled={busy} onClick={() => resaleAction(resale, 'sold')}>Mark sold</button> : null}
                          <button className="office-button secondary small" type="button" disabled={busy} onClick={() => setModal({ type: 'resale-note', mode: 'note', resale })}>Note</button>
                          {resale.listing?.slug ? <a className="office-button secondary small" href={'/listings/' + resale.listing.slug} target="_blank" rel="noreferrer">Page</a> : null}
                        </div>
                      ) : <small>View only</small>}
                    </td>
                  </tr>
                ))}
                {!data.resales.length ? <Empty colSpan={7}>{loading ? 'Loading resales…' : 'No resale requests yet.'}</Empty> : null}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      {tab === 'services' ? (
        <Panel title="Service requests" subtitle={data.canFinance ? 'Quotes create an invoice automatically; completing the work records the matching payment.' : 'Quoting and completing require finance access. You can still schedule, start, update and cancel.'}>
          <div className="office-table-wrap">
            <table className="office-table land-admin-table">
              <thead><tr><th>Reference</th><th>Client</th><th>Request</th><th>Quote</th><th>Status</th><th>Schedule</th><th>Action</th></tr></thead>
              <tbody>
                {data.services.map((service) => (
                  <tr key={service.id}>
                    <td><strong className="land-admin-ref">{service.reference}</strong><small>{formatDate(service.createdAt)}</small></td>
                    <td><strong>{service.client?.user?.name}</strong><small>{service.client?.clientCode} · {service.client?.user?.email}</small></td>
                    <td><strong>{service.title}</strong><small>{serviceTypeLabel(service.type)} · {service.holding?.title || service.location || 'No land linked'}</small></td>
                    <td><strong>{service.quoteAmount ? money(service.quoteAmount) : '—'}</strong><small>{service.invoiceNumber || 'No invoice'}</small></td>
                    <td><Status value={service.status} label={serviceStatusLabel(service.status)} /><small>{service.updates?.[0]?.message?.slice(0, 70) || ''}</small></td>
                    <td><small>{service.scheduledFor ? formatDateTime(service.scheduledFor) : 'Not scheduled'}</small><small>{service.assignedTo?.name || 'Unassigned'}</small></td>
                    <td>
                      {data.canManage ? (
                        <div className="land-admin-actions">
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

      {modal?.type === 'resale-note' ? (
        <NoteModal
          title={modal.mode === 'reject' ? 'Return resale for changes' : 'Add a review note'}
          description={modal.mode === 'reject' ? 'The client sees this note and can resubmit.' : 'Visible to the client on their resale record.'}
          busy={busy}
          onClose={() => setModal(null)}
          onSubmit={async (note) => {
            const ok = await resaleAction(modal.resale, modal.mode === 'reject' ? 'reject' : 'note', note);
            if (ok) setModal(null);
          }}
        />
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

function NoteModal({ title, description, busy, onClose, onSubmit }) {
  const [note, setNote] = useState('');
  return (
    <Modal title={title} eyebrow="Client desk" description={description} onClose={onClose}>
      <form className="office-form-grid" onSubmit={(event) => { event.preventDefault(); onSubmit(note); }}>
        <Field label="Note" full><textarea rows={4} value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} required /></Field>
        <div className="office-modal-actions office-field-full">
          <button className="office-button secondary" type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="office-button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save note'}</button>
        </div>
      </form>
    </Modal>
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
