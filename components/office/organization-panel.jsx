'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, Empty, Field, Icon, jsonBody, Modal, PageHeading, Panel, Stat, StatusBadge } from './ui';

export default function OrganizationPanel({ user, notify, fail }) {
  const [departments, setDepartments] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [directory, setDirectory] = useState({ users: [] });
  const [editingDepartment, setEditingDepartment] = useState(undefined);
  const [editingRoom, setEditingRoom] = useState(undefined);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const canManageDepartments = user.permissions.includes('departments.manage');
  const canManageRooms = user.permissions.includes('rooms.manage');

  const load = useCallback(async () => {
    try {
      const [departmentData, roomData, directoryData] = await Promise.all([
        api('/api/office/departments'),
        api('/api/office/rooms'),
        api('/api/office/directory')
      ]);
      setDepartments(departmentData.departments);
      setRooms(roomData.rooms);
      setDirectory(directoryData);
    } catch (reason) {
      fail(reason.message);
    } finally {
      setLoading(false);
    }
  }, [fail]);

  useEffect(() => { load(); }, [load]);

  async function saveDepartment(payload, department) {
    setBusy(true);
    try {
      if (department) {
        await api('/api/office/departments/' + encodeURIComponent(department.id), { method: 'PATCH', ...jsonBody(payload) });
        notify('Department ' + payload.name + ' updated.');
      } else {
        await api('/api/office/departments', { method: 'POST', ...jsonBody(payload) });
        notify('Department ' + payload.name + ' created.');
      }
      setEditingDepartment(undefined);
      await load();
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveRoom(payload, room) {
    setBusy(true);
    try {
      if (room) {
        await api('/api/office/rooms/' + encodeURIComponent(room.id), { method: 'PATCH', ...jsonBody(payload) });
        notify('Meeting room ' + payload.name + ' updated.');
      } else {
        await api('/api/office/rooms', { method: 'POST', ...jsonBody(payload) });
        notify('Meeting room ' + payload.name + ' created.');
      }
      setEditingRoom(undefined);
      await load();
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  const capacity = rooms.reduce((sum, room) => sum + (room.capacity || 0), 0);
  const activeDepartments = departments.filter((department) => department.active).length;

  return (
    <>
      <PageHeading
        eyebrow="ORGANIZATION"
        title="Departments & rooms"
        description="Structure the office for visitor hosting, approvals, and meeting room assignment."
        actions={<>
          {canManageDepartments ? <button className="office-button secondary" type="button" onClick={() => setEditingDepartment(null)}><Icon name="plus" size={15} /> Department</button> : null}
          {canManageRooms ? <button className="office-button primary" type="button" onClick={() => setEditingRoom(null)}><Icon name="plus" size={15} /> Meeting room</button> : null}
        </>}
      />

      <div className="office-stat-grid">
        <Stat label="Departments" value={departments.length} hint={activeDepartments + ' active'} icon="building" />
        <Stat label="Staff assigned" value={departments.reduce((sum, department) => sum + (department._count?.users || 0), 0)} hint="Across departments" icon="users" />
        <Stat label="Meeting rooms" value={rooms.length} hint={rooms.filter((room) => room.active).length + ' available'} icon="grid" />
        <Stat label="Seats" value={capacity || '—'} hint="Combined room capacity" icon="badge" />
      </div>

      <div className="office-org-grid">
        <Panel title="Departments" subtitle={departments.length + ' organizational units'}>
          <div className="office-table-wrap">
            <table className="office-table">
              <thead><tr><th>Department</th><th>Head</th><th>Location</th><th>Staff</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {departments.map((department) => (
                  <tr key={department.id}>
                    <td><strong>{department.name}</strong><small>{department.description || 'No description'}</small></td>
                    <td>{department.head?.name || '—'}</td>
                    <td>{department.location || '—'}</td>
                    <td>{department._count?.users ?? 0}</td>
                    <td><StatusBadge value={department.active ? 'ACTIVE' : 'DEACTIVATED'} label={department.active ? 'Active' : 'Inactive'} /></td>
                    <td>{canManageDepartments ? <button className="office-link-button" type="button" onClick={() => setEditingDepartment(department)}>Edit</button> : '—'}</td>
                  </tr>
                ))}
                {!departments.length ? <Empty colSpan={6}>{loading ? 'Loading departments…' : 'No departments configured.'}</Empty> : null}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Meeting rooms" subtitle="Rooms available for visit assignment.">
          <div className="office-room-grid">
            {rooms.map((room) => (
              <article className={'office-room-card' + (room.active ? '' : ' inactive')} key={room.id}>
                <header>
                  <span className="office-room-icon"><Icon name="building" size={16} /></span>
                  <div><strong>{room.name}</strong><small>{room.location || 'No location'}</small></div>
                  {canManageRooms ? <button className="office-link-button" type="button" onClick={() => setEditingRoom(room)}>Edit</button> : null}
                </header>
                <div className="office-room-meta">
                  <span>{room.capacity ? room.capacity + ' seats' : 'Capacity not set'}</span>
                  <span>{room.department?.name || 'Shared'}</span>
                  <span className={room.active ? 'active' : 'inactive'}>{room.active ? 'Available' : 'Out of service'}</span>
                </div>
              </article>
            ))}
            {!rooms.length ? <p className="office-muted">{loading ? 'Loading meeting rooms…' : 'No meeting rooms configured.'}</p> : null}
          </div>
        </Panel>
      </div>

      {editingDepartment !== undefined ? (
        <DepartmentForm
          department={editingDepartment}
          managers={directory.users || []}
          busy={busy}
          onClose={() => setEditingDepartment(undefined)}
          onSave={(payload) => saveDepartment(payload, editingDepartment)}
        />
      ) : null}

      {editingRoom !== undefined ? (
        <RoomForm
          room={editingRoom}
          departments={departments}
          busy={busy}
          onClose={() => setEditingRoom(undefined)}
          onSave={(payload) => saveRoom(payload, editingRoom)}
        />
      ) : null}
    </>
  );
}

function DepartmentForm({ department, managers, busy, onClose, onSave }) {
  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get('name'),
      description: form.get('description'),
      location: form.get('location'),
      headId: form.get('headId')
    };
    if (department) payload.active = form.get('active') === 'on';
    onSave(payload);
  }
  return (
    <Modal title={department ? 'Edit department' : 'New department'} eyebrow="ORGANIZATION" description="Departments group staff, approve visits, and own meeting rooms." onClose={onClose}>
      <form onSubmit={submit}>
        <div className="office-form-grid">
          <Field label="Department name" full><input name="name" defaultValue={department?.name || ''} required maxLength={100} autoFocus /></Field>
          <Field label="Description" full><input name="description" defaultValue={department?.description || ''} maxLength={300} /></Field>
          <Field label="Location"><input name="location" defaultValue={department?.location || ''} maxLength={150} /></Field>
          <Field label="Department head">
            <select name="headId" defaultValue={department?.head?.id || ''}>
              <option value="">Not assigned</option>
              {managers.map((person) => <option key={person.id} value={person.id}>{person.name}{person.jobTitle ? ' · ' + person.jobTitle : ''}</option>)}
            </select>
          </Field>
          {department ? <Field label="Availability"><label className="office-check-option"><input name="active" type="checkbox" defaultChecked={department.active} /> Department is active</label></Field> : null}
        </div>
        <footer className="office-modal-actions">
          <button className="office-button secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="office-button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save department'}</button>
        </footer>
      </form>
    </Modal>
  );
}

function RoomForm({ room, departments, busy, onClose, onSave }) {
  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get('name'),
      location: form.get('location'),
      capacity: form.get('capacity') || null,
      departmentId: form.get('departmentId')
    };
    if (room) payload.active = form.get('active') === 'on';
    onSave(payload);
  }
  return (
    <Modal title={room ? 'Edit meeting room' : 'New meeting room'} eyebrow="ORGANIZATION" description="Rooms can be assigned to a department or shared across the office." onClose={onClose}>
      <form onSubmit={submit}>
        <div className="office-form-grid">
          <Field label="Room name" full><input name="name" defaultValue={room?.name || ''} required maxLength={100} autoFocus /></Field>
          <Field label="Location"><input name="location" defaultValue={room?.location || ''} maxLength={150} placeholder="Floor, wing, building" /></Field>
          <Field label="Capacity"><input name="capacity" type="number" min="1" max="500" defaultValue={room?.capacity || ''} /></Field>
          <Field label="Department" full>
            <select name="departmentId" defaultValue={room?.department?.id || ''}>
              <option value="">Shared room</option>
              {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
          </Field>
          {room ? <Field label="Availability" full><label className="office-check-option"><input name="active" type="checkbox" defaultChecked={room.active} /> Room is available for visits</label></Field> : null}
        </div>
        <footer className="office-modal-actions">
          <button className="office-button secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="office-button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save room'}</button>
        </footer>
      </form>
    </Modal>
  );
}
