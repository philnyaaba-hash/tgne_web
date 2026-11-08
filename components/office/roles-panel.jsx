'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, Field, formatDateTime, Icon, jsonBody, Modal, PageHeading, Panel, Stat } from './ui';

export default function RolesPanel({ user, notify, fail }) {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [changes, setChanges] = useState([]);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api('/api/office/roles');
      setRoles(data.roles);
      setPermissions(data.permissions);
      setChanges(data.changes);
    } catch (reason) {
      fail(reason.message);
    } finally {
      setLoading(false);
    }
  }, [fail]);

  useEffect(() => { load(); }, [load]);

  const modules = useMemo(() => {
    const grouped = {};
    for (const permission of permissions) {
      grouped[permission.module] = grouped[permission.module] || [];
      grouped[permission.module].push(permission);
    }
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [permissions]);

  const assigned = roles.reduce((sum, role) => sum + (role._count?.users || 0), 0);
  const custom = roles.filter((role) => !role.isSystem).length;

  async function save(payload, role) {
    setBusy(true);
    try {
      if (role) {
        await api('/api/office/roles/' + encodeURIComponent(role.id), { method: 'PATCH', ...jsonBody(payload) });
        notify('Role ' + payload.name + ' updated.');
      } else {
        await api('/api/office/roles', { method: 'POST', ...jsonBody(payload) });
        notify('Custom role ' + payload.name + ' created.');
      }
      setEditing(null);
      await load();
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(role) {
    if (!window.confirm('Delete the custom role "' + role.name + '"? This cannot be undone.')) return;
    setBusy(true);
    try {
      await api('/api/office/roles/' + encodeURIComponent(role.id), { method: 'DELETE' });
      notify('Role ' + role.name + ' deleted.');
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
        eyebrow="SECURITY & ACCESS"
        title="Roles & security"
        description="Define who can see and change what. Permissions are checked on every protected API request, not only in the interface."
        actions={<button className="office-button primary" type="button" onClick={() => setEditing({ role: null })}><Icon name="plus" size={15} /> New custom role</button>}
      />

      <div className="office-stat-grid">
        <Stat label="Roles" value={roles.length} hint={custom + ' custom · ' + (roles.length - custom) + ' system'} icon="shield" />
        <Stat label="Permission catalogue" value={permissions.length} hint={modules.length + ' modules'} icon="lock" />
        <Stat label="Assigned seats" value={assigned} hint="Role assignments across staff" icon="users" />
        <Stat label="Role changes" value={changes.length} hint="Most recent history entries" icon="audit" />
      </div>

      <Panel title="Role catalogue" subtitle="System roles have fixed permissions. Create a custom role when a team needs different access.">
        <div className="office-role-cards">
          {roles.map((role) => (
            <article className="office-role-card" key={role.id}>
              <header>
                <div>
                  <span className={'office-role-kind' + (role.isSystem ? ' system' : '')}>{role.isSystem ? 'System role' : 'Custom role'}</span>
                  <h3>{role.name}</h3>
                  <code>{role.key}</code>
                </div>
                <span className="office-role-count">{role._count?.users || 0} user{(role._count?.users || 0) === 1 ? '' : 's'}</span>
              </header>
              <p>{role.description}</p>
              <div className="office-role-chips">
                {role.permissions.map((permission) => <span key={permission.key}>{permission.key}</span>)}
                {!role.permissions.length ? <span>No permissions</span> : null}
              </div>
              <footer>
                {!role.isSystem || role.key !== 'SUPER_ADMIN' ? (
                  <button className="office-button ghost" type="button" onClick={() => setEditing({ role })}><Icon name="edit" size={14} /> {role.isSystem ? 'Edit details' : 'Edit role'}</button>
                ) : <span className="office-muted">Protected administrator role</span>}
                {!role.isSystem ? <button className="office-link-button danger" type="button" onClick={() => remove(role)}>Delete</button> : null}
              </footer>
            </article>
          ))}
          {!roles.length && !loading ? <p className="office-muted">No roles configured. Run the bootstrap script to seed system roles.</p> : null}
        </div>
      </Panel>

      <div className="office-overview-grid">
        <Panel title="Permission catalogue" subtitle="Every module and action enforced by the backend.">
          <div className="office-permission-matrix">
            {modules.map(([module, items]) => (
              <div key={module}>
                <strong>{module}</strong>
                <div className="office-role-chips">{items.map((permission) => <span key={permission.key} title={permission.description}>{permission.key}</span>)}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Role change history" subtitle="Assignments and revocations across staff accounts.">
          <ul className="office-activity-list">
            {changes.map((change) => (
              <li key={change.id}>
                <span className={'office-activity-dot ' + change.action.toLowerCase()} />
                <div>
                  <strong>{change.user?.name || 'Unknown user'} · {change.roleKey}</strong>
                  <small>{change.action === 'ASSIGNED' ? 'Assigned' : 'Revoked'} by {change.actor?.name || 'system'}{change.note ? ' · ' + change.note : ''}</small>
                </div>
                <time>{formatDateTime(change.createdAt)}</time>
              </li>
            ))}
            {!changes.length ? <li className="office-muted">No role changes recorded yet.</li> : null}
          </ul>
        </Panel>
      </div>

      {editing ? (
        <RoleForm
          role={editing.role}
          modules={modules}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={(payload) => save(payload, editing.role)}
        />
      ) : null}
    </>
  );
}

function RoleForm({ role, modules, busy, onClose, onSave }) {
  const [selected, setSelected] = useState(role?.permissions?.map((permission) => permission.key) || []);
  const [error, setError] = useState('');
  const locked = Boolean(role?.isSystem);

  function toggle(key) {
    setSelected((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  function toggleModule(items, checked) {
    const keys = items.map((item) => item.key);
    setSelected((current) => checked ? [...new Set([...current, ...keys])] : current.filter((key) => !keys.includes(key)));
  }

  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!locked && !selected.length) {
      setError('Select at least one permission.');
      return;
    }
    const payload = {
      name: form.get('name'),
      description: form.get('description')
    };
    if (!role) payload.key = form.get('key');
    if (!locked) payload.permissions = selected;
    onSave(payload);
  }

  return (
    <Modal
      title={role ? 'Edit ' + role.name : 'Create custom role'}
      eyebrow={role ? 'ROLE DETAILS' : 'NEW ROLE'}
      description={locked ? 'System role names and descriptions can be adjusted. Permissions are fixed.' : 'Grant only what the team needs. Permissions combine across multiple assigned roles.'}
      onClose={onClose}
      wide
    >
      <form onSubmit={submit}>
        <div className="office-form-grid">
          {!role ? <Field label="Role key" hint="Lowercase letters, numbers, and dashes. Used by the API."><input name="key" required pattern="[a-z][a-z0-9-]{1,39}" placeholder="front-desk-lead" /></Field> : null}
          <Field label="Role name"><input name="name" defaultValue={role?.name || ''} required maxLength={100} /></Field>
          <Field label="Description" full><input name="description" defaultValue={role?.description || ''} required maxLength={300} /></Field>
        </div>

        {!locked ? (
          <div className="office-permission-matrix selectable">
            {modules.map(([module, items]) => {
              const allChecked = items.every((item) => selected.includes(item.key));
              return (
                <div key={module}>
                  <label className="office-module-head">
                    <input type="checkbox" checked={allChecked} onChange={(event) => toggleModule(items, event.target.checked)} />
                    <strong>{module}</strong>
                    <small>{items.filter((item) => selected.includes(item.key)).length}/{items.length}</small>
                  </label>
                  <div className="office-permission-options">
                    {items.map((permission) => (
                      <label key={permission.key} className={selected.includes(permission.key) ? 'selected' : ''}>
                        <input type="checkbox" checked={selected.includes(permission.key)} onChange={() => toggle(permission.key)} />
                        <span><strong>{permission.action}</strong><small>{permission.description}</small></span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {error ? <p className="office-error" role="alert">{error}</p> : null}
        <footer className="office-modal-actions">
          <button className="office-button secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="office-button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : role ? 'Save role' : 'Create role'}</button>
        </footer>
      </form>
    </Modal>
  );
}
