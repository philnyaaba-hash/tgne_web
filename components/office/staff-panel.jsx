'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  api, Avatar, downloadApiFile, Field, formatDate, formatDateTime, Icon, jsonBody,
  Modal, PageHeading, Panel, readImageFile, Stat, StatusBadge
} from './ui';

const STATUS_FILTERS = ['ALL', 'ACTIVE', 'DEACTIVATED'];

export default function StaffPanel({ user, notify, fail }) {
  const [staff, setStaff] = useState([]);
  const [directory, setDirectory] = useState({ users: [], departments: [], roles: [] });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [slackInviteUrl, setSlackInviteUrl] = useState('');

  const canManage = user.permissions.includes('staff.manage');
  const canExport = user.permissions.includes('staff.export');
  const canViewRoles = user.permissions.includes('roles.manage');

  const load = useCallback(async () => {
    try {
      const [staffData, directoryData] = await Promise.all([
        api('/api/office/users'),
        api('/api/office/directory')
      ]);
      setStaff(staffData.users);
      setSlackInviteUrl(staffData.slack?.inviteUrl || '');
      setDirectory(directoryData);
    } catch (reason) {
      fail(reason.message);
    } finally {
      setLoading(false);
    }
  }, [fail]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return staff.filter((person) => {
      if (status !== 'ALL' && person.status !== status) return false;
      if (!needle) return true;
      return [person.name, person.email, person.slackEmail, person.employeeId, person.jobTitle, person.department?.name, ...(person.roles || []).map((role) => role.name)]
        .filter(Boolean).some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [staff, query, status]);

  const active = staff.filter((person) => person.status === 'ACTIVE').length;
  const departments = new Set(staff.map((person) => person.department?.name).filter(Boolean)).size;

  async function save(payload, member) {
    setBusy(true);
    try {
      if (member) {
        await api('/api/office/users/' + encodeURIComponent(member.id), { method: 'PATCH', ...jsonBody(payload) });
        notify('Staff record updated for ' + payload.name + '.');
      } else {
        await api('/api/office/users', { method: 'POST', ...jsonBody(payload) });
        notify('Staff account created for ' + payload.name + '.');
      }
      setEditing(null);
      await load();
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(member) {
    const next = member.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE';
    if (next === 'DEACTIVATED' && !window.confirm('Deactivate ' + member.name + '? They will no longer be able to sign in. Their history is retained.')) return;
    setBusy(true);
    try {
      await api('/api/office/users/' + encodeURIComponent(member.id), { method: 'PATCH', ...jsonBody({ status: next }) });
      notify(member.name + (next === 'ACTIVE' ? ' reactivated.' : ' deactivated.'));
      await load();
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  async function openDetail(member) {
    setDetail({ loading: true, member });
    try {
      const data = await api('/api/office/users/' + encodeURIComponent(member.id));
      setDetail({ ...data, loading: false });
    } catch (reason) {
      fail(reason.message);
      setDetail(null);
    }
  }

  async function exportCsv() {
    try {
      await downloadApiFile('/api/office/users?format=csv', 'staff-directory.csv');
      notify('Staff directory exported.');
    } catch (reason) {
      fail(reason.message);
    }
  }

  async function inviteSlack(member) {
    setBusy(true);
    try {
      const result = await api('/api/office/users/' + encodeURIComponent(member.id) + '/slack-invite', { method: 'POST', ...jsonBody({}) });
      notify('Slack invite sent to ' + result.to + '.');
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="PEOPLE & ORGANIZATION"
        title="Staff directory"
        description="Employee records, reporting lines, roles, and account status. Access is enforced by the server."
        actions={<>
          {canExport ? <button className="office-button secondary" type="button" onClick={exportCsv}><Icon name="download" size={15} /> Export CSV</button> : null}
          {canManage ? <button className="office-button primary" type="button" onClick={() => setEditing({ member: null })}><Icon name="plus" size={15} /> Add staff</button> : null}
        </>}
      />

      <div className="office-stat-grid">
        <Stat label="Total staff" value={staff.length} hint="All employment records" icon="users" />
        <Stat label="Active accounts" value={active} hint="Able to sign in" icon="shield" tone="positive" />
        <Stat label="Deactivated" value={staff.length - active} hint="Access suspended" icon="lock" />
        <Stat label="Departments" value={departments} hint="With assigned staff" icon="building" />
      </div>

      <Panel
        title="Directory"
        subtitle={filtered.length + ' of ' + staff.length + ' records'}
        action={<div className="office-toolbar compact">
          <label className="office-search"><Icon name="search" size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, ID, role, department" aria-label="Search staff" /></label>
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
            {STATUS_FILTERS.map((value) => <option key={value} value={value}>{value === 'ALL' ? 'All statuses' : value === 'ACTIVE' ? 'Active' : 'Deactivated'}</option>)}
          </select>
        </div>}
      >
        <div className="office-table-wrap">
          <table className="office-table">
            <thead><tr><th>Staff member</th><th>Employee ID</th><th>Department</th><th>Roles</th><th>Contact</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map((person) => (
                <tr key={person.id}>
                  <td>
                    <div className="office-person-cell">
                      <Avatar src={person.photoUrl} name={person.name} size={36} />
                      <div><strong>{person.name}</strong><small>{person.jobTitle || 'No job title'}</small></div>
                    </div>
                  </td>
                  <td>{person.employeeId || '—'}</td>
                  <td><strong>{person.department?.name || '—'}</strong><small>{person.manager ? 'Reports to ' + person.manager.name : 'No manager'}</small></td>
                  <td><div className="office-role-chips compact">{person.roles.length ? person.roles.map((role) => <span key={role.id}>{role.name}</span>) : <span>No role</span>}</div></td>
                  <td><strong>{person.email}</strong><small>{person.phone || 'No phone'}</small></td>
                  <td><StatusBadge value={person.status} label={person.status === 'ACTIVE' ? 'Active' : 'Deactivated'} /></td>
                  <td><div className="office-row-actions">
                    <button type="button" onClick={() => openDetail(person)}>View</button>
                    {canManage ? <button type="button" onClick={() => setEditing({ member: person })}>Edit</button> : null}
                    {canManage && person.id !== user.id ? <button type="button" className={person.status === 'ACTIVE' ? 'text-danger' : ''} onClick={() => toggleStatus(person)}>{person.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}</button> : null}
                  </div></td>
                </tr>
              ))}
              {!filtered.length ? <tr><td className="office-empty" colSpan={7}>{loading ? 'Loading staff records…' : 'No staff match these filters.'}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Panel>

      {editing ? (
        <StaffForm
          member={editing.member}
          user={user}
          options={directory}
          slackInviteUrl={slackInviteUrl}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={(payload) => save(payload, editing.member)}
        />
      ) : null}

      {detail ? (
        <StaffDetail
          detail={detail}
          slackInviteUrl={slackInviteUrl}
          canManage={canManage}
          busy={busy}
          onInvite={inviteSlack}
          onClose={() => setDetail(null)}
        />
      ) : null}

      {canViewRoles ? (
        <p className="office-hint-line"><Icon name="shield" size={14} /> Role and permission changes are recorded in the audit history and role-change log.</p>
      ) : null}
    </>
  );
}

function StaffForm({ member, user, options, slackInviteUrl, busy, onClose, onSave }) {
  const [photo, setPhoto] = useState(undefined);
  const [preview, setPreview] = useState(member?.photoUrl || '');
  const [roleKeys, setRoleKeys] = useState(member?.roles?.map((role) => role.key) || []);
  const [error, setError] = useState('');

  async function choosePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const data = await readImageFile(file);
      setPhoto(data);
      setPreview(data);
    } catch (reason) {
      setError(reason.message);
    }
  }

  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!roleKeys.length) {
      setError('Assign at least one role.');
      return;
    }
    const payload = {
      name: form.get('name'),
      email: form.get('email'),
      slackEmail: form.get('slackEmail'),
      employeeId: form.get('employeeId'),
      jobTitle: form.get('jobTitle'),
      phone: form.get('phone'),
      officeLocation: form.get('officeLocation'),
      departmentId: form.get('departmentId'),
      managerId: form.get('managerId'),
      dateEmployed: form.get('dateEmployed') || null,
      emergencyContactName: form.get('emergencyContactName'),
      emergencyContactPhone: form.get('emergencyContactPhone'),
      roles: roleKeys
    };
    const password = form.get('password');
    if (password) payload.password = password;
    if (member) payload.status = form.get('status');
    if (photo !== undefined) payload.photo = photo;
    onSave(payload);
  }

  const managers = options.users?.filter((person) => person.id !== member?.id) || [];

  return (
    <Modal
      title={member ? 'Edit staff record' : 'Add staff member'}
      eyebrow={member ? 'STAFF RECORD' : 'NEW ACCOUNT'}
      description={member ? 'Update employment details, reporting line, or access roles.' : 'Create a secure staff account with least-privilege access.'}
      onClose={onClose}
      wide
    >
      <form onSubmit={submit}>
        <div className="office-form-grid">
          <div className="office-field-full office-photo-field">
            <Avatar src={preview} name={member?.name || 'New'} size={64} />
            <div>
              <label className="office-button secondary file-button">
                <Icon name="camera" size={15} /> {preview ? 'Change photo' : 'Add photo'}
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={choosePhoto} hidden />
              </label>
              {preview ? <button type="button" className="office-link-button" onClick={() => { setPhoto(''); setPreview(''); }}>Remove photo</button> : null}
              <small>JPEG, PNG, or WebP. Resized automatically.</small>
            </div>
          </div>

          <Field label="Full name"><input name="name" defaultValue={member?.name || ''} required maxLength={150} autoComplete="name" /></Field>
          <Field label="Email address"><input name="email" type="email" defaultValue={member?.email || ''} required maxLength={254} autoComplete="email" /></Field>
          <Field
            label="Slack email"
            hint={slackInviteUrl
              ? <>No Slack account yet? <a href={slackInviteUrl} target="_blank" rel="noreferrer">Open the workspace invite</a>.</>
              : 'Optional. Leave blank if they do not have a Slack account yet.'}
          >
            <input name="slackEmail" type="email" defaultValue={member?.slackEmail || ''} maxLength={254} placeholder="name@company.slack.com" autoComplete="email" />
          </Field>
          <Field label={member ? 'Reset password (optional)' : 'Temporary password'}><input name="password" type="password" minLength={member ? 0 : 12} required={!member} maxLength={200} autoComplete="new-password" placeholder={member ? 'Leave blank to keep current' : 'At least 12 characters'} /></Field>
          <Field label="Employee ID"><input name="employeeId" defaultValue={member?.employeeId || ''} maxLength={50} /></Field>
          <Field label="Job title"><input name="jobTitle" defaultValue={member?.jobTitle || ''} maxLength={120} /></Field>
          <Field label="Phone"><input name="phone" type="tel" defaultValue={member?.phone || ''} maxLength={40} autoComplete="tel" /></Field>
          <Field label="Department">
            <select name="departmentId" defaultValue={member?.department?.id || ''}>
              <option value="">No department</option>
              {(options.departments || []).map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
          </Field>
          <Field label="Reporting manager">
            <select name="managerId" defaultValue={member?.manager?.id || ''}>
              <option value="">No manager</option>
              {managers.map((person) => <option key={person.id} value={person.id}>{person.name}{person.department ? ' · ' + person.department.name : ''}</option>)}
            </select>
          </Field>
          <Field label="Office location"><input name="officeLocation" defaultValue={member?.officeLocation || ''} maxLength={150} /></Field>
          <Field label="Date employed"><input name="dateEmployed" type="date" defaultValue={member?.dateEmployed ? String(member.dateEmployed).slice(0, 10) : ''} /></Field>
          <Field label="Emergency contact"><input name="emergencyContactName" defaultValue={member?.emergencyContactName || ''} maxLength={120} /></Field>
          <Field label="Emergency phone"><input name="emergencyContactPhone" type="tel" defaultValue={member?.emergencyContactPhone || ''} maxLength={40} /></Field>
          {member ? (
            <Field label="Account status">
              <select name="status" defaultValue={member.status}>
                <option value="ACTIVE">Active</option>
                <option value="DEACTIVATED">Deactivated</option>
              </select>
            </Field>
          ) : null}
        </div>

        <fieldset className="office-role-picker">
          <legend>Assigned roles <small>Select every role this person needs. Permissions combine.</small></legend>
          <div className="office-role-picker-grid">
            {(options.roles || []).map((role) => (
              <label key={role.key} className={roleKeys.includes(role.key) ? 'selected' : ''}>
                <input
                  type="checkbox"
                  checked={roleKeys.includes(role.key)}
                  onChange={(event) => setRoleKeys((current) => event.target.checked ? [...current, role.key] : current.filter((key) => key !== role.key))}
                />
                <span><strong>{role.name}</strong><small>{role.isSystem ? 'System role' : 'Custom role'}</small></span>
              </label>
            ))}
            {!(options.roles || []).length ? <p className="office-muted">No roles available. Ask an administrator to configure roles.</p> : null}
          </div>
        </fieldset>

        {error ? <p className="office-error" role="alert">{error}</p> : null}
        <footer className="office-modal-actions">
          <button className="office-button secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="office-button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : member ? 'Save changes' : 'Create account'}</button>
        </footer>
      </form>
    </Modal>
  );
}

function StaffDetail({ detail, slackInviteUrl, canManage, busy, onInvite, onClose }) {
  const member = detail.user || detail.member;
  return (
    <Modal title={member.name} eyebrow={member.employeeId ? 'EMPLOYEE · ' + member.employeeId : 'STAFF RECORD'} description={member.jobTitle || 'Staff member'} onClose={onClose} wide>
      {detail.loading ? <p className="office-muted">Loading staff activity…</p> : (
        <>
          <div className="office-profile-grid">
            <div className="office-profile-card">
              <Avatar src={member.photoUrl} name={member.name} size={64} />
              <div>
                <strong>{member.name}</strong>
                <span>{member.email}</span>
                <span>{member.phone || 'No phone recorded'}</span>
                <StatusBadge value={member.status} label={member.status === 'ACTIVE' ? 'Active' : 'Deactivated'} />
                {canManage ? (
                  <div className="office-profile-actions">
                    <button
                      type="button"
                      className="office-button secondary"
                      onClick={() => onInvite(member)}
                      disabled={busy || member.status !== 'ACTIVE'}
                    >
                      <Icon name="mail" size={15} /> {busy ? 'Sending…' : 'Send Slack invite'}
                    </button>
                    {!slackInviteUrl ? <small>Set SLACK_INVITE_URL to enable Slack invitations.</small> : null}
                  </div>
                ) : null}
              </div>
            </div>
            <dl className="office-detail-list">
              <div><dt>Department</dt><dd>{member.department?.name || '—'}</dd></div>
              <div><dt>Manager</dt><dd>{member.manager?.name || '—'}</dd></div>
              <div><dt>Slack</dt><dd>{member.slackEmail || 'No Slack email recorded'}</dd></div>
              <div><dt>Office</dt><dd>{member.officeLocation || '—'}</dd></div>
              <div><dt>Employed</dt><dd>{formatDate(member.dateEmployed)}</dd></div>
              <div><dt>Emergency contact</dt><dd>{member.emergencyContactName ? member.emergencyContactName + (member.emergencyContactPhone ? ' · ' + member.emergencyContactPhone : '') : '—'}</dd></div>
              <div><dt>Last sign-in</dt><dd>{formatDateTime(member.lastLoginAt)}</dd></div>
            </dl>
          </div>

          <div className="office-role-chips">{member.roles.map((role) => <span key={role.key || role.id}>{role.name}</span>)}</div>

          <h3 className="office-subheading">Recent attendance</h3>
          <div className="office-table-wrap">
            <table className="office-table compact">
              <thead><tr><th>Date</th><th>Status</th><th>Check in</th><th>Check out</th><th>Note</th></tr></thead>
              <tbody>
                {(detail.attendance || []).map((record) => (
                  <tr key={record.id}>
                    <td>{formatDate(record.date)}</td>
                    <td><StatusBadge value={record.status} /></td>
                    <td>{formatDateTime(record.checkInAt)}</td>
                    <td>{formatDateTime(record.checkOutAt)}</td>
                    <td>{record.note || '—'}</td>
                  </tr>
                ))}
                {!(detail.attendance || []).length ? <tr><td colSpan={5} className="office-empty">No attendance records.</td></tr> : null}
              </tbody>
            </table>
          </div>

          <h3 className="office-subheading">Recent activity</h3>
          <ul className="office-activity-list">
            {(detail.activity || []).slice(0, 12).map((event) => (
              <li key={event.id}>
                <span className="office-activity-dot" />
                <div><strong>{event.action}</strong><small>{event.actor?.name || 'System'} · {event.entityType}{event.entityId ? ' · ' + event.entityId.slice(-8) : ''}</small></div>
                <time>{formatDateTime(event.createdAt)}</time>
              </li>
            ))}
            {!(detail.activity || []).length ? <li className="office-muted">No activity recorded.</li> : null}
          </ul>
        </>
      )}
    </Modal>
  );
}
