'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  api, Avatar, Empty, Field, formatDate, formatDateTime, formatTime, Icon, jsonBody,
  Modal, PageHeading, Panel, Stat, StatusBadge
} from './ui';

const ATTENDANCE_STATUSES = ['PRESENT', 'LATE', 'REMOTE', 'ABSENT', 'LEAVE'];

function todayInput() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function shiftDate(value, days) {
  const date = new Date(value + 'T12:00:00');
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

export default function AttendancePanel({ user, notify, fail }) {
  const [date, setDate] = useState(todayInput());
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({});
  const [myRecord, setMyRecord] = useState(null);
  const [canViewAll, setCanViewAll] = useState(false);
  const [directory, setDirectory] = useState({ users: [] });
  const [busy, setBusy] = useState(false);
  const [marking, setMarking] = useState(false);
  const [view, setView] = useState('mine');

  const canManage = user.permissions.includes('attendance.manage');

  const load = useCallback(async () => {
    try {
      const data = await api('/api/office/attendance?date=' + encodeURIComponent(date));
      setRecords(data.records);
      setSummary(data.summary);
      setMyRecord(data.myRecord);
      setCanViewAll(data.canViewAll);
    } catch (reason) {
      fail(reason.message);
    }
  }, [date, fail]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!canManage) return;
    api('/api/office/directory').then(setDirectory).catch(() => {});
  }, [canManage]);

  const myToday = myRecord && String(myRecord.date).slice(0, 10) === todayInput();
  const teamRecords = useMemo(() => records.filter((record) => record.userId !== user.id), [records, user.id]);
  const visible = view === 'team' && canViewAll ? records : records.filter((record) => record.userId === user.id);

  async function clock(action) {
    setBusy(true);
    try {
      await api('/api/office/attendance', { method: 'POST', ...jsonBody({ action }) });
      notify(action === 'clock-in' ? 'Clocked in. Have a productive day.' : 'Clocked out. Attendance recorded.');
      await load();
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  async function mark(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const checkIn = form.get('checkInAt');
    const checkOut = form.get('checkOutAt');
    setBusy(true);
    try {
      await api('/api/office/attendance', {
        method: 'POST',
        ...jsonBody({
          action: 'mark',
          userId: form.get('userId'),
          date,
          status: form.get('status'),
          note: form.get('note'),
          checkInAt: checkIn ? new Date(checkIn).toISOString() : null,
          checkOutAt: checkOut ? new Date(checkOut).toISOString() : null
        })
      });
      notify('Attendance recorded for ' + date + '.');
      setMarking(false);
      await load();
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  const worked = myToday && myRecord?.checkInAt ? (
    myRecord.checkOutAt
      ? Math.max(0, Math.round((new Date(myRecord.checkOutAt) - new Date(myRecord.checkInAt)) / 60000))
      : Math.max(0, Math.round((new Date() - new Date(myRecord.checkInAt)) / 60000))
  ) : 0;

  return (
    <>
      <PageHeading
        eyebrow="PEOPLE & ATTENDANCE"
        title="Attendance"
        description="Daily clock-in records, team presence, and attendance corrections."
        actions={<div className="office-heading-actions">
          <button className="office-button secondary" type="button" onClick={() => setDate(shiftDate(date, -1))} aria-label="Previous day"><Icon name="arrow" size={14} style={{ transform: 'rotate(180deg)' }} /></button>
          <input className="office-date-input" type="date" value={date} max={todayInput()} onChange={(event) => setDate(event.target.value)} aria-label="Attendance date" />
          <button className="office-button secondary" type="button" onClick={() => setDate(shiftDate(date, 1))} disabled={date >= todayInput()} aria-label="Next day"><Icon name="arrow" size={14} /></button>
          {canManage ? <button className="office-button primary" type="button" onClick={() => setMarking(true)}><Icon name="edit" size={15} /> Record attendance</button> : null}
        </div>}
      />

      <div className="office-stat-grid">
        <Stat label="Present" value={summary.present || 0} hint="Including remote and late" icon="check" tone="positive" />
        <Stat label="Late" value={summary.late || 0} hint="After 09:30" icon="clock" tone={summary.late ? 'warn' : ''} />
        <Stat label="On site now" value={summary.onSite || 0} hint="Clocked in, not out" icon="building" />
        <Stat label="Absent / leave" value={(summary.absent || 0) + (summary.leave || 0)} hint="Recorded away" icon="calendar" />
      </div>

      <div className="office-attendance-grid">
        <Panel title="My attendance" subtitle={formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })} className="office-clock-panel">
          <div className={'office-clock-card' + (myToday && myRecord?.checkInAt ? ' active' : '')}>
            <span className="office-eyebrow">{myToday ? 'TODAY' : 'SELECTED DAY'}</span>
            <strong>{myToday && myRecord?.checkInAt ? formatTime(myRecord.checkInAt) : '—:—'}</strong>
            <small>{myToday && myRecord?.checkInAt ? 'Checked in · ' + (myRecord.checkOutAt ? 'checked out ' + formatTime(myRecord.checkOutAt) : 'currently on site') : 'No clock-in recorded for this day.'}</small>
            {myToday && myRecord?.checkInAt ? <span className="office-clock-worked">{Math.floor(worked / 60)}h {worked % 60}m recorded</span> : null}
          </div>
          <div className="office-clock-actions">
            <button className="office-button primary" type="button" onClick={() => clock('clock-in')} disabled={busy || !myToday || Boolean(myRecord?.checkInAt)}><Icon name="clock" size={15} /> Clock in</button>
            <button className="office-button secondary" type="button" onClick={() => clock('clock-out')} disabled={busy || !myToday || !myRecord?.checkInAt || Boolean(myRecord?.checkOutAt)}><Icon name="logout" size={15} /> Clock out</button>
          </div>
          {myToday && myRecord ? (
            <dl className="office-detail-list compact">
              <div><dt>Status</dt><dd><StatusBadge value={myRecord.status} /></dd></div>
              <div><dt>Check in</dt><dd>{formatDateTime(myRecord.checkInAt)}</dd></div>
              <div><dt>Check out</dt><dd>{formatDateTime(myRecord.checkOutAt)}</dd></div>
              <div><dt>Note</dt><dd>{myRecord.note || '—'}</dd></div>
            </dl>
          ) : null}
        </Panel>

        <Panel
          title="Attendance register"
          subtitle={view === 'team' && canViewAll ? 'All staff · ' + formatDate(date) : 'Your records · ' + formatDate(date)}
          action={canViewAll ? <div className="office-segmented">
            <button type="button" className={view === 'mine' ? 'active' : ''} onClick={() => setView('mine')}>Me</button>
            <button type="button" className={view === 'team' ? 'active' : ''} onClick={() => setView('team')}>Team</button>
          </div> : null}
        >
          <div className="office-table-wrap">
            <table className="office-table">
              <thead><tr><th>Staff member</th><th>Department</th><th>Status</th><th>Check in</th><th>Check out</th><th>Note</th></tr></thead>
              <tbody>
                {visible.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <div className="office-person-cell">
                        <Avatar name={record.user.name} size={32} />
                        <div><strong>{record.user.name}</strong><small>{record.user.employeeId || record.user.jobTitle || 'Staff'}</small></div>
                      </div>
                    </td>
                    <td>{record.user.department?.name || '—'}</td>
                    <td><StatusBadge value={record.status} /></td>
                    <td>{formatTime(record.checkInAt)}</td>
                    <td>{formatTime(record.checkOutAt)}</td>
                    <td>{record.note || '—'}</td>
                  </tr>
                ))}
                {!visible.length ? <Empty colSpan={6}>{view === 'team' ? 'No attendance records for this day.' : 'You have no attendance record for this day.'}</Empty> : null}
              </tbody>
            </table>
          </div>
          {canViewAll && view === 'team' ? <p className="office-hint-line">{teamRecords.length} colleagues recorded · {summary.onSite || 0} currently on site.</p> : null}
        </Panel>
      </div>

      {marking ? (
        <Modal title="Record attendance" eyebrow={formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })} description="Use this for staff who cannot clock in themselves or to correct a record." onClose={() => setMarking(false)}>
          <form onSubmit={mark}>
            <div className="office-form-grid">
              <Field label="Staff member" full>
                <select name="userId" required defaultValue="">
                  <option value="" disabled>Select a staff member</option>
                  {(directory.users || []).filter((person) => person.id !== user.id).map((person) => <option key={person.id} value={person.id}>{person.name}{person.department ? ' · ' + person.department.name : ''}</option>)}
                  <option value={user.id}>{user.name} (me)</option>
                </select>
              </Field>
              <Field label="Status">
                <select name="status" defaultValue="PRESENT">
                  {ATTENDANCE_STATUSES.map((value) => <option key={value} value={value}>{value[0] + value.slice(1).toLowerCase()}</option>)}
                </select>
              </Field>
              <Field label="Note"><input name="note" maxLength={300} placeholder="Optional reason or remark" /></Field>
              <Field label="Check in"><input name="checkInAt" type="datetime-local" defaultValue={date + 'T09:00'} /></Field>
              <Field label="Check out"><input name="checkOutAt" type="datetime-local" /></Field>
            </div>
            <footer className="office-modal-actions">
              <button className="office-button secondary" type="button" onClick={() => setMarking(false)}>Cancel</button>
              <button className="office-button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save attendance'}</button>
            </footer>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
