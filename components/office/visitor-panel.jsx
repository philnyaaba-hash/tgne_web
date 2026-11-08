'use client';

import QRCode from 'qrcode';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  api, Avatar, CATEGORY_LABELS, downloadCsv, Empty, Field, formatDate, formatDateTime,
  Icon, jsonBody, Modal, PageHeading, Panel, readImageFile, STATUS_LABELS, StatusBadge, Stat, toLocalInput
} from './ui';

const STATUS_FILTERS = ['ALL', 'EXPECTED', 'AWAITING_APPROVAL', 'CHECKED_IN', 'OVERDUE', 'CHECKED_OUT', 'EXPIRED', 'CANCELLED', 'DENIED'];

export default function VisitorPanel({ user, notify, fail }) {
  const [visits, setVisits] = useState([]);
  const [counts, setCounts] = useState({});
  const [directory, setDirectory] = useState({ users: [], departments: [], rooms: [] });
  const [settings, setSettings] = useState(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [checkInVisit, setCheckInVisit] = useState(null);
  const [checkoutVisit, setCheckoutVisit] = useState(null);
  const [decision, setDecision] = useState(null);
  const [editVisit, setEditVisit] = useState(null);
  const [cancelVisit, setCancelVisit] = useState(null);
  const [correctionVisit, setCorrectionVisit] = useState(null);
  const [card, setCard] = useState(null);
  const [qrImage, setQrImage] = useState('');
  const [photo, setPhoto] = useState(null);
  const [existingVisitorId, setExistingVisitorId] = useState('');
  const [now, setNow] = useState(new Date());

  const canRegister = user.permissions.includes('visitors.register');
  const canCheckIn = user.permissions.includes('visitors.checkin');
  const canCheckOut = user.permissions.includes('visitors.checkout');
  const canApprove = user.permissions.includes('visitors.approve');
  const canPrint = user.permissions.includes('visitors.card.print');
  const canManage = user.permissions.includes('visitors.manage');
  const canExport = user.permissions.includes('visitors.export');

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (status !== 'ALL') params.set('status', status);
      const data = await api('/api/office/visitors' + (params.toString() ? '?' + params.toString() : ''));
      setVisits(data.visits);
      setCounts(data.counts);
    } catch (reason) {
      fail(reason.message);
    } finally {
      setLoading(false);
    }
  }, [query, status, fail]);

  useEffect(() => {
    const timer = setTimeout(load, query ? 250 : 0);
    return () => clearTimeout(timer);
  }, [load, query]);

  useEffect(() => {
    api('/api/office/directory').then(setDirectory).catch(() => {});
    api('/api/office/settings').then((data) => setSettings(data.settings)).catch(() => {});
    const interval = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 45000);
    const clock = setInterval(() => setNow(new Date()), 60000);
    return () => { clearInterval(interval); clearInterval(clock); };
  }, [load]);

  useEffect(() => {
    if (!card?.token) { setQrImage(''); return; }
    QRCode.toDataURL(card.token, { errorCorrectionLevel: 'M', margin: 1, width: 420, color: { dark: '#10251b', light: '#ffffff' } })
      .then(setQrImage)
      .catch(() => setQrImage(''));
  }, [card]);

  const uniqueVisitors = useMemo(() => {
    const map = new Map();
    for (const visit of visits) {
      if (!map.has(visit.visitor.id)) map.set(visit.visitor.id, visit.visitor);
    }
    return [...map.values()].slice(0, 100);
  }, [visits]);

  async function run(task, success) {
    setBusy(true);
    fail('');
    notify('');
    try {
      const result = await task();
      if (success) notify(success);
      await load();
      return result;
    } catch (reason) {
      fail(reason.message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function submitRegistration(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const duration = Number(form.get('durationMinutes')) || 120;
    const arrival = form.get('expectedArrival') ? new Date(form.get('expectedArrival')).toISOString() : new Date().toISOString();
    const result = await run(async () => api('/api/office/visitors', {
      method: 'POST',
      ...jsonBody({
        existingVisitorId: existingVisitorId || undefined,
        fullName: form.get('fullName') || undefined,
        phone: form.get('phone') || undefined,
        email: form.get('email') || undefined,
        organization: form.get('organization') || undefined,
        photo,
        hostId: form.get('hostId') || undefined,
        departmentId: form.get('departmentId') || undefined,
        meetingRoomId: form.get('meetingRoomId') || undefined,
        purpose: form.get('purpose'),
        category: form.get('category'),
        appointmentReference: form.get('appointmentReference') || undefined,
        expectedArrival: arrival,
        expectedDurationMinutes: duration,
        accessZones: form.get('accessZones') || undefined,
        notes: form.get('notes') || undefined,
        identificationType: form.get('identificationType') || undefined,
        identificationNumber: form.get('identificationNumber') || undefined,
        requiresApproval: form.get('requiresApproval') === 'on',
        consent: form.get('consent') === 'on'
      })
    }), null);
    if (result) {
      setRegisterOpen(false);
      setPhoto(null);
      setExistingVisitorId('');
      formElement.reset();
      notify(result.visit.status === 'AWAITING_APPROVAL'
        ? 'Visitor registered and sent for approval.'
        : 'Visitor ' + result.visit.visitor.visitorId + ' registered.');
    }
  }

  async function submitCheckIn(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await run(() => api('/api/office/visitors/' + encodeURIComponent(checkInVisit.id) + '/check-in', {
      method: 'POST',
      ...jsonBody({
        identityVerified: form.get('identityVerified') === 'on',
        expectedDurationMinutes: Number(form.get('durationMinutes')) || undefined,
        meetingRoomId: form.get('meetingRoomId') || undefined,
        checkInNote: form.get('checkInNote') || undefined
      })
    }), 'Visitor checked in. Temporary access is active.');
    setCheckInVisit(null);
    if (result && canPrint) await issueCard(result.visit.id);
  }

  async function submitCheckout(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await run(() => api('/api/office/visitors/' + encodeURIComponent(checkoutVisit.id) + '/check-out', {
      method: 'POST',
      ...jsonBody({
        cardReturned: form.get('cardReturned') === 'on',
        cardReturnNote: form.get('cardReturnNote') || undefined
      })
    }), 'Visitor checked out and QR access was revoked.');
    if (result) setCheckoutVisit(null);
  }

  async function submitDecision(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await run(() => api('/api/office/visitors/' + encodeURIComponent(decision.visit.id) + '/approve', {
      method: 'POST',
      ...jsonBody({ decision: decision.decision, note: form.get('note') || undefined })
    }), decision.decision === 'approve' ? 'Visit approved.' : 'Visit denied.');
    if (result) setDecision(null);
  }

  async function submitEdit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await run(() => api('/api/office/visitors/' + encodeURIComponent(editVisit.id), {
      method: 'PATCH',
      ...jsonBody({
        hostId: form.get('hostId') || null,
        departmentId: form.get('departmentId') || null,
        meetingRoomId: form.get('meetingRoomId') || null,
        purpose: form.get('purpose'),
        category: form.get('category'),
        appointmentReference: form.get('appointmentReference') || null,
        expectedArrival: form.get('expectedArrival') ? new Date(form.get('expectedArrival')).toISOString() : undefined,
        expectedCheckout: form.get('expectedCheckout') ? new Date(form.get('expectedCheckout')).toISOString() : undefined,
        accessZones: form.get('accessZones') || null,
        notes: form.get('notes') || null
      })
    }), 'Visit details updated.');
    if (result) setEditVisit(null);
  }

  async function submitCancel(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await run(() => api('/api/office/visitors/' + encodeURIComponent(cancelVisit.id) + '/cancel', {
      method: 'POST',
      ...jsonBody({ note: form.get('note') || undefined })
    }), 'Visit cancelled.');
    if (result) setCancelVisit(null);
  }

  async function submitCorrection(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await run(() => api('/api/office/visitors/' + encodeURIComponent(correctionVisit.id) + '/correct-checkout', {
      method: 'POST',
      ...jsonBody({
        reason: form.get('reason'),
        checkedOutAt: form.get('checkedOutAt') ? new Date(form.get('checkedOutAt')).toISOString() : undefined
      })
    }), 'Check-out record corrected and audited.');
    if (result) setCorrectionVisit(null);
  }

  async function issueCard(visitId) {
    setBusy(true);
    fail('');
    try {
      const data = await api('/api/office/visitors/' + encodeURIComponent(visitId) + '/qr', { method: 'POST' });
      setCard(data);
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  function exportRegister() {
    const headers = ['Visit ID', 'Visitor ID', 'Visitor', 'Phone', 'Organization', 'Host', 'Department', 'Purpose', 'Category', 'Status', 'Arrival', 'Checked in', 'Checked out'];
    const rows = visits.map((visit) => [
      visit.visitCode, visit.visitor.visitorId, visit.visitor.fullName, visit.visitor.phone, visit.visitor.organization,
      visit.host?.name, visit.department?.name, visit.purpose, CATEGORY_LABELS[visit.category] || visit.category,
      STATUS_LABELS[visit.status] || visit.status, visit.expectedArrival, visit.checkedInAt, visit.checkedOutAt
    ]);
    downloadCsv('visitor-register-' + new Date().toISOString().slice(0, 10) + '.csv', headers, rows);
  }

  const todayVisitors = (counts.EXPECTED || 0) + (counts.AWAITING_APPROVAL || 0) + (counts.CHECKED_IN || 0) + (counts.CHECKED_OUT || 0);

  return (
    <>
      <PageHeading
        eyebrow="FRONT DESK · LIVE OPERATIONS"
        title="Visitor management"
        description="Appointments, walk-ins, approvals, access cards, and visitor history."
        actions={(
          <>
            {canExport ? <button className="office-button secondary" type="button" onClick={exportRegister}><Icon name="download" size={15} /> Export register</button> : null}
            {canRegister ? <button className="office-button primary" type="button" onClick={() => setRegisterOpen(true)}><Icon name="plus" size={15} /> Register visitor</button> : null}
          </>
        )}
      />

      <div className="office-stat-grid office-stat-grid-five">
        <Stat label="Visitors today" value={todayVisitors} hint="Appointments and walk-ins" icon="users" />
        <Stat label="Currently inside" value={counts.INSIDE || 0} hint="Live access" tone="good" icon="badge" />
        <Stat label="Expected" value={counts.EXPECTED || 0} hint="Ready for check-in" icon="calendar" />
        <Stat label="Awaiting approval" value={counts.AWAITING_APPROVAL || 0} hint="Needs a decision" tone="warn" icon="clock" />
        <Stat label="Overdue" value={counts.OVERDUE || 0} hint="Past expected departure" tone={counts.OVERDUE ? 'bad' : ''} icon="alert" />
      </div>

      <div className="office-toolbar">
        <label className="office-search"><Icon name="search" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search visitor, phone, host, or visit ID" aria-label="Search visitors" /></label>
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter visits">
          {STATUS_FILTERS.map((key) => <option key={key} value={key}>{key === 'ALL' ? 'All visits' : STATUS_LABELS[key]}</option>)}
        </select>
        <button type="button" onClick={() => load()}><Icon name="refresh" size={14} /> Refresh</button>
      </div>

      <Panel
        title="Visitor register"
        subtitle={visits.length + ' records · live status updates every 45 seconds'}
        action={<span className="office-live"><i /> Live register</span>}
      >
        <div className="office-table-wrap">
          <table className="office-table office-table-roomy">
            <thead><tr><th>Visitor</th><th>Host / department</th><th>Visit</th><th>Timing</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {visits.map((visit) => (
                <tr key={visit.id}>
                  <td>
                    <div className="office-person">
                      <Avatar name={visit.visitor.fullName} size={34} />
                      <div><strong>{visit.visitor.fullName}</strong><small>{visit.visitor.visitorId} · {visit.visitor.phone}</small>{visit.visitor.organization ? <small>{visit.visitor.organization}</small> : null}</div>
                    </div>
                  </td>
                  <td><strong>{visit.host?.name || 'No host assigned'}</strong><small>{visit.department?.name || 'No department'}{visit.meetingRoom ? ' · ' + visit.meetingRoom.name : ''}</small></td>
                  <td><strong>{CATEGORY_LABELS[visit.category] || visit.category}</strong><small>{visit.purpose}</small>{visit.appointmentReference ? <small>Ref · {visit.appointmentReference}</small> : null}</td>
                  <td><strong>{visit.checkedInAt ? formatDateTime(visit.checkedInAt) : formatDateTime(visit.expectedArrival)}</strong><small>Out · {formatDateTime(visit.expectedCheckout)}</small></td>
                  <td><StatusBadge value={visit.status} /><small className="office-cell-note">{visit.correctedAt ? 'Corrected ' + formatDateTime(visit.correctedAt) : ''}</small></td>
                  <td>
                    <div className="office-row-actions">
                      {visit.status === 'AWAITING_APPROVAL' && canApprove ? <button type="button" onClick={() => setDecision({ visit, decision: 'approve' })}>Review</button> : null}
                      {visit.status === 'EXPECTED' && canCheckIn ? <button type="button" onClick={() => setCheckInVisit(visit)}>Check in</button> : null}
                      {visit.status === 'CHECKED_IN' && canCheckOut ? <button type="button" onClick={() => setCheckoutVisit(visit)}>Check out</button> : null}
                      {visit.status === 'CHECKED_IN' && canPrint ? <button type="button" onClick={() => issueCard(visit.id)}>Card</button> : null}
                      {canManage ? <button type="button" onClick={() => setEditVisit(visit)}>Edit</button> : null}
                      {canManage && ['EXPECTED', 'AWAITING_APPROVAL'].includes(visit.status) ? <button type="button" className="text-danger" onClick={() => setCancelVisit(visit)}>Cancel</button> : null}
                      {canManage && visit.status === 'CHECKED_OUT' ? <button type="button" className="text-muted" onClick={() => setCorrectionVisit(visit)}>Correct</button> : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!visits.length ? <Empty colSpan={6}>{loading ? 'Loading visitor register…' : 'No visits match these filters. Register a walk-in or adjust the search.'}</Empty> : null}
            </tbody>
          </table>
        </div>
      </Panel>

      <section className="office-note-strip">
        <span><Icon name="shield" size={15} /> Access is validated server-side. QR passes are revoked immediately on check-out or cancellation.</span>
        <span className="office-muted">Last refreshed {formatDateTime(now)}</span>
      </section>

      {registerOpen ? (
        <Modal title="Register visitor" eyebrow="NEW APPOINTMENT OR WALK-IN" description="Collect only the details needed for this visit. Consent is required." onClose={() => { setRegisterOpen(false); setPhoto(null); setExistingVisitorId(''); }} wide>
          <form onSubmit={submitRegistration}>
            <div className="office-form-grid">
              <label className="office-field-full office-returning-picker">
                <span>Returning visitor</span>
                <select value={existingVisitorId} onChange={(event) => setExistingVisitorId(event.target.value)}>
                  <option value="">New visitor</option>
                  {uniqueVisitors.map((visitor) => <option key={visitor.id} value={visitor.id}>{visitor.fullName} · {visitor.visitorId} · {visitor.phone}</option>)}
                </select>
                <small>Reuse an existing visitor record to keep their visit history together.</small>
              </label>
              {!existingVisitorId ? (
                <>
                  <Field label="Full name *"><input name="fullName" autoComplete="name" required maxLength="150" /></Field>
                  <Field label="Phone number *"><input name="phone" type="tel" autoComplete="tel" required maxLength="40" /></Field>
                </>
              ) : (
                <div className="office-field-full office-inline-note"><Icon name="user" size={14} /> The selected visitor's saved identity and contact details will be reused.</div>
              )}
              <Field label="Email (optional)"><input name="email" type="email" autoComplete="email" maxLength="254" /></Field>
              <Field label="Organization"><input name="organization" maxLength="150" /></Field>
              <Field label="Visit category"><select name="category" defaultValue="GUEST">{Object.entries(CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
              <Field label="Host"><select name="hostId"><option value="">Select a staff member</option>{directory.users.map((person) => <option key={person.id} value={person.id}>{person.name}{person.department ? ' · ' + person.department.name : ''}</option>)}</select></Field>
              <Field label="Department"><select name="departmentId"><option value="">Use host department</option>{directory.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></Field>
              <Field label="Meeting room"><select name="meetingRoomId"><option value="">No room assigned</option>{directory.rooms.map((room) => <option key={room.id} value={room.id}>{room.name}{room.location ? ' · ' + room.location : ''}</option>)}</select></Field>
              <Field label="Appointment reference"><input name="appointmentReference" maxLength="100" /></Field>
              <Field label="Expected arrival"><input name="expectedArrival" type="datetime-local" defaultValue={toLocalInput(new Date())} /></Field>
              <Field label="Expected duration" hint="Used to calculate the access expiry if no departure time is set."><select name="durationMinutes" defaultValue="120"><option value="30">30 minutes</option><option value="60">1 hour</option><option value="120">2 hours</option><option value="240">Half day</option><option value="480">Full day</option></select></Field>
              <Field label="Purpose of visit *" full><textarea name="purpose" required maxLength="1000" rows="3" /></Field>
              <Field label="Access areas" full hint="Shown on the temporary card. Defaults to the organization card settings."><input name="accessZones" maxLength="300" placeholder={settings?.card?.accessZones || 'Reception · Meeting rooms'} /></Field>

              <div className="office-field-full office-photo-field">
                <span>Visitor photograph</span>
                <div className="office-photo-upload">
                  <Avatar src={photo} name="Photo" size={62} />
                  <div>
                    <label className="office-button secondary office-file-button"><Icon name="camera" size={15} /> {photo ? 'Replace photo' : 'Capture or upload photo'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={async (event) => {
                      try { setPhoto(await readImageFile(event.target.files?.[0])); } catch (reason) { fail(reason.message); }
                    }} /></label>
                    {photo ? <button type="button" className="office-link-button" onClick={() => setPhoto(null)}>Remove photo</button> : null}
                    <small>JPEG, PNG, or WebP. Images are compressed before storage.</small>
                  </div>
                </div>
              </div>

              <details className="office-field-full">
                <summary>Optional identity verification</summary>
                <div className="office-form-grid office-id-fields">
                  <Field label="Identification type"><select name="identificationType"><option value="">Not collected</option><option>National ID</option><option>Passport</option><option>Driver licence</option><option>Staff ID</option><option>Other</option></select></Field>
                  <Field label="Identification number" hint="Encrypted before storage. Requires VISITOR_DATA_KEY."><input name="identificationNumber" autoComplete="off" maxLength="100" /></Field>
                </div>
              </details>
              <Field label="Internal notes" full><textarea name="notes" rows="2" maxLength="1000" /></Field>
              <label className="office-check-option office-field-full"><input name="requiresApproval" type="checkbox" /> This visit requires manager approval before access</label>
              <label className="office-check-option office-field-full"><input name="consent" type="checkbox" required /> Visitor consented to their information and photograph being recorded for office access management.</label>
            </div>
            <footer>
              <button className="office-button secondary" type="button" onClick={() => { setRegisterOpen(false); setPhoto(null); setExistingVisitorId(''); }}>Cancel</button>
              <button className="office-button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Register visitor'}</button>
            </footer>
          </form>
        </Modal>
      ) : null}

      {checkInVisit ? (
        <Modal title="Check in visitor" eyebrow="ARRIVAL CONFIRMATION" description={checkInVisit.visitor.fullName + ' · ' + checkInVisit.visitor.visitorId} onClose={() => setCheckInVisit(null)}>
          <form onSubmit={submitCheckIn}>
            <div className="office-form-grid">
              <Field label="Confirmed host" full><input value={(checkInVisit.host?.name || 'No host') + (checkInVisit.department ? ' · ' + checkInVisit.department.name : '')} readOnly /></Field>
              <Field label="Expected duration"><select name="durationMinutes" defaultValue="120"><option value="30">30 minutes</option><option value="60">1 hour</option><option value="120">2 hours</option><option value="240">Half day</option><option value="480">Full day</option></select></Field>
              <Field label="Meeting room"><select name="meetingRoomId" defaultValue={checkInVisit.meetingRoom?.id || ''}><option value="">No room assigned</option>{directory.rooms.map((room) => <option key={room.id} value={room.id}>{room.name}{room.location ? ' · ' + room.location : ''}</option>)}</select></Field>
              <Field label="Check-in note" full><textarea name="checkInNote" rows="2" maxLength="500" placeholder="Identity verified against an approved document." /></Field>
              <label className="office-check-option office-field-full"><input name="identityVerified" type="checkbox" defaultChecked required /> I have confirmed the visitor's identity according to policy</label>
            </div>
            <footer><button className="office-button secondary" type="button" onClick={() => setCheckInVisit(null)}>Cancel</button><button className="office-button primary" type="submit" disabled={busy}>Check in &amp; notify host</button></footer>
          </form>
        </Modal>
      ) : null}

      {checkoutVisit ? (
        <Modal title="Complete check-out" eyebrow="VISITOR CHECK-OUT" description={checkoutVisit.visitor.fullName + ' · ' + checkoutVisit.visitor.visitorId} onClose={() => setCheckoutVisit(null)}>
          <form onSubmit={submitCheckout}>
            <label className="office-check-option"><input name="cardReturned" type="checkbox" defaultChecked /> Temporary visitor card returned</label>
            <Field label="Missing or damaged card note" hint="Required when the card is not returned."><textarea name="cardReturnNote" rows="3" maxLength="500" /></Field>
            <footer><button className="office-button secondary" type="button" onClick={() => setCheckoutVisit(null)}>Cancel</button><button className="office-button primary" type="submit" disabled={busy}>Check out &amp; revoke access</button></footer>
          </form>
        </Modal>
      ) : null}

      {decision ? (
        <Modal title={decision.decision === 'approve' ? 'Approve visit' : 'Deny visit'} eyebrow="RESTRICTED ACCESS DECISION" description={decision.visit.visitor.fullName + ' · ' + decision.visit.visitCode} onClose={() => setDecision(null)}>
          <form onSubmit={submitDecision}>
            <Field label="Decision note" full><textarea name="note" rows="3" maxLength="500" placeholder={decision.decision === 'approve' ? 'Approved with standard reception access.' : 'Reason for denial.'} /></Field>
            <footer><button className="office-button secondary" type="button" onClick={() => setDecision(null)}>Cancel</button>{decision.decision === 'approve' ? <button className="office-button danger" type="button" disabled={busy} onClick={() => setDecision({ ...decision, decision: 'deny' })}>Switch to deny</button> : null}<button className={decision.decision === 'approve' ? 'office-button primary' : 'office-button danger-solid'} type="submit" disabled={busy}>{decision.decision === 'approve' ? 'Approve visit' : 'Deny visit'}</button></footer>
          </form>
        </Modal>
      ) : null}

      {editVisit ? (
        <Modal title="Edit visit" eyebrow="OPERATIONAL CORRECTION" description={editVisit.visitor.fullName + ' · ' + editVisit.visitCode} onClose={() => setEditVisit(null)} wide>
          <form onSubmit={submitEdit}>
            <div className="office-form-grid">
              <Field label="Host"><select name="hostId" defaultValue={editVisit.host?.id || ''}><option value="">No host</option>{directory.users.map((person) => <option key={person.id} value={person.id}>{person.name}{person.department ? ' · ' + person.department.name : ''}</option>)}</select></Field>
              <Field label="Department"><select name="departmentId" defaultValue={editVisit.department?.id || ''}><option value="">No department</option>{directory.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></Field>
              <Field label="Meeting room"><select name="meetingRoomId" defaultValue={editVisit.meetingRoom?.id || ''}><option value="">No room</option>{directory.rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select></Field>
              <Field label="Category"><select name="category" defaultValue={editVisit.category}>{Object.entries(CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
              <Field label="Expected arrival"><input name="expectedArrival" type="datetime-local" defaultValue={toLocalInput(editVisit.expectedArrival)} /></Field>
              <Field label="Expected departure"><input name="expectedCheckout" type="datetime-local" defaultValue={toLocalInput(editVisit.expectedCheckout)} /></Field>
              <Field label="Appointment reference"><input name="appointmentReference" defaultValue={editVisit.appointmentReference || ''} maxLength="100" /></Field>
              <Field label="Access areas"><input name="accessZones" defaultValue={editVisit.accessZones || ''} maxLength="300" /></Field>
              <Field label="Purpose of visit" full><textarea name="purpose" defaultValue={editVisit.purpose} rows="3" maxLength="1000" /></Field>
              <Field label="Internal notes" full><textarea name="notes" defaultValue={editVisit.notes || ''} rows="2" maxLength="1000" /></Field>
            </div>
            <footer><button className="office-button secondary" type="button" onClick={() => setEditVisit(null)}>Cancel</button><button className="office-button primary" type="submit" disabled={busy}>Save changes</button></footer>
          </form>
        </Modal>
      ) : null}

      {cancelVisit ? (
        <Modal title="Cancel visit" eyebrow="VISIT LIFECYCLE" description={cancelVisit.visitor.fullName + ' · ' + cancelVisit.visitCode} onClose={() => setCancelVisit(null)}>
          <form onSubmit={submitCancel}>
            <Field label="Cancellation note"><textarea name="note" rows="3" maxLength="500" placeholder="Reason for cancelling this visit." /></Field>
            <footer><button className="office-button secondary" type="button" onClick={() => setCancelVisit(null)}>Keep visit</button><button className="office-button danger-solid" type="submit" disabled={busy}>Cancel visit</button></footer>
          </form>
        </Modal>
      ) : null}

      {correctionVisit ? (
        <Modal title="Correct check-out" eyebrow="AUTHORIZED CORRECTION" description="This action is recorded in the audit trail." onClose={() => setCorrectionVisit(null)}>
          <form onSubmit={submitCorrection}>
            <div className="office-form-grid">
              <Field label="Corrected check-out time"><input name="checkedOutAt" type="datetime-local" defaultValue={toLocalInput(correctionVisit.checkedOutAt)} /></Field>
              <Field label="Reason *" full><textarea name="reason" required rows="3" maxLength="500" placeholder="Explain why the original check-out record is being corrected." /></Field>
            </div>
            <footer><button className="office-button secondary" type="button" onClick={() => setCorrectionVisit(null)}>Cancel</button><button className="office-button primary" type="submit" disabled={busy}>Save correction</button></footer>
          </form>
        </Modal>
      ) : null}

      {card ? (
        <div className="office-modal-backdrop office-card-backdrop" role="presentation">
          <section className="office-card-modal" role="dialog" aria-modal="true" aria-label="Temporary visitor card">
            <div className="visitor-print-card" style={{ '--card-accent': card.card?.accentColor || '#125b38' }}>
              <div className="visitor-card-top">
                <span className="visitor-card-mark" style={{ background: card.card?.accentColor || '#125b38' }}>{card.organization?.logoLetter || 'A'}</span>
                <span>{card.organization?.name || 'Organization'}<small>{card.card?.headerText || 'TEMPORARY VISITOR'}</small></span>
              </div>
              <div className="visitor-card-content">
                <div className="visitor-card-identity">
                  {card.card?.showPhoto !== false && card.visit.visitor.photoUrl ? <img className="visitor-card-photo" src={card.visit.visitor.photoUrl} alt="" /> : null}
                  <div>
                    <small>VISITOR</small>
                    <strong>{card.visit.visitor.fullName}</strong>
                    <span>{card.visit.visitor.organization || CATEGORY_LABELS[card.visit.category] || 'Visitor'}</span>
                    {card.card?.showHost !== false ? <span>Host · {card.visit.host?.name || 'Reception'}{card.visit.department ? ' · ' + card.visit.department.name : ''}</span> : null}
                    {card.visit.meetingRoom ? <span>Room · {card.visit.meetingRoom.name}</span> : null}
                  </div>
                </div>
                {card.card?.showQr !== false ? <img className="visitor-card-qr" src={qrImage} alt="Visitor access QR code" /> : null}
              </div>
              <div className="visitor-card-access"><span>ACCESS</span><strong>{card.visit.accessZones || card.card?.accessZones || 'Reception'}</strong></div>
              <div className="visitor-card-footer">
                <span>ID · {card.visit.visitor.visitorId}</span>
                <span>VALID UNTIL · {formatDateTime(card.expiresAt)}</span>
                <span>REF · {card.visit.visitCode}</span>
              </div>
              <p className="visitor-card-instructions">{card.card?.instructions}</p>
            </div>
            <div className="visitor-card-actions">
              <p>QR access expires at the expected departure and is revoked immediately on check-out. {card.print?.printerName ? 'Configured printer: ' + card.print.printerName + '.' : ''}</p>
              <button className="office-button secondary" type="button" onClick={() => setCard(null)}>Close</button>
              <button className="office-button primary" type="button" onClick={() => window.print()}><Icon name="print" size={15} /> Print ID card</button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
