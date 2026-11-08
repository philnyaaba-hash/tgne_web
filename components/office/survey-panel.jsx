'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  api, Empty, Field, formatDate, Icon, jsonBody, Modal, PageHeading, Panel,
  readFileBase64, REPORT_STATUS_LABELS, Stat, StatusBadge, TASK_STATUS_LABELS
} from './ui';

const TABS = [
  { key: 'projects', label: 'Projects' },
  { key: 'parcels', label: 'Parcels' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'reports', label: 'Field reports' }
];

export default function SurveyPanel({ user, notify, fail }) {
  const [data, setData] = useState({ projects: [], parcels: [], tasks: [], reports: [], members: [], stats: {}, canReview: false });
  const [tab, setTab] = useState('projects');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(null);
  const [reportForm, setReportForm] = useState(undefined);
  const [detail, setDetail] = useState(null);

  const canManage = user.permissions.includes('field.manage');
  const canApprove = user.permissions.includes('field.approve');

  const load = useCallback(async () => {
    try {
      setData(await api('/api/office/survey'));
    } catch (reason) {
      fail(reason.message);
    } finally {
      setLoading(false);
    }
  }, [fail]);

  useEffect(() => { load(); }, [load]);

  async function save(entity, payload, method = 'POST', id) {
    setBusy(true);
    try {
      if (method === 'POST') {
        await api('/api/office/survey', { method: 'POST', ...jsonBody({ entity, ...payload }) });
        notify(entityLabel(entity) + ' created.');
      } else {
        await api('/api/office/survey/' + entity + '/' + encodeURIComponent(id), { method: 'PATCH', ...jsonBody(payload) });
        notify(entityLabel(entity) + ' updated.');
      }
      setForm(null);
      await load();
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  async function update(entity, id, payload, message) {
    setBusy(true);
    try {
      await api('/api/office/survey/' + entity + '/' + encodeURIComponent(id), { method: 'PATCH', ...jsonBody(payload) });
      notify(message);
      await load();
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveReport(payload, report) {
    setBusy(true);
    try {
      if (report) {
        await api('/api/office/survey/report/' + encodeURIComponent(report.id), { method: 'PATCH', ...jsonBody(payload) });
        notify(payload.status === 'SUBMITTED' ? 'Field report submitted for review.' : 'Field report saved.');
      } else {
        await api('/api/office/survey', { method: 'POST', ...jsonBody({ entity: 'report', ...payload }) });
        notify(payload.status === 'SUBMITTED' ? 'Field report submitted for review.' : 'Field report saved as draft.');
      }
      setReportForm(undefined);
      await load();
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  const stats = data.stats || {};
  const projects = data.projects || [];
  const parcels = data.parcels || [];
  const tasks = data.tasks || [];
  const reports = data.reports || [];
  const availableTasks = useMemo(() => canApprove ? tasks : tasks.filter((task) => task.assignedTo?.id === user.id), [tasks, canApprove, user.id]);

  return (
    <>
      <PageHeading
        eyebrow="LAND & FIELD OPERATIONS"
        title="Surveying workspace"
        description="Projects, land parcels, field tasks, survey reports, and approval workflow."
        actions={canApprove ? <div className="office-heading-actions">
          <button className="office-button secondary" type="button" onClick={() => setForm({ type: 'project' })}><Icon name="plus" size={15} /> Project</button>
          <button className="office-button secondary" type="button" onClick={() => setForm({ type: 'parcel' })}><Icon name="plus" size={15} /> Parcel</button>
          <button className="office-button primary" type="button" onClick={() => setForm({ type: 'task' })}><Icon name="plus" size={15} /> Task</button>
        </div> : canManage ? <button className="office-button primary" type="button" onClick={() => setReportForm(null)} disabled={!availableTasks.length}><Icon name="plus" size={15} /> Field report</button> : null}
      />

      <div className="office-stat-grid">
        <Stat label="Projects" value={stats.projects || 0} hint={(stats.activeProjects || 0) + ' active'} icon="map" />
        <Stat label="Parcels" value={stats.parcels || 0} hint="Registered land parcels" icon="grid" />
        <Stat label="Open tasks" value={stats.openTasks || 0} hint="To do, in progress, submitted" icon="clock" tone={stats.openTasks ? 'warn' : ''} />
        <Stat label="Reports" value={(stats.approvedReports || 0) + (stats.submittedReports || 0)} hint={(stats.submittedReports || 0) + ' awaiting review'} icon="report" />
      </div>

      <div className="office-tabbar">
        {TABS.map((item) => <button key={item.key} type="button" className={tab === item.key ? 'active' : ''} onClick={() => setTab(item.key)}>{item.label}<span>{data[item.key]?.length || 0}</span></button>)}
      </div>

      {tab === 'projects' ? (
        <Panel title="Projects" subtitle="Field programmes and their land coverage.">
          <div className="office-table-wrap">
            <table className="office-table">
              <thead><tr><th>Project</th><th>Manager</th><th>Dates</th><th>Records</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td><strong>{project.name}</strong><small>{project.code}{project.location ? ' · ' + project.location : ''}</small></td>
                    <td>{project.manager?.name || '—'}</td>
                    <td><strong>{formatDate(project.startDate)}</strong><small>to {formatDate(project.endDate)}</small></td>
                    <td>{project.parcels} parcels · {project.tasks} tasks · {project.reports} reports</td>
                    <td><StatusBadge value={project.status} /></td>
                    <td><div className="office-row-actions">
                      {canApprove && project.status !== 'COMPLETED' ? <button type="button" onClick={() => update('project', project.id, { status: 'COMPLETED' }, 'Project completed.')}>Complete</button> : null}
                      {canApprove && project.status === 'PLANNED' ? <button type="button" onClick={() => update('project', project.id, { status: 'ACTIVE' }, 'Project activated.')}>Activate</button> : null}
                      {canApprove && project.status === 'ACTIVE' ? <button type="button" onClick={() => update('project', project.id, { status: 'ON_HOLD' }, 'Project placed on hold.')}>Hold</button> : null}
                    </div></td>
                  </tr>
                ))}
                {!projects.length ? <Empty colSpan={6}>{loading ? 'Loading projects…' : 'No field projects are visible to your role.'}</Empty> : null}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      {tab === 'parcels' ? (
        <Panel title="Land parcels" subtitle="Parcels assigned to field teams.">
          <div className="office-table-wrap">
            <table className="office-table">
              <thead><tr><th>Parcel</th><th>Project</th><th>Size</th><th>Location</th><th>Assignee</th><th>Tasks / reports</th><th>Status</th></tr></thead>
              <tbody>
                {parcels.map((parcel) => (
                  <tr key={parcel.id}>
                    <td><strong>{parcel.parcelCode}</strong><small>{parcel.notes || 'No notes'}</small></td>
                    <td>{parcel.project?.name}<small>{parcel.project?.code}</small></td>
                    <td>{parcel.size == null ? '—' : parcel.size + ' ' + parcel.unit}</td>
                    <td>{parcel.location || '—'}{parcel.latitude != null ? <small>{Number(parcel.latitude).toFixed(4)}, {Number(parcel.longitude).toFixed(4)}</small> : null}</td>
                    <td>{parcel.assignedTo?.name || 'Unassigned'}</td>
                    <td>{parcel.tasks} / {parcel.reports}</td>
                    <td><StatusBadge value={parcel.status} /></td>
                  </tr>
                ))}
                {!parcels.length ? <Empty colSpan={7}>{loading ? 'Loading parcels…' : 'No parcels recorded for your role.'}</Empty> : null}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      {tab === 'tasks' ? (
        <Panel title="Survey tasks" subtitle="Assigned fieldwork with due dates and review status." action={canApprove ? <button className="office-button secondary" type="button" onClick={() => setForm({ type: 'task' })}><Icon name="plus" size={15} /> Task</button> : null}>
          <div className="office-table-wrap">
            <table className="office-table">
              <thead><tr><th>Task</th><th>Project / parcel</th><th>Assignee</th><th>Due</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td><strong>{task.title}</strong><small>{task.description || 'No description'}{task.reportCount ? ' · ' + task.reportCount + ' report(s)' : ''}</small></td>
                    <td>{task.project?.name}<small>{task.parcel?.parcelCode || 'No parcel'}</small></td>
                    <td>{task.assignedTo?.name || 'Unassigned'}</td>
                    <td>{formatDate(task.dueDate)}</td>
                    <td><span className={'office-priority ' + String(task.priority).toLowerCase()}>{task.priority}</span></td>
                    <td><StatusBadge value={task.status} label={TASK_STATUS_LABELS[task.status]} /></td>
                    <td><div className="office-row-actions">
                      {canManage && ['TODO', 'IN_PROGRESS'].includes(task.status) && (canApprove || task.assignedTo?.id === user.id) ? <button type="button" onClick={() => update('task', task.id, { status: task.status === 'TODO' ? 'IN_PROGRESS' : 'TODO' }, task.status === 'TODO' ? 'Task started.' : 'Task paused.')}>{task.status === 'TODO' ? 'Start' : 'Pause'}</button> : null}
                      {canManage && (canApprove || task.assignedTo?.id === user.id) && task.status !== 'APPROVED' ? <button type="button" onClick={() => { setTab('reports'); setReportForm({ taskId: task.id }); }}>Report</button> : null}
                      {canApprove && task.status === 'SUBMITTED' ? <><button type="button" onClick={() => update('task', task.id, { status: 'APPROVED' }, 'Task approved.')}>Approve</button><button type="button" className="text-danger" onClick={() => update('task', task.id, { status: 'REJECTED' }, 'Task returned.')}>Return</button></> : null}
                    </div></td>
                  </tr>
                ))}
                {!tasks.length ? <Empty colSpan={7}>{loading ? 'Loading tasks…' : 'No survey tasks assigned yet.'}</Empty> : null}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      {tab === 'reports' ? (
        <Panel
          title="Field reports"
          subtitle="Survey findings, measurements, and approval decisions."
          action={canManage ? <button className="office-button secondary" type="button" onClick={() => setReportForm(null)} disabled={!availableTasks.length}><Icon name="plus" size={15} /> New report</button> : null}
        >
          <div className="office-table-wrap">
            <table className="office-table">
              <thead><tr><th>Report</th><th>Task / project</th><th>Author</th><th>Submitted</th><th>Files</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td><strong>{report.summary}</strong><small>{report.coordinates || 'No coordinates'}</small></td>
                    <td>{report.task?.title}<small>{report.project?.name}{report.parcel ? ' · ' + report.parcel.parcelCode : ''}</small></td>
                    <td>{report.author?.name || '—'}</td>
                    <td>{formatDate(report.submittedAt)}</td>
                    <td>{report.attachments || 0}</td>
                    <td><StatusBadge value={report.status} label={REPORT_STATUS_LABELS[report.status]} /></td>
                    <td><div className="office-row-actions">
                      <button type="button" onClick={() => setDetail(report)}>View</button>
                      {report.author?.id === user.id && ['DRAFT', 'REJECTED'].includes(report.status) ? <button type="button" onClick={() => setReportForm(report)}>Edit</button> : null}
                      {report.author?.id === user.id && report.status === 'DRAFT' ? <button type="button" onClick={() => update('report', report.id, { status: 'SUBMITTED' }, 'Field report submitted for review.')}>Submit</button> : null}
                      {canApprove && report.author?.id !== user.id && report.status === 'SUBMITTED' ? <><button type="button" onClick={() => update('report', report.id, { status: 'APPROVED' }, 'Field report approved.')}>Approve</button><button type="button" className="text-danger" onClick={() => update('report', report.id, { status: 'REJECTED' }, 'Field report returned.')}>Return</button></> : null}
                    </div></td>
                  </tr>
                ))}
                {!reports.length ? <Empty colSpan={7}>{loading ? 'Loading reports…' : 'No field reports recorded yet.'}</Empty> : null}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      {form ? (
        <SurveyForm
          type={form.type}
          projects={projects}
          parcels={parcels}
          members={data.members || []}
          busy={busy}
          onClose={() => setForm(null)}
          onSave={(payload) => save(form.type, payload)}
        />
      ) : null}

      {reportForm !== undefined ? (
        <ReportForm
          report={reportForm}
          tasks={availableTasks}
          busy={busy}
          onClose={() => setReportForm(undefined)}
          onSave={(payload) => saveReport(payload, reportForm?.id ? reportForm : null)}
        />
      ) : null}

      {detail ? (
        <ReportDetail
          report={detail}
          user={user}
          canApprove={canApprove}
          canManage={canManage}
          notify={notify}
          fail={fail}
          onClose={() => setDetail(null)}
          onChanged={load}
        />
      ) : null}
    </>
  );
}

function entityLabel(entity) {
  return entity === 'project' ? 'Project' : entity === 'parcel' ? 'Parcel' : entity === 'task' ? 'Task' : 'Field report';
}

function SurveyForm({ type, projects, parcels, members, busy, onClose, onSave }) {
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const filteredParcels = parcels.filter((parcel) => parcel.projectId === projectId);

  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (type === 'project') {
      onSave({
        code: form.get('code'), name: form.get('name'), description: form.get('description'),
        location: form.get('location'), status: form.get('status'), managerId: form.get('managerId'),
        startDate: form.get('startDate') || null, endDate: form.get('endDate') || null
      });
    } else if (type === 'parcel') {
      onSave({
        projectId: form.get('projectId'), parcelCode: form.get('parcelCode'), size: form.get('size'),
        unit: form.get('unit'), location: form.get('location'), latitude: form.get('latitude'),
        longitude: form.get('longitude'), assignedToId: form.get('assignedToId'), notes: form.get('notes')
      });
    } else {
      onSave({
        projectId: form.get('projectId'), parcelId: form.get('parcelId'), title: form.get('title'),
        description: form.get('description'), priority: form.get('priority'),
        assignedToId: form.get('assignedToId'), dueDate: form.get('dueDate') || null
      });
    }
  }

  return (
    <Modal title={'New ' + entityLabel(type).toLowerCase()} eyebrow="FIELD OPERATIONS" onClose={onClose} wide={type === 'project'}>
      <form onSubmit={submit}>
        <div className="office-form-grid">
          {type === 'project' ? <>
            <Field label="Project code"><input name="code" required pattern="[A-Za-z0-9-]{2,40}" placeholder="PRJ-2026-01" /></Field>
            <Field label="Project name"><input name="name" required maxLength={150} /></Field>
            <Field label="Location"><input name="location" maxLength={200} /></Field>
            <Field label="Status"><select name="status" defaultValue="PLANNED"><option>PLANNED</option><option>ACTIVE</option><option>ON_HOLD</option></select></Field>
            <Field label="Start date"><input name="startDate" type="date" /></Field>
            <Field label="End date"><input name="endDate" type="date" /></Field>
            <Field label="Project manager"><select name="managerId"><option value="">Not assigned</option>{members.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></Field>
            <Field label="Description" full><textarea name="description" rows={3} maxLength={500} /></Field>
          </> : null}

          {type === 'parcel' ? <>
            <Field label="Project">
              <select name="projectId" required value={projectId} onChange={(event) => setProjectId(event.target.value)}>
                <option value="" disabled>Select a project</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name} · {project.code}</option>)}
              </select>
            </Field>
            <Field label="Parcel code"><input name="parcelCode" required maxLength={50} placeholder="PC-001" /></Field>
            <Field label="Size"><input name="size" type="number" min="0" step="0.01" /></Field>
            <Field label="Unit"><select name="unit" defaultValue="acres"><option>acres</option><option>hectares</option><option>sqm</option></select></Field>
            <Field label="Location"><input name="location" maxLength={200} /></Field>
            <Field label="Assigned surveyor"><select name="assignedToId"><option value="">Unassigned</option>{members.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></Field>
            <Field label="Latitude"><input name="latitude" type="number" step="0.000001" /></Field>
            <Field label="Longitude"><input name="longitude" type="number" step="0.000001" /></Field>
            <Field label="Notes" full><textarea name="notes" rows={2} maxLength={500} /></Field>
          </> : null}

          {type === 'task' ? <>
            <Field label="Project">
              <select name="projectId" required value={projectId} onChange={(event) => setProjectId(event.target.value)}>
                <option value="" disabled>Select a project</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name} · {project.code}</option>)}
              </select>
            </Field>
            <Field label="Parcel">
              <select name="parcelId"><option value="">No parcel</option>{filteredParcels.map((parcel) => <option key={parcel.id} value={parcel.id}>{parcel.parcelCode}</option>)}</select>
            </Field>
            <Field label="Task title" full><input name="title" required maxLength={160} /></Field>
            <Field label="Assigned surveyor"><select name="assignedToId"><option value="">Unassigned</option>{members.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></Field>
            <Field label="Priority"><select name="priority" defaultValue="NORMAL"><option>LOW</option><option>NORMAL</option><option>HIGH</option><option>URGENT</option></select></Field>
            <Field label="Due date"><input name="dueDate" type="date" /></Field>
            <Field label="Description" full><textarea name="description" rows={3} maxLength={1000} /></Field>
          </> : null}
        </div>
        <footer className="office-modal-actions">
          <button className="office-button secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="office-button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Create ' + entityLabel(type).toLowerCase()}</button>
        </footer>
      </form>
    </Modal>
  );
}

function ReportForm({ report, tasks, busy, onClose, onSave }) {
  const editing = Boolean(report?.id);
  const [taskId, setTaskId] = useState(report?.taskId || tasks[0]?.id || '');

  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const submitForReview = event.nativeEvent.submitter?.value === 'submit';
    const payload = {
      taskId,
      summary: form.get('summary'),
      findings: form.get('findings'),
      coordinates: form.get('coordinates'),
      measurements: form.get('measurements'),
      status: submitForReview ? 'SUBMITTED' : 'DRAFT'
    };
    onSave(payload);
  }

  return (
    <Modal title={editing ? 'Edit field report' : 'New field report'} eyebrow="SURVEY REPORT" description="Record findings, coordinates, and measurements for the selected task." onClose={onClose} wide>
      <form onSubmit={submit}>
        <div className="office-form-grid">
          <Field label="Survey task" full>
            <select name="taskId" value={taskId} onChange={(event) => setTaskId(event.target.value)} disabled={editing}>
              {tasks.map((task) => <option key={task.id} value={task.id}>{task.title} · {task.project?.name || ''}{task.parcel ? ' · ' + task.parcel.parcelCode : ''}</option>)}
              {!tasks.length ? <option value="">No accessible tasks</option> : null}
            </select>
          </Field>
          <Field label="Summary" full><textarea name="summary" defaultValue={editing ? report.summary : ''} required maxLength={1000} rows={3} placeholder="What was surveyed and the headline result" /></Field>
          <Field label="Findings" full><textarea name="findings" defaultValue={editing ? report.findings || '' : ''} maxLength={3000} rows={4} /></Field>
          <Field label="Coordinates"><input name="coordinates" defaultValue={editing ? report.coordinates || '' : ''} maxLength={500} placeholder="6.6885, -1.6244" /></Field>
          <Field label="Measurements"><input name="measurements" defaultValue={editing ? report.measurements || '' : ''} maxLength={1000} placeholder="Boundary lengths, area, bearings" /></Field>
        </div>
        <footer className="office-modal-actions">
          <button className="office-button secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="office-button secondary" type="submit" value="draft" disabled={busy}>{busy ? 'Saving…' : 'Save draft'}</button>
          <button className="office-button primary" type="submit" value="submit" disabled={busy || !tasks.length}>Submit for review</button>
        </footer>
      </form>
    </Modal>
  );
}

function ReportDetail({ report, user, canApprove, canManage, notify, fail, onClose, onChanged }) {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadAttachments = useCallback(async () => {
    try {
      const result = await api('/api/office/attachments?entityType=FIELD_REPORT&entityId=' + encodeURIComponent(report.id));
      setAttachments(result.attachments);
    } catch (reason) {
      fail(reason.message);
    } finally {
      setLoading(false);
    }
  }, [report.id, fail]);

  useEffect(() => { loadAttachments(); }, [loadAttachments]);

  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const result = await readFileBase64(file);
      await api('/api/office/attachments', {
        method: 'POST',
        ...jsonBody({ entityType: 'FIELD_REPORT', entityId: report.id, fileName: result.fileName, mimeType: result.mimeType, data: result.data })
      });
      notify('Attachment uploaded.');
      await loadAttachments();
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  }

  async function remove(attachment) {
    if (!window.confirm('Remove ' + attachment.fileName + '?')) return;
    setBusy(true);
    try {
      await api('/api/office/attachments/' + encodeURIComponent(attachment.id), { method: 'DELETE' });
      notify('Attachment removed.');
      await loadAttachments();
      onChanged();
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  async function decide(status) {
    setBusy(true);
    try {
      await api('/api/office/survey/report/' + encodeURIComponent(report.id), { method: 'PATCH', ...jsonBody({ status }) });
      notify('Field report ' + status.toLowerCase() + '.');
      onChanged();
      onClose();
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  const canDecide = canApprove && report.author?.id !== user.id && report.status === 'SUBMITTED';

  return (
    <Modal title="Field report" eyebrow={report.project?.name || 'SURVEY REPORT'} description={report.task?.title} onClose={onClose} wide>
      <div className="office-report-head">
        <StatusBadge value={report.status} label={REPORT_STATUS_LABELS[report.status]} />
        <span>{report.author?.name}</span>
        <span>Submitted {formatDate(report.submittedAt)}</span>
      </div>
      <dl className="office-detail-list">
        <div className="full"><dt>Summary</dt><dd>{report.summary}</dd></div>
        <div className="full"><dt>Findings</dt><dd>{report.findings || '—'}</dd></div>
        <div><dt>Coordinates</dt><dd>{report.coordinates || '—'}</dd></div>
        <div><dt>Measurements</dt><dd>{report.measurements || '—'}</dd></div>
        <div><dt>Parcel</dt><dd>{report.parcel?.parcelCode || '—'}</dd></div>
        <div><dt>Review note</dt><dd>{report.reviewNote || '—'}</dd></div>
      </dl>

      <h3 className="office-subheading">Attachments</h3>
      {canManage ? (
        <label className="office-button secondary file-button">
          <Icon name="upload" size={15} /> {busy ? 'Uploading…' : 'Upload PDF or image'}
          <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={upload} disabled={busy} hidden />
        </label>
      ) : null}
      <ul className="office-attachment-list">
        {attachments.map((attachment) => (
          <li key={attachment.id}>
            <span className="office-attachment-icon"><Icon name={attachment.mimeType === 'application/pdf' ? 'report' : 'camera'} size={15} /></span>
            <div>
              <a href={'/api/office/attachments/' + attachment.id} target="_blank" rel="noreferrer">{attachment.fileName}</a>
              <small>{Math.max(1, Math.round(attachment.size / 1024))} KB · {attachment.uploadedBy?.name || 'Unknown'} · {formatDate(attachment.createdAt)}</small>
            </div>
            {canManage ? <button type="button" className="office-link-button danger" onClick={() => remove(attachment)}>Remove</button> : null}
          </li>
        ))}
        {!attachments.length && !loading ? <li className="office-muted">No attachments yet.</li> : null}
      </ul>

      {canDecide ? (
        <footer className="office-modal-actions">
          <button className="office-button secondary" type="button" onClick={() => decide('REJECTED')} disabled={busy}>Return for changes</button>
          <button className="office-button primary" type="button" onClick={() => decide('APPROVED')} disabled={busy}>Approve report</button>
        </footer>
      ) : null}
    </Modal>
  );
}
