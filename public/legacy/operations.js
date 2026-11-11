/* Leads, tasks, documents, maintenance and reporting */
'use strict';

const LEAD_STATUSES = ['New', 'Contacted', 'Qualified', 'Lost', 'Converted'];
const TASK_STATUSES = ['Open', 'In progress', 'Done'];
const PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'];
const MAINTENANCE_STATUSES = ['Open', 'In progress', 'Resolved'];
const DOCUMENT_CATEGORIES = ['Site plan', 'Survey', 'Permit', 'Contract', 'Policy', 'Other'];
const REPORT_TYPES = [
  ['overview', 'Overview'],
  ['sales', 'Sales'],
  ['payments', 'Payments received'],
  ['receivables', 'Receivables'],
  ['expenses', 'Expenses'],
  ['inventory', 'Plot inventory'],
  ['leads', 'Lead pipeline'],
  ['tasks', 'Tasks & reminders'],
  ['maintenance', 'Maintenance & site issues'],
  ['staff', 'Staff']
];

function operationStatusBadge(status) {
  const tone = /done|resolved|converted|qualified|active/i.test(status) ? 'paid'
    : /urgent|high|overdue|lost/i.test(status) ? 'overdue'
      : /progress|contacted/i.test(status) ? 'partial' : 'neutral';
  return '<span class="badge ' + tone + '">' + esc(status || 'Open') + '</span>';
}

function operationDate(value) {
  if (!value) return '—';
  return fmtDate(value);
}

function operationRowsEmpty(columns, title, detail) {
  return '<tr><td colspan="' + columns + '"><div class="staff-empty"><strong>' + esc(title) + '</strong><span>' + esc(detail) + '</span></div></td></tr>';
}

function operationTable(title, description, headers, rows, emptyTitle, emptyDetail) {
  const body = Array.isArray(rows)
    ? rows.length ? rows.join('') : operationRowsEmpty(headers.length, emptyTitle, emptyDetail)
    : typeof rows === 'string' && rows ? rows : operationRowsEmpty(headers.length, emptyTitle, emptyDetail);
  return '<div class="card operation-card"><div class="card-head"><div><h3>' + esc(title) + '</h3><p>' + esc(description) + '</p></div></div><div class="table-wrap"><table class="data operation-table"><thead><tr>' + headers.map((header) => '<th>' + esc(header) + '</th>').join('') + '</tr></thead><tbody>' + body + '</tbody></table></div></div>';
}

function leadRowsHTML(leads) {
  if (!leads.length) return [operationRowsEmpty(6, 'No leads found', 'Add an enquiry or change your filters.')];
  return leads.map((lead) =>
    '<tr><td><span class="cell-copy"><strong>' + esc(lead.name) + '</strong><small>' + esc(lead.email || lead.source || 'Enquiry') + '</small></span></td>' +
      '<td>' + esc(lead.phone || '—') + '</td><td>' + esc(lead.interest || '—') + '</td>' +
      '<td>' + operationStatusBadge(lead.status) + '</td>' +
      '<td>' + esc(operationDate(lead.followUpDate)) + '</td>' +
      '<td><div class="row-actions">' +
        (can('leads.manage') && lead.status !== 'Converted' && lead.status !== 'Lost' ? '<button class="mini-btn" type="button" data-action="convert-lead" data-lead-id="' + esc(lead.id) + '" aria-label="Convert ' + esc(lead.name) + ' to buyer" title="Convert to buyer">' + icon('buyers', 13) + '</button>' : '') +
        (can('leads.manage') ? '<button class="mini-btn" type="button" data-action="edit-lead" data-lead-id="' + esc(lead.id) + '" aria-label="Edit ' + esc(lead.name) + '" title="Edit lead">' + icon('edit', 13) + '</button><button class="mini-btn" type="button" data-action="delete-lead" data-lead-id="' + esc(lead.id) + '" aria-label="Delete ' + esc(lead.name) + '" title="Delete lead">' + icon('trash', 13) + '</button>' : '') +
      '</div></td></tr>'
  );
}

function viewLeads() {
  const leads = (data.leads || []).filter((lead) => {
    const matchesText = !state.leadQuery || [lead.name, lead.phone, lead.email, lead.interest, lead.source].join(' ').toLowerCase().includes(state.leadQuery.toLowerCase());
    return matchesText && (state.leadStatus === 'all' || lead.status === state.leadStatus);
  }).sort((a, b) => S.parseDate(a.followUpDate || a.createdAt) - S.parseDate(b.followUpDate || b.createdAt));
  const active = (data.leads || []).filter((lead) => !['Lost', 'Converted'].includes(lead.status)).length;
  const followUps = leads.filter((lead) => lead.followUpDate && lead.followUpDate <= todayValue() && !['Lost', 'Converted'].includes(lead.status)).length;
  return '<div class="page"><div class="page-head"><div><h2>Leads &amp; enquiries</h2><p>Capture prospects, plan follow-ups and convert qualified enquiries into buyer records.</p></div>' +
    (can('leads.manage') ? '<button class="btn btn-primary" type="button" data-action="add-lead">' + icon('plus', 15) + ' Add lead</button>' : '') + '</div>' +
    '<div class="accounting-kpis"><div class="accounting-kpi net-kpi"><span class="accounting-kpi-icon">' + icon('user', 15) + '</span><small>Active leads</small><strong>' + active + '</strong><span>Not yet closed or converted</span></div>' +
    '<div class="accounting-kpi receivable-kpi"><span class="accounting-kpi-icon">' + icon('calendar', 15) + '</span><small>Follow-ups due</small><strong>' + followUps + '</strong><span>Due today or earlier</span></div>' +
    '<div class="accounting-kpi income-kpi"><span class="accounting-kpi-icon">' + icon('checkCircle', 15) + '</span><small>Converted</small><strong>' + (data.leads || []).filter((lead) => lead.status === 'Converted').length + '</strong><span>Linked buyer records</span></div></div>' +
    '<div class="toolbar operation-toolbar"><label class="search-field"><span>' + icon('search', 14) + '</span><input id="leadSearch" type="search" value="' + esc(state.leadQuery) + '" placeholder="Search leads…" aria-label="Search leads"></label><select id="leadStatusFilter" aria-label="Filter leads by status"><option value="all">All statuses</option>' + LEAD_STATUSES.map((status) => '<option' + (state.leadStatus === status ? ' selected' : '') + '>' + esc(status) + '</option>').join('') + '</select></div>' +
    operationTable('Lead pipeline', 'Follow-up date is the next planned contact.', ['Prospect', 'Phone', 'Interest', 'Status', 'Follow-up', 'Actions'], leadRowsHTML(leads), 'No leads found', 'Add an enquiry or change your filters.') + '</div>';
}

function updateLeadsResults() {
  if (state.route !== 'leads') return;
  const rows = $('#view .operation-table tbody');
  if (!rows) return;
  const leads = (data.leads || []).filter((lead) => {
    const matchesText = !state.leadQuery || [lead.name, lead.phone, lead.email, lead.interest, lead.source].join(' ').toLowerCase().includes(state.leadQuery.toLowerCase());
    return matchesText && (state.leadStatus === 'all' || lead.status === state.leadStatus);
  }).sort((a, b) => S.parseDate(a.followUpDate || a.createdAt) - S.parseDate(b.followUpDate || b.createdAt));
  rows.innerHTML = leadRowsHTML(leads).join('');
}

function openLeadForm(leadId) {
  if (!requirePermission('leads.manage')) return;
  const lead = leadId ? data.leads.find((item) => item.id === leadId) : null;
  if (leadId && !lead) { toast('Lead not found.', 'error'); return; }
  const item = lead || { name: '', phone: '', email: '', source: '', interest: '', status: 'New', followUpDate: todayValue(), notes: '' };
  openModal({
    title: lead ? 'Edit lead' : 'Add lead',
    subtitle: 'Capture contact details and the next follow-up.',
    size: 'wide',
    body: '<form id="lead-form" novalidate><input type="hidden" name="leadId" value="' + esc(item.id || '') + '"><div class="form-grid">' +
      '<div class="field"><label for="leadName">Prospect name <span class="req">*</span></label><input id="leadName" name="name" value="' + esc(item.name) + '" autofocus><span class="error"></span></div>' +
      '<div class="field"><label for="leadPhone">Phone number</label><input id="leadPhone" name="phone" type="tel" value="' + esc(item.phone) + '"></div>' +
      '<div class="field"><label for="leadEmail">Email</label><input id="leadEmail" name="email" type="email" value="' + esc(item.email) + '"><span class="error"></span></div>' +
      '<div class="field"><label for="leadSource">Source</label><input id="leadSource" name="source" value="' + esc(item.source) + '" placeholder="Referral, website, walk-in"></div>' +
      '<div class="field"><label for="leadInterest">Plot / interest</label><input id="leadInterest" name="interest" value="' + esc(item.interest) + '" placeholder="Block, plot or property preference"></div>' +
      '<div class="field"><label for="leadStatus">Status</label><select id="leadStatus" name="status">' + LEAD_STATUSES.filter((status) => status !== 'Converted' || item.status === 'Converted').map((status) => '<option' + (item.status === status ? ' selected' : '') + '>' + esc(status) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="leadFollowUp">Next follow-up</label><input id="leadFollowUp" name="followUpDate" type="date" value="' + esc(item.followUpDate || '') + '"></div>' +
      '<div class="field full"><label for="leadNotes">Notes</label><textarea id="leadNotes" name="notes">' + esc(item.notes) + '</textarea></div></div></form>',
    footer: '<button class="btn btn-ghost" type="button" data-action="close-modal">Cancel</button><button class="btn btn-primary" type="submit" form="lead-form">' + icon('check', 14) + ' Save lead</button>'
  });
}

function saveLeadFromForm() {
  if (!requirePermission('leads.manage')) return;
  const form = $('#lead-form');
  if (!form) { toast('Lead form is unavailable.', 'error'); return; }
  clearFieldErrors(form);
  const values = new FormData(form);
  const name = String(values.get('name') || '').trim();
  const email = String(values.get('email') || '').trim();
  let valid = true;
  if (!name) { fieldError($('#leadName'), 'Enter the prospect’s name.'); valid = false; }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { fieldError($('#leadEmail'), 'Enter a valid email address.'); valid = false; }
  if (!valid) return;
  const id = String(values.get('leadId') || '');
  const existing = id ? data.leads.find((item) => item.id === id) : null;
  if (id && !existing) { toast('Lead not found.', 'error'); return; }
  const previous = data.leads.slice();
  const previousLead = existing ? Object.assign({}, existing) : null;
  const payload = {
    name, email, phone: String(values.get('phone') || '').trim(), source: String(values.get('source') || '').trim(),
    interest: String(values.get('interest') || '').trim(),
    status: LEAD_STATUSES.includes(String(values.get('status'))) ? String(values.get('status')) : 'New',
    followUpDate: String(values.get('followUpDate') || ''), notes: String(values.get('notes') || '').trim(),
    updatedAt: new Date().toISOString()
  };
  let created = null;
  if (existing) Object.assign(existing, payload);
  else {
    created = Object.assign({ id: S.uid('lead-'), createdAt: new Date().toISOString() }, payload);
    data.leads.push(created);
  }
  const result = S.save(data);
  handleSaveResult(result);
  if (!result.ok) {
    if (existing && previousLead) Object.assign(existing, previousLead);
    data.leads = previous;
    return;
  }
  if (created && window.Notify) {
    Notify.event('lead', 'New lead · ' + created.name + (created.phone ? ' · ' + created.phone : '') +
      (created.source ? ' · ' + created.source : '') + (created.interest ? ' · ' + created.interest : ''));
  }
  closeModal();
  refresh();
  toast(existing ? 'Lead updated.' : 'Lead added.');
}

function deleteLead(leadId) {
  if (!requirePermission('leads.manage')) return;
  const lead = data.leads.find((item) => item.id === leadId);
  if (!lead) { toast('Lead not found.', 'error'); return; }
  confirmAction({ title: 'Delete this lead?', message: 'Remove ' + lead.name + ' from the lead pipeline?', confirmText: 'Delete lead' }).then((ok) => {
    if (!ok) return;
    const previous = data.leads;
    data.leads = previous.filter((item) => item.id !== leadId);
    const result = S.save(data);
    handleSaveResult(result);
    if (!result.ok) { data.leads = previous; return; }
    refresh();
    toast('Lead deleted.');
  });
}

function convertLead(leadId) {
  if (!requirePermission('leads.manage')) return;
  const lead = data.leads.find((item) => item.id === leadId);
  if (!lead) { toast('Lead not found.', 'error'); return; }
  if (lead.convertedBuyerId) { openBuyerDetail(lead.convertedBuyerId); return; }
  const phone = String(lead.phone || '').trim();
  if (!phone || phone.replace(/\D/g, '').length < 9) { toast('Add a valid phone number before converting this lead.', 'warn'); openLeadForm(lead.id); return; }
  const buyer = {
    id: S.uid('buyer-'), name: lead.name, phone, email: lead.email || '', business: '',
    idType: 'Ghana Card', idNumber: '', nextOfKin: '', nextOfKinPhone: '', address: '',
    notes: [lead.interest ? 'Interest: ' + lead.interest : '', lead.notes || ''].filter(Boolean).join('\n'),
    photo: '', createdAt: todayValue()
  };
  const previousStatus = lead.status;
  lead.status = 'Converted';
  lead.convertedBuyerId = buyer.id;
  data.buyers.push(buyer);
  const result = S.save(data);
  handleSaveResult(result);
  if (!result.ok) {
    data.buyers = data.buyers.filter((item) => item.id !== buyer.id);
    lead.status = previousStatus;
    delete lead.convertedBuyerId;
    return;
  }
  refresh();
  toast('Lead converted to a buyer.');
  openBuyerDetail(buyer.id);
}

function taskAssigneeOptions(selected) {
  const staff = (data.staff || []).filter((person) => person.status === 'Active' || person.id === selected);
  return '<option value="">Unassigned</option>' + staff.map((person) => '<option value="' + esc(person.id) + '"' + (selected === person.id ? ' selected' : '') + '>' + esc(person.name + (person.status === 'Active' ? '' : ' · ' + person.status)) + '</option>').join('');
}

function taskRowsHTML(tasks) {
  if (!tasks.length) return [operationRowsEmpty(6, 'No tasks found', 'Create a reminder or change the current filter.')];
  return tasks.map((task) => {
    const assigned = (data.staff || []).find((person) => person.id === task.assignedTo);
    const overdue = task.status !== 'Done' && task.dueDate && task.dueDate < todayValue();
    return '<tr><td><span class="cell-copy"><strong>' + esc(task.title) + '</strong><small>' + esc(task.details || '') + '</small></span></td>' +
      '<td>' + esc(operationDate(task.dueDate)) + (overdue ? ' ' + operationStatusBadge('Overdue') : '') + '</td><td>' + operationStatusBadge(task.priority) + '</td>' +
      '<td>' + esc(assigned ? assigned.name : 'Unassigned') + '</td><td>' + operationStatusBadge(task.status) + '</td>' +
      '<td><div class="row-actions">' + (can('tasks.manage') && task.status !== 'Done' ? '<button class="mini-btn" type="button" data-action="complete-task" data-task-id="' + esc(task.id) + '" aria-label="Complete ' + esc(task.title) + '" title="Mark done">' + icon('check', 13) + '</button>' : '') +
      (can('tasks.manage') ? '<button class="mini-btn" type="button" data-action="edit-task" data-task-id="' + esc(task.id) + '" aria-label="Edit ' + esc(task.title) + '" title="Edit task">' + icon('edit', 13) + '</button><button class="mini-btn" type="button" data-action="delete-task" data-task-id="' + esc(task.id) + '" aria-label="Delete ' + esc(task.title) + '" title="Delete task">' + icon('trash', 13) + '</button>' : '') +
      '</div></td></tr>';
  });
}

function viewTasks() {
  const tasks = (data.tasks || []).filter((task) => state.taskStatus === 'all' || (state.taskStatus === 'open' ? task.status !== 'Done' : task.status === state.taskStatus))
    .sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')));
  const due = tasks.filter((task) => task.status !== 'Done' && task.dueDate && task.dueDate <= todayValue()).length;
  return '<div class="page"><div class="page-head"><div><h2>Tasks &amp; reminders</h2><p>Plan buyer follow-ups, site visits, payments and document handovers.</p></div>' +
    (can('tasks.manage') ? '<button class="btn btn-primary" type="button" data-action="add-task">' + icon('plus', 15) + ' Add task</button>' : '') + '</div>' +
    '<div class="accounting-kpis"><div class="accounting-kpi net-kpi"><span class="accounting-kpi-icon">' + icon('calendar', 15) + '</span><small>Open tasks</small><strong>' + (data.tasks || []).filter((task) => task.status !== 'Done').length + '</strong><span>Not yet completed</span></div>' +
    '<div class="accounting-kpi receivable-kpi"><span class="accounting-kpi-icon">' + icon('alert', 15) + '</span><small>Due or overdue</small><strong>' + due + '</strong><span>Needs attention</span></div>' +
    '<div class="accounting-kpi income-kpi"><span class="accounting-kpi-icon">' + icon('checkCircle', 15) + '</span><small>Completed</small><strong>' + (data.tasks || []).filter((task) => task.status === 'Done').length + '</strong><span>Task history</span></div></div>' +
    '<div class="toolbar operation-toolbar"><select id="taskStatusFilter" aria-label="Filter tasks"><option value="open"' + (state.taskStatus === 'open' ? ' selected' : '') + '>Open tasks</option>' + TASK_STATUSES.map((status) => '<option value="' + esc(status) + '"' + (state.taskStatus === status ? ' selected' : '') + '>' + esc(status) + '</option>').join('') + '<option value="all"' + (state.taskStatus === 'all' ? ' selected' : '') + '>All tasks</option></select></div>' +
    operationTable('Task list', 'Tasks are saved on this device. Due dates are shown in local time.', ['Task', 'Due date', 'Priority', 'Assigned to', 'Status', 'Actions'], taskRowsHTML(tasks), 'No tasks found', 'Create a reminder or change the current filter.') + '</div>';
}

function openTaskForm(taskId) {
  if (!requirePermission('tasks.manage')) return;
  const task = taskId ? data.tasks.find((item) => item.id === taskId) : null;
  if (taskId && !task) { toast('Task not found.', 'error'); return; }
  const item = task || { title: '', details: '', dueDate: todayValue(), priority: 'Normal', status: 'Open', assignedTo: '' };
  openModal({
    title: task ? 'Edit task' : 'Add task',
    subtitle: 'Set an owner, deadline and priority.',
    body: '<form id="task-form" novalidate><input type="hidden" name="taskId" value="' + esc(item.id || '') + '"><div class="form-grid">' +
      '<div class="field full"><label for="taskTitle">Task <span class="req">*</span></label><input id="taskTitle" name="title" value="' + esc(item.title) + '" autofocus><span class="error"></span></div>' +
      '<div class="field"><label for="taskDueDate">Due date</label><input id="taskDueDate" name="dueDate" type="date" value="' + esc(item.dueDate || '') + '"></div>' +
      '<div class="field"><label for="taskPriority">Priority</label><select id="taskPriority" name="priority">' + PRIORITIES.map((priority) => '<option' + (item.priority === priority ? ' selected' : '') + '>' + esc(priority) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="taskAssignee">Assign to staff</label><select id="taskAssignee" name="assignedTo">' + taskAssigneeOptions(item.assignedTo) + '</select></div>' +
      '<div class="field"><label for="taskStatus">Status</label><select id="taskStatus" name="status">' + TASK_STATUSES.map((status) => '<option' + (item.status === status ? ' selected' : '') + '>' + esc(status) + '</option>').join('') + '</select></div>' +
      '<div class="field full"><label for="taskDetails">Notes</label><textarea id="taskDetails" name="details">' + esc(item.details) + '</textarea></div></div></form>',
    footer: '<button class="btn btn-ghost" type="button" data-action="close-modal">Cancel</button><button class="btn btn-primary" type="submit" form="task-form">' + icon('check', 14) + ' Save task</button>'
  });
}

function saveTaskFromForm() {
  if (!requirePermission('tasks.manage')) return;
  const form = $('#task-form');
  if (!form) { toast('Task form is unavailable.', 'error'); return; }
  clearFieldErrors(form);
  const values = new FormData(form);
  const title = String(values.get('title') || '').trim();
  if (!title) { fieldError($('#taskTitle'), 'Enter a task description.'); return; }
  const id = String(values.get('taskId') || '');
  const existing = id ? data.tasks.find((item) => item.id === id) : null;
  if (id && !existing) { toast('Task not found.', 'error'); return; }
  const previous = data.tasks.slice();
  const previousTask = existing ? Object.assign({}, existing) : null;
  const payload = {
    title, details: String(values.get('details') || '').trim(), dueDate: String(values.get('dueDate') || ''),
    priority: PRIORITIES.includes(String(values.get('priority'))) ? String(values.get('priority')) : 'Normal',
    status: TASK_STATUSES.includes(String(values.get('status'))) ? String(values.get('status')) : 'Open',
    assignedTo: String(values.get('assignedTo') || ''), updatedAt: new Date().toISOString()
  };
  if (existing) {
    Object.assign(existing, payload);
    if (payload.status === 'Done') existing.completedAt = existing.completedAt || payload.updatedAt;
    else delete existing.completedAt;
  } else {
    const created = Object.assign({ id: S.uid('task-'), createdAt: new Date().toISOString() }, payload);
    if (created.status === 'Done') created.completedAt = created.updatedAt;
    data.tasks.push(created);
  }
  const result = S.save(data);
  handleSaveResult(result);
  if (!result.ok) {
    if (existing && previousTask) Object.assign(existing, previousTask);
    data.tasks = previous;
    return;
  }
  closeModal(); refresh(); toast(existing ? 'Task updated.' : 'Task added.');
}

function toggleTaskComplete(taskId) {
  const task = data.tasks.find((item) => item.id === taskId);
  if (!task) { toast('Task not found.', 'error'); return; }
  if (task.status === 'Done') return;
  if (!requirePermission('tasks.manage')) return;
  const previousStatus = task.status;
  const previousCompletedAt = task.completedAt;
  task.status = 'Done'; task.completedAt = new Date().toISOString();
  const result = S.save(data); handleSaveResult(result);
  if (!result.ok) { task.status = previousStatus; if (previousCompletedAt) task.completedAt = previousCompletedAt; else delete task.completedAt; return; }
  refresh(); toast('Task marked complete.');
}

function deleteTask(taskId) {
  if (!requirePermission('tasks.manage')) return;
  const task = data.tasks.find((item) => item.id === taskId);
  if (!task) { toast('Task not found.', 'error'); return; }
  confirmAction({ title: 'Delete this task?', message: 'Remove "' + task.title + '" from the task list?', confirmText: 'Delete task' }).then((ok) => {
    if (!ok) return;
    const previous = data.tasks; data.tasks = previous.filter((item) => item.id !== taskId);
    const result = S.save(data); handleSaveResult(result);
    if (!result.ok) { data.tasks = previous; return; }
    refresh(); toast('Task deleted.');
  });
}

function documentRowsHTML(documents) {
  if (!documents.length) return [operationRowsEmpty(5, 'No documents found', 'Add an estate document or change your search.')];
  return documents.map((doc) => {
    const plot = data.plots.find((item) => item.id === doc.plotId);
    return '<tr><td><span class="cell-copy"><strong>' + esc(doc.title) + '</strong><small>' + esc(doc.fileName || 'No attached file') + '</small></span></td><td>' + esc(doc.category) + '</td><td>' + esc(plot ? plot.label + ' · Block ' + plot.block : 'Estate-wide') + '</td><td>' + esc(operationDate(doc.createdAt)) + '</td><td><div class="row-actions">' +
      (doc.fileData ? '<button class="mini-btn" type="button" data-action="download-estate-document" data-document-id="' + esc(doc.id) + '" title="Download document">' + icon('download', 13) + '</button>' : '') +
      (can('estateDocs.manage') ? '<button class="mini-btn" type="button" data-action="edit-estate-document" data-document-id="' + esc(doc.id) + '" title="Edit document">' + icon('edit', 13) + '</button><button class="mini-btn" type="button" data-action="delete-estate-document" data-document-id="' + esc(doc.id) + '" title="Delete document">' + icon('trash', 13) + '</button>' : '') +
      '</div></td></tr>';
  });
}

function viewEstateDocuments() {
  const docs = (data.estateDocuments || []).filter((doc) => !state.documentQuery || [doc.title, doc.category, doc.fileName, doc.notes].join(' ').toLowerCase().includes(state.documentQuery.toLowerCase()))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return '<div class="page"><div class="page-head"><div><h2>Estate document register</h2><p>Organize site plans, permits, contracts and estate-wide records. Client IDs and confidential records belong in the encrypted client vault.</p></div>' +
    (can('estateDocs.manage') ? '<button class="btn btn-primary" type="button" data-action="add-estate-document">' + icon('plus', 15) + ' Add document</button>' : '') + '</div>' +
    '<div class="toolbar operation-toolbar"><label class="search-field"><span>' + icon('search', 14) + '</span><input id="documentSearch" type="search" value="' + esc(state.documentQuery) + '" placeholder="Search documents…" aria-label="Search estate documents"></label></div>' +
    operationTable('Estate documents', docs.length + ' records', ['Document', 'Category', 'Scope', 'Added', 'Actions'], documentRowsHTML(docs), 'No documents found', 'Add an estate document or change your search.') +
    '<p class="operation-notice">' + icon('info', 14) + ' Uploaded files are stored locally in this browser without encryption. Store confidential client files in that client’s encrypted vault.</p></div>';
}

function updateEstateDocumentResults() {
  if (state.route !== 'documents') return;
  const rows = $('#view .operation-table tbody');
  if (!rows) return;
  const docs = (data.estateDocuments || []).filter((doc) => !state.documentQuery || [doc.title, doc.category, doc.fileName, doc.notes].join(' ').toLowerCase().includes(state.documentQuery.toLowerCase()))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  rows.innerHTML = documentRowsHTML(docs).join('');
}

function openEstateDocumentForm(documentId) {
  if (!requirePermission('estateDocs.manage')) return;
  const doc = documentId ? data.estateDocuments.find((item) => item.id === documentId) : null;
  if (documentId && !doc) { toast('Document not found.', 'error'); return; }
  state.operationFileDraft = doc ? { name: doc.fileName, type: doc.fileType, data: doc.fileData, size: doc.fileSize } : null;
  const item = doc || { title: '', category: 'Other', plotId: '', notes: '' };
  openModal({
    title: doc ? 'Edit estate document' : 'Add estate document',
    subtitle: 'Attach a non-confidential PDF or image to the register.',
    body: '<form id="estate-document-form" novalidate><input type="hidden" name="documentId" value="' + esc(item.id || '') + '"><div class="form-grid">' +
      '<div class="field"><label for="estateDocumentTitle">Document title <span class="req">*</span></label><input id="estateDocumentTitle" name="title" value="' + esc(item.title) + '" autofocus><span class="error"></span></div>' +
      '<div class="field"><label for="estateDocumentCategory">Category</label><select id="estateDocumentCategory" name="category">' + DOCUMENT_CATEGORIES.map((category) => '<option' + (item.category === category ? ' selected' : '') + '>' + esc(category) + '</option>').join('') + '</select></div>' +
      '<div class="field full"><label for="estateDocumentPlot">Related plot (optional)</label><select id="estateDocumentPlot" name="plotId"><option value="">Estate-wide</option>' + data.plots.map((plot) => '<option value="' + esc(plot.id) + '"' + (item.plotId === plot.id ? ' selected' : '') + '>' + esc(plot.label + ' · Block ' + plot.block + ' · ' + plot.code) + '</option>').join('') + '</select></div>' +
      '<div class="field full"><label>File · PDF or image, up to 1 MB</label><div class="doc-file-line"><span id="estateDocumentFileName">' + esc(state.operationFileDraft ? state.operationFileDraft.name : 'No file selected') + '</span><button type="button" class="btn btn-ghost btn-sm" data-action="pick-estate-document-file">Choose file</button>' + (state.operationFileDraft ? '<button type="button" class="btn-link" data-action="remove-estate-document-file">Remove</button>' : '') + '</div><input id="estateDocumentFileInput" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" hidden></div>' +
      '<div class="field full"><label for="estateDocumentNotes">Notes</label><textarea id="estateDocumentNotes" name="notes">' + esc(item.notes || '') + '</textarea></div></div></form>',
    footer: '<button class="btn btn-ghost" type="button" data-action="close-modal">Cancel</button><button class="btn btn-primary" type="submit" form="estate-document-form">' + icon('check', 14) + ' Save document</button>'
  });
}

function handleEstateDocumentFile(file) {
  if (!file) return;
  if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast('Choose a PDF, JPEG, PNG or WebP file.', 'warn'); return; }
  if (file.size > 1024 * 1024) { toast('Choose a file smaller than 1 MB.', 'warn'); return; }
  const reader = new FileReader();
  reader.onload = () => {
    state.operationFileDraft = { name: file.name, type: file.type, data: String(reader.result), size: file.size };
    const label = $('#estateDocumentFileName'); if (label) label.textContent = file.name;
    const remove = $('#modalBody [data-action="remove-estate-document-file"]');
    if (!remove) {
      const line = $('.doc-file-line');
      if (line) line.insertAdjacentHTML('beforeend', '<button type="button" class="btn-link" data-action="remove-estate-document-file">Remove</button>');
    }
  };
  reader.onerror = () => toast('Could not read the selected document.', 'error');
  reader.readAsDataURL(file);
}

function saveEstateDocumentFromForm() {
  if (!requirePermission('estateDocs.manage')) return;
  const form = $('#estate-document-form');
  if (!form) { toast('Document form is unavailable.', 'error'); return; }
  clearFieldErrors(form);
  const values = new FormData(form);
  const title = String(values.get('title') || '').trim();
  if (!title) { fieldError($('#estateDocumentTitle'), 'Enter a document title.'); return; }
  const id = String(values.get('documentId') || '');
  const existing = id ? data.estateDocuments.find((item) => item.id === id) : null;
  if (id && !existing) { toast('Document not found.', 'error'); return; }
  const previous = data.estateDocuments.slice();
  const previousDocument = existing ? Object.assign({}, existing) : null;
  const payload = {
    title, category: DOCUMENT_CATEGORIES.includes(String(values.get('category'))) ? String(values.get('category')) : 'Other', plotId: String(values.get('plotId') || ''),
    notes: String(values.get('notes') || '').trim(), fileName: state.operationFileDraft ? state.operationFileDraft.name : '',
    fileType: state.operationFileDraft ? state.operationFileDraft.type : '',
    fileData: state.operationFileDraft ? state.operationFileDraft.data : '',
    fileSize: state.operationFileDraft ? state.operationFileDraft.size : 0,
    updatedAt: new Date().toISOString()
  };
  if (existing) Object.assign(existing, payload);
  else data.estateDocuments.push(Object.assign({ id: S.uid('estate-doc-'), createdAt: new Date().toISOString() }, payload));
  const result = S.save(data); handleSaveResult(result);
  if (!result.ok) {
    if (existing && previousDocument) Object.assign(existing, previousDocument);
    data.estateDocuments = previous;
    return;
  }
  state.operationFileDraft = null; closeModal(); refresh(); toast(existing ? 'Document updated.' : 'Document added.');
}

function downloadEstateDocument(documentId) {
  const doc = data.estateDocuments.find((item) => item.id === documentId);
  if (!doc || !doc.fileData) { toast('Document file not found.', 'error'); return; }
  const link = document.createElement('a'); link.href = doc.fileData; link.download = doc.fileName || 'estate-document';
  document.body.appendChild(link); link.click(); link.remove();
}

function deleteEstateDocument(documentId) {
  if (!requirePermission('estateDocs.manage')) return;
  const doc = data.estateDocuments.find((item) => item.id === documentId);
  if (!doc) { toast('Document not found.', 'error'); return; }
  confirmAction({ title: 'Delete this document?', message: 'Remove "' + doc.title + '" and its local file?', confirmText: 'Delete document' }).then((ok) => {
    if (!ok) return;
    const previous = data.estateDocuments; data.estateDocuments = previous.filter((item) => item.id !== documentId);
    const result = S.save(data); handleSaveResult(result);
    if (!result.ok) { data.estateDocuments = previous; return; }
    refresh(); toast('Document deleted.');
  });
}

function maintenanceRowsHTML(items) {
  if (!items.length) return [operationRowsEmpty(6, 'No maintenance issues', 'Log a site issue or change the status filter.')];
  return items.map((item) => {
    const plot = data.plots.find((entry) => entry.id === item.plotId);
    const person = (data.staff || []).find((entry) => entry.id === item.assignedTo);
    return '<tr><td><span class="cell-copy"><strong>' + esc(item.title) + '</strong><small>' + esc(item.notes || '') + '</small></span></td><td>' + esc(plot ? plot.label + ' · Block ' + plot.block : 'Estate-wide') + '</td><td>' + operationStatusBadge(item.priority) + '</td><td>' + operationStatusBadge(item.status) + '</td><td>' + esc(person ? person.name : 'Unassigned') + '</td><td><div class="row-actions">' +
      (can('maintenance.manage') ? '<button class="mini-btn" type="button" data-action="edit-maintenance" data-maintenance-id="' + esc(item.id) + '" title="Edit issue">' + icon('edit', 13) + '</button><button class="mini-btn" type="button" data-action="delete-maintenance" data-maintenance-id="' + esc(item.id) + '" title="Delete issue">' + icon('trash', 13) + '</button>' : '') +
      '</div></td></tr>';
  });
}

function viewMaintenance() {
  const items = (data.maintenance || []).filter((item) => state.maintenanceStatus === 'all' || item.status === state.maintenanceStatus)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const openCount = (data.maintenance || []).filter((item) => item.status !== 'Resolved').length;
  return '<div class="page"><div class="page-head"><div><h2>Maintenance &amp; site issues</h2><p>Log plot, infrastructure and estate issues, assign ownership and track resolution.</p></div>' +
    (can('maintenance.manage') ? '<button class="btn btn-primary" type="button" data-action="add-maintenance">' + icon('plus', 15) + ' Log issue</button>' : '') + '</div>' +
    '<div class="accounting-kpis"><div class="accounting-kpi receivable-kpi"><span class="accounting-kpi-icon">' + icon('alert', 15) + '</span><small>Open issues</small><strong>' + openCount + '</strong><span>Awaiting resolution</span></div><div class="accounting-kpi income-kpi"><span class="accounting-kpi-icon">' + icon('checkCircle', 15) + '</span><small>Resolved</small><strong>' + (data.maintenance || []).filter((item) => item.status === 'Resolved').length + '</strong><span>Completed work</span></div></div>' +
    '<div class="toolbar operation-toolbar"><select id="maintenanceStatusFilter" aria-label="Filter maintenance issues"><option value="all">All issues</option>' + MAINTENANCE_STATUSES.map((status) => '<option value="' + esc(status) + '"' + (state.maintenanceStatus === status ? ' selected' : '') + '>' + esc(status) + '</option>').join('') + '</select></div>' +
    operationTable('Issue register', 'Issues can be linked to a plot and assigned to an active staff member.', ['Issue', 'Plot / area', 'Priority', 'Status', 'Assigned to', 'Actions'], maintenanceRowsHTML(items), 'No maintenance issues', 'Log a site issue or change the status filter.') + '</div>';
}

function openMaintenanceForm(issueId) {
  if (!requirePermission('maintenance.manage')) return;
  const issue = issueId ? data.maintenance.find((item) => item.id === issueId) : null;
  if (issueId && !issue) { toast('Maintenance issue not found.', 'error'); return; }
  const item = issue || { title: '', plotId: '', priority: 'Normal', status: 'Open', assignedTo: '', notes: '' };
  openModal({
    title: issue ? 'Edit maintenance issue' : 'Log maintenance issue',
    subtitle: 'Record where it is, who owns it and current status.',
    body: '<form id="maintenance-form" novalidate><input type="hidden" name="maintenanceId" value="' + esc(item.id || '') + '"><div class="form-grid">' +
      '<div class="field full"><label for="maintenanceTitle">Issue <span class="req">*</span></label><input id="maintenanceTitle" name="title" value="' + esc(item.title) + '" placeholder="Damaged boundary marker" autofocus><span class="error"></span></div>' +
      '<div class="field"><label for="maintenancePlot">Plot / area</label><select id="maintenancePlot" name="plotId"><option value="">Estate-wide</option>' + data.plots.map((plot) => '<option value="' + esc(plot.id) + '"' + (item.plotId === plot.id ? ' selected' : '') + '>' + esc(plot.label + ' · Block ' + plot.block) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="maintenancePriority">Priority</label><select id="maintenancePriority" name="priority">' + PRIORITIES.map((priority) => '<option' + (item.priority === priority ? ' selected' : '') + '>' + esc(priority) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="maintenanceAssignee">Assigned to</label><select id="maintenanceAssignee" name="assignedTo">' + taskAssigneeOptions(item.assignedTo) + '</select></div>' +
      '<div class="field"><label for="maintenanceStatus">Status</label><select id="maintenanceStatus" name="status">' + MAINTENANCE_STATUSES.map((status) => '<option' + (item.status === status ? ' selected' : '') + '>' + esc(status) + '</option>').join('') + '</select></div>' +
      '<div class="field full"><label for="maintenanceNotes">Notes</label><textarea id="maintenanceNotes" name="notes">' + esc(item.notes || '') + '</textarea></div></div></form>',
    footer: '<button class="btn btn-ghost" type="button" data-action="close-modal">Cancel</button><button class="btn btn-primary" type="submit" form="maintenance-form">' + icon('check', 14) + ' Save issue</button>'
  });
}

function saveMaintenanceFromForm() {
  if (!requirePermission('maintenance.manage')) return;
  const form = $('#maintenance-form');
  if (!form) { toast('Maintenance form is unavailable.', 'error'); return; }
  clearFieldErrors(form);
  const values = new FormData(form);
  const title = String(values.get('title') || '').trim();
  if (!title) { fieldError($('#maintenanceTitle'), 'Describe the issue.'); return; }
  const id = String(values.get('maintenanceId') || '');
  const existing = id ? data.maintenance.find((item) => item.id === id) : null;
  if (id && !existing) { toast('Maintenance issue not found.', 'error'); return; }
  const previous = data.maintenance.slice();
  const previousIssue = existing ? Object.assign({}, existing) : null;
  const payload = {
    title, plotId: String(values.get('plotId') || ''),
    priority: PRIORITIES.includes(String(values.get('priority'))) ? String(values.get('priority')) : 'Normal',
    status: MAINTENANCE_STATUSES.includes(String(values.get('status'))) ? String(values.get('status')) : 'Open',
    assignedTo: String(values.get('assignedTo') || ''), notes: String(values.get('notes') || '').trim(),
    updatedAt: new Date().toISOString()
  };
  if (existing) Object.assign(existing, payload);
  else data.maintenance.push(Object.assign({ id: S.uid('issue-'), createdAt: new Date().toISOString() }, payload));
  const result = S.save(data); handleSaveResult(result);
  if (!result.ok) {
    if (existing && previousIssue) Object.assign(existing, previousIssue);
    data.maintenance = previous;
    return;
  }
  closeModal(); refresh(); toast(existing ? 'Issue updated.' : 'Issue logged.');
}

function deleteMaintenance(issueId) {
  if (!requirePermission('maintenance.manage')) return;
  const issue = data.maintenance.find((item) => item.id === issueId);
  if (!issue) { toast('Maintenance issue not found.', 'error'); return; }
  confirmAction({ title: 'Delete this issue?', message: 'Remove "' + issue.title + '" from the maintenance register?', confirmText: 'Delete issue' }).then((ok) => {
    if (!ok) return;
    const previous = data.maintenance; data.maintenance = previous.filter((item) => item.id !== issueId);
    const result = S.save(data); handleSaveResult(result);
    if (!result.ok) { data.maintenance = previous; return; }
    refresh(); toast('Issue deleted.');
  });
}

function reportDateMatch(item, key) {
  const date = String(item[key] || '').slice(0, 10);
  return (!state.reportStart || date >= state.reportStart) && (!state.reportEnd || date <= state.reportEnd);
}

function reportData() {
  const type = state.reportType;
  if (type === 'staff' && !can('staff.view')) return [];
  if (type === 'sales') return S.decoratedSales(data).filter((sale) => reportDateMatch(sale, 'date')).map((sale) => [sale.receiptNo, sale.buyer ? sale.buyer.name : '', sale.buyer ? sale.buyer.phone : '', sale.plot ? sale.plot.label : '', sale.plot ? sale.plot.block : '', sale.date, sale.dueDate, sale.price, sale.paid, sale.balance, sale.status, sale.payments.length]);
  if (type === 'payments') {
    const sales = new Map(S.decoratedSales(data).map((sale) => [sale.id, sale]));
    return (data.payments || []).filter((payment) => reportDateMatch(payment, 'date')).map((payment) => {
      const sale = sales.get(payment.saleId);
      return [payment.date, sale && sale.receiptNo || '', sale && sale.buyer ? sale.buyer.name : '', sale && sale.buyer ? sale.buyer.phone : '', sale && sale.plot ? sale.plot.label : '', payment.method || '', payment.amount, payment.note || payment.reference || ''];
    });
  }
  if (type === 'receivables') return S.decoratedSales(data).filter((sale) => sale.balance > 0).filter((sale) => reportDateMatch(sale, 'dueDate')).map((sale) => [sale.receiptNo, sale.buyer ? sale.buyer.name : '', sale.buyer ? sale.buyer.phone : '', sale.plot ? sale.plot.label : '', sale.date, sale.dueDate, sale.price, sale.paid, sale.balance, sale.daysOverdue, sale.status]);
  if (type === 'expenses') return (data.expenses || []).filter((expense) => reportDateMatch(expense, 'date')).map((expense) => [expense.date, expense.description, expense.category, expense.paidTo || '', expense.method || '', expense.amount, expense.reference || '', expense.notes || '']);
  if (type === 'inventory') return data.plots.map((plot) => {
    const sale = saleForPlot(plot);
    const buyer = sale && sale.buyer ? sale.buyer.name : '';
    return [plot.code, plot.label, plot.block, plot.size, plot.price, plot.status, buyer, sale ? sale.date : '', sale ? sale.receiptNo : ''];
  });
  if (type === 'leads') return (data.leads || []).filter((lead) => reportDateMatch(lead, 'createdAt')).map((lead) => [lead.name, lead.phone || '', lead.email || '', lead.source || '', lead.interest || '', lead.createdAt || '', lead.followUpDate || '', lead.status || '', lead.convertedBuyerId || '']);
  if (type === 'tasks') return (data.tasks || []).filter((task) => reportDateMatch(task, 'dueDate')).map((task) => {
    const assigned = (data.staff || []).find((person) => person.id === task.assignedTo);
    return [task.title, task.details || '', task.dueDate || '', task.priority || '', assigned ? assigned.name : 'Unassigned', task.status || '', task.createdAt || ''];
  });
  if (type === 'maintenance') return (data.maintenance || []).filter((item) => reportDateMatch(item, 'createdAt')).map((item) => {
    const plot = data.plots.find((entry) => entry.id === item.plotId);
    const assigned = (data.staff || []).find((person) => person.id === item.assignedTo);
    return [item.title, plot ? plot.label + ' · Block ' + plot.block : 'Estate-wide', item.priority || '', item.status || '', assigned ? assigned.name : 'Unassigned', item.createdAt || '', item.updatedAt || '', item.notes || ''];
  });
  if (type === 'staff') return (data.staff || []).map((person) => [person.name, person.jobTitle, person.department, person.phone, person.email, person.status, person.monthlySalary]);
  const stats = S.stats(data);
  const sales = S.decoratedSales(data).filter((sale) => reportDateMatch(sale, 'date'));
  const payments = (data.payments || []).filter((payment) => reportDateMatch(payment, 'date'));
  const expenses = (data.expenses || []).filter((expense) => reportDateMatch(expense, 'date'));
  return [
    ['Plots', data.plots.length], ['Available plots', stats.available], ['Reserved plots', stats.reserved], ['Sold plots', stats.sold],
    ['Buyers', data.buyers.length], ['Leads', (data.leads || []).length], ['Sales in period', sales.length],
    ['Sales value in period', sales.reduce((sum, sale) => sum + Number(sale.price || 0), 0)],
    ['Collected in period', payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)], ['Current outstanding', stats.outstanding],
    ['Expenses in period', expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0)],
    ['Open tasks', (data.tasks || []).filter((task) => task.status !== 'Done').length],
    ['Open maintenance issues', (data.maintenance || []).filter((item) => item.status !== 'Resolved').length]
  ];
}

function reportHeaders() {
  if (state.reportType === 'sales') return ['Receipt', 'Buyer', 'Phone', 'Plot', 'Block', 'Sale date', 'Due date', 'Sale value', 'Paid', 'Balance', 'Status', 'Payments'];
  if (state.reportType === 'payments') return ['Date', 'Receipt', 'Buyer', 'Phone', 'Plot', 'Method', 'Amount', 'Reference / note'];
  if (state.reportType === 'receivables') return ['Receipt', 'Buyer', 'Phone', 'Plot', 'Sale date', 'Due date', 'Sale value', 'Paid', 'Balance', 'Days overdue', 'Status'];
  if (state.reportType === 'expenses') return ['Date', 'Description', 'Category', 'Paid to', 'Method', 'Amount', 'Reference', 'Notes'];
  if (state.reportType === 'inventory') return ['Plot code', 'Plot', 'Block', 'Size m2', 'Price', 'Status', 'Buyer', 'Sale date', 'Receipt'];
  if (state.reportType === 'leads') return ['Prospect', 'Phone', 'Email', 'Source', 'Interest', 'Created', 'Follow-up', 'Status', 'Converted buyer ID'];
  if (state.reportType === 'tasks') return ['Task', 'Details', 'Due date', 'Priority', 'Assigned to', 'Status', 'Created'];
  if (state.reportType === 'maintenance') return ['Issue', 'Plot / area', 'Priority', 'Status', 'Assigned to', 'Created', 'Last updated', 'Notes'];
  if (state.reportType === 'staff') return ['Name', 'Job title', 'Department', 'Phone', 'Email', 'Status', 'Monthly salary'];
  return ['Metric', 'Value'];
}

function reportDisplayValue(value, header, row) {
  if (typeof value !== 'number') return String(value == null ? '' : value);
  const isOverviewAmount = state.reportType === 'overview' && row && /value|collected|outstanding|expenses/i.test(String(row[0] || ''));
  const isCurrency = state.reportType === 'overview'
    ? isOverviewAmount
    : /value|paid|balance|amount|price|salary|collected|outstanding|expenses/i.test(header);
  return isCurrency ? accountingMoney(value) : String(value);
}

function filteredReportData() {
  const query = String(state.reportQuery || '').trim().toLowerCase();
  const headers = reportHeaders();
  return reportData().filter((row) => !query || row.map((value, index) => reportDisplayValue(value, headers[index], row)).join(' ').toLowerCase().includes(query));
}

function reportSummary() {
  const sales = S.decoratedSales(data).filter((sale) => reportDateMatch(sale, 'date'));
  const payments = (data.payments || []).filter((payment) => reportDateMatch(payment, 'date'));
  const expenses = (data.expenses || []).filter((expense) => reportDateMatch(expense, 'date'));
  const allReceivables = S.decoratedSales(data).filter((sale) => sale.balance > 0);
  const receivables = allReceivables.filter((sale) => reportDateMatch(sale, 'dueDate'));
  const leads = data.leads || [];
  const tasks = data.tasks || [];
  const issues = data.maintenance || [];
  const total = (rows, key) => rows.reduce((sum, row) => sum + Number(row[key] || 0), 0);
  const definitions = {
    overview: [
      ['Sales in period', sales.length, 'Recorded transactions'],
      ['Sales value', accountingMoney(total(sales, 'price')), 'Contract value'],
      ['Received', accountingMoney(total(payments, 'amount')), payments.length + ' payment transactions'],
      ['Expenses', accountingMoney(total(expenses, 'amount')), expenses.length + ' recorded expenses'],
      ['Outstanding', accountingMoney(total(allReceivables, 'balance')), allReceivables.length + ' unpaid sales'],
      ['Active leads', leads.filter((lead) => !['Converted', 'Lost'].includes(lead.status)).length, leads.length + ' leads total']
    ],
    sales: [
      ['Sales', sales.length, 'In selected period'],
      ['Contract value', accountingMoney(total(sales, 'price')), 'Total sale price'],
      ['Paid', accountingMoney(total(sales, 'paid')), 'Collected against these sales'],
      ['Balance', accountingMoney(total(sales, 'balance')), 'Remaining on these sales']
    ],
    payments: [
      ['Payments', payments.length, 'Transactions in selected period'],
      ['Total received', accountingMoney(total(payments, 'amount')), 'Across all payment methods'],
      ['Average payment', accountingMoney(payments.length ? total(payments, 'amount') / payments.length : 0), 'Per transaction']
    ],
    receivables: [
      ['Open balances', receivables.length, 'Sales with outstanding balance'],
      ['Outstanding', accountingMoney(total(receivables, 'balance')), 'Current balance'],
      ['Overdue sales', receivables.filter((sale) => sale.daysOverdue > 0).length, 'Past due date'],
      ['Overdue balance', accountingMoney(total(receivables.filter((sale) => sale.daysOverdue > 0), 'balance')), 'Past-due amount']
    ],
    expenses: [
      ['Expenses', expenses.length, 'In selected period'],
      ['Total spend', accountingMoney(total(expenses, 'amount')), 'Recorded operating costs'],
      ['Average expense', accountingMoney(expenses.length ? total(expenses, 'amount') / expenses.length : 0), 'Per expense']
    ],
    inventory: [
      ['Total plots', data.plots.length, 'Registered inventory'],
      ['Available', data.plots.filter((plot) => plot.status === 'available').length, 'Ready for sale'],
      ['Reserved', data.plots.filter((plot) => plot.status === 'reserved').length, 'On hold'],
      ['Sold', data.plots.filter((plot) => plot.status === 'sold').length, 'Allocated to buyers']
    ],
    leads: [
      ['Total leads', leads.length, 'All prospects'],
      ['Active', leads.filter((lead) => !['Converted', 'Lost'].includes(lead.status)).length, 'Still in pipeline'],
      ['Qualified', leads.filter((lead) => lead.status === 'Qualified').length, 'Qualified prospects'],
      ['Converted', leads.filter((lead) => lead.status === 'Converted').length, 'Conversion rate ' + (leads.length ? Math.round(leads.filter((lead) => lead.status === 'Converted').length / leads.length * 100) : 0) + '%']
    ],
    tasks: [
      ['Total tasks', tasks.length, 'Tasks in selected due-date range'],
      ['Open', tasks.filter((task) => task.status !== 'Done').length, 'Not completed'],
      ['Overdue', tasks.filter((task) => task.status !== 'Done' && task.dueDate && task.dueDate < todayValue()).length, 'Needs attention'],
      ['Completed', tasks.filter((task) => task.status === 'Done').length, 'Marked done']
    ],
    maintenance: [
      ['Total issues', issues.length, 'In selected created-date range'],
      ['Open', issues.filter((item) => item.status !== 'Resolved').length, 'Awaiting resolution'],
      ['High priority', issues.filter((item) => ['High', 'Urgent'].includes(item.priority) && item.status !== 'Resolved').length, 'Open high-priority items'],
      ['Resolved', issues.filter((item) => item.status === 'Resolved').length, 'Completed']
    ],
    staff: [
      ['Team members', (data.staff || []).length, 'Current staff register'],
      ['Active', (data.staff || []).filter((person) => person.status === 'Active').length, 'Currently active']
    ]
  };
  return definitions[state.reportType] || definitions.overview;
}

function reportSummaryHTML() {
  return '<div class="report-summary-grid">' + reportSummary().map(([label, value, detail]) =>
    '<article class="report-summary-card"><span>' + esc(label) + '</span><strong>' + esc(value) + '</strong><small>' + esc(detail) + '</small></article>'
  ).join('') + '</div>';
}

function reportTableHTML(headers, rows) {
  if (!rows.length) return '<div class="empty" style="padding:28px 18px"><h3>No matching records</h3><p>Try a different report or date range.</p></div>';
  return '<div class="table-wrap"><table class="data report-table"><thead><tr>' + headers.map((header) => '<th>' + esc(header) + '</th>').join('') + '</tr></thead><tbody>' +
    rows.map((row) => '<tr>' + row.map((value, index) => '<td>' + esc(reportDisplayValue(value, headers[index], row)) + '</td>').join('') + '</tr>').join('') +
    '</tbody></table></div>';
}

function viewReports() {
  if (state.reportType === 'staff' && !can('staff.view')) state.reportType = 'overview';
  const headers = reportHeaders(); const rows = filteredReportData();
  const label = (REPORT_TYPES.find((entry) => entry[0] === state.reportType) || REPORT_TYPES[0])[1];
  return '<div class="page"><div class="page-head"><div><h2>Reports</h2><p>Review and export sales, receivables, expenses, inventory and staff records.</p></div>' +
    '<div class="head-actions"><button class="btn btn-ghost" type="button" data-action="print-report">' + icon('printer', 15) + ' Print</button><button class="btn btn-primary" type="button" data-action="export-report">' + icon('download', 15) + ' Export CSV</button></div></div>' +
    '<div class="card report-controls"><div class="report-filter-row"><label>Report<select id="reportType">' + REPORT_TYPES.filter(([value]) => value !== 'staff' || can('staff.view')).map(([value, name]) => '<option value="' + esc(value) + '"' + (state.reportType === value ? ' selected' : '') + '>' + esc(name) + '</option>').join('') + '</select></label>' +
    '<label>From<input type="date" id="reportStart" value="' + esc(state.reportStart) + '"></label><label>To<input type="date" id="reportEnd" value="' + esc(state.reportEnd) + '"></label>' +
    '<label class="report-search-label">Find in report<input type="search" id="reportSearch" value="' + esc(state.reportQuery) + '" placeholder="Search any report detail…"></label>' +
    '<button class="btn btn-ghost btn-sm report-clear" type="button" data-action="clear-report-filters">Clear filters</button></div><p>Dates filter sales, payments, expenses, lead creation, task due dates and issue creation. Receivables are filtered by due date; inventory and staff show current records. Search applies to visible, printed and exported rows.</p></div>' +
    '<div id="reportSummary">' + reportSummaryHTML() + '</div>' +
    '<div class="card operation-card"><div class="card-head"><div><h3 id="reportHeading">' + esc(label) + '</h3><p id="reportRowCount">' + rows.length + ' of ' + reportData().length + ' rows · Generated ' + esc(fmtDate(new Date())) + '</p></div></div><div id="reportResults">' + reportTableHTML(headers, rows) + '</div></div></div>';
}

function updateReports() {
  if (state.route !== 'reports') return;
  if (state.reportType === 'staff' && !can('staff.view')) state.reportType = 'overview';
  const headers = reportHeaders();
  const rows = filteredReportData();
  const label = (REPORT_TYPES.find((entry) => entry[0] === state.reportType) || REPORT_TYPES[0])[1];
  const typeSelect = $('#reportType');
  if (typeSelect && typeSelect.value !== state.reportType) typeSelect.value = state.reportType;
  const heading = $('#reportHeading');
  if (heading) heading.textContent = label;
  const rowCount = $('#reportRowCount');
  if (rowCount) rowCount.textContent = rows.length + ' of ' + reportData().length + ' rows · Generated ' + fmtDate(new Date());
  const summary = $('#reportSummary');
  if (summary) summary.innerHTML = reportSummaryHTML();
  const results = $('#reportResults');
  if (results) results.innerHTML = reportTableHTML(headers, rows);
}

function safeCsvCell(value) {
  let text = String(value == null ? '' : value);
  if (typeof value !== 'number' && /^[\s]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

function exportReport() {
  if (!requirePermission('reports.view')) return;
  const headers = reportHeaders(); const rows = filteredReportData();
  const csv = [headers, ...rows].map((row) => row.map(safeCsvCell).join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob); const link = document.createElement('a');
  link.href = url; link.download = 'land-report-' + state.reportType + '-' + todayValue() + '.csv';
  document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
  toast('Report exported as CSV.');
}

function printReport() {
  if (!requirePermission('reports.view')) return;
  if (!window.crypto || !window.crypto.getRandomValues) { toast('Secure document ID generation is unavailable in this browser.', 'error'); return; }
  const random = new Uint8Array(8); window.crypto.getRandomValues(random);
  const verificationId = 'LPP-RPT-' + new Date().getFullYear() + '-' + Array.from(random, (item) => item.toString(16).padStart(2, '0')).join('').toUpperCase();
  const root = $('#printRoot'); if (!root) { toast('Print area is unavailable.', 'error'); return; }
  const headers = reportHeaders(); const rows = filteredReportData();
  const title = (REPORT_TYPES.find((item) => item[0] === state.reportType) || REPORT_TYPES[0])[1];
  root.innerHTML = '<section class="print-sheet report-print"><header><img src="assets/brand-logo.jpg" alt=""><div><h1>' + esc(title) + ' report</h1><p>' + esc(data.settings.orgName || '') + ' · Generated ' + esc(fmtDate(new Date())) + '</p></div></header>' +
    '<p class="report-print-range">Period: ' + esc(state.reportStart || 'All time') + ' to ' + esc(state.reportEnd || 'Today') + '</p>' + reportSummaryHTML() + reportTableHTML(headers, rows) +
    '<div class="rs-verification"><span>Document verification ID</span><strong>' + esc(verificationId) + '</strong></div></section>';
  const clear = () => { root.innerHTML = ''; };
  window.addEventListener('afterprint', clear, { once: true });
  setTimeout(() => { window.print(); setTimeout(clear, 1200); }, 60);
}

function dashboardOpsWidgets() {
  const today = S.parseDate(todayValue());
  const dueSoon = S.decoratedSales(data).filter((sale) => sale.balance > 0 && sale.dueDate >= todayValue() && sale.dueDate <= S.dateOnly(new Date(today.getTime() + 14 * 86400000))).length;
  const dueTasks = (data.tasks || []).filter((task) => task.status !== 'Done' && task.dueDate && task.dueDate <= todayValue())
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate))).slice(0, 4);
  const dueLeads = (data.leads || []).filter((lead) => !['Lost', 'Converted'].includes(lead.status) && lead.followUpDate && lead.followUpDate <= todayValue())
    .sort((a, b) => String(a.followUpDate).localeCompare(String(b.followUpDate))).slice(0, 4);
  const topExpenses = (data.expenses || []).reduce((groups, expense) => {
    const category = expense.category || 'Other'; groups[category] = (groups[category] || 0) + Number(expense.amount || 0); return groups;
  }, {});
  const expenseRows = Object.entries(topExpenses).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const taskContent = dueTasks.length
    ? '<div class="ops-mini-list">' + dueTasks.map((task) => '<div><span class="ops-mini-icon">' + icon('calendar', 13) + '</span><span class="ops-mini-copy"><strong>' + esc(task.title) + '</strong><small>' + esc(operationDate(task.dueDate)) + ' · ' + esc(task.priority) + '</small></span><button class="mini-btn" type="button" data-action="complete-task" data-task-id="' + esc(task.id) + '" aria-label="Complete task">' + icon('check', 13) + '</button></div>').join('') + '</div>'
    : '<div class="ops-empty">No tasks due. <a href="/admin/tasks">Open task list</a></div>';
  const leadContent = dueLeads.length
    ? '<div class="ops-mini-list">' + dueLeads.map((lead) => '<div><span class="ops-mini-icon">' + icon('user', 13) + '</span><span class="ops-mini-copy"><strong>' + esc(lead.name) + '</strong><small>' + esc(lead.phone || lead.status) + ' · ' + esc(operationDate(lead.followUpDate)) + '</small></span>' + (can('leads.manage') ? '<button class="mini-btn" type="button" data-action="edit-lead" data-lead-id="' + esc(lead.id) + '" aria-label="Edit lead">' + icon('chevronRight', 13) + '</button>' : '') + '</div>').join('') + '</div>'
    : '<div class="ops-empty">No lead follow-ups due. <a href="/admin/leads">Open leads</a></div>';
  const expenseContent = expenseRows.length
    ? '<div class="ops-expense-list">' + expenseRows.map(([name, amount]) => '<div><span>' + esc(name) + '</span><strong>' + accountingMoney(amount) + '</strong></div>').join('') + '</div>'
    : '<div class="ops-empty">No expenses recorded. <a href="/admin/accounting">Open accounting</a></div>';
  const tasksCount = (data.tasks || []).filter((task) => task.status !== 'Done').length;
  const leadsCount = (data.leads || []).filter((lead) => !['Converted', 'Lost'].includes(lead.status)).length;
  const issuesCount = (data.maintenance || []).filter((item) => item.status !== 'Resolved').length;
  return '<div class="ops-summary-strip"><a href="/admin/tasks"><span>' + icon('calendar', 14) + ' Open tasks</span><strong>' + tasksCount + '</strong></a><a href="/admin/leads"><span>' + icon('user', 14) + ' Active leads</span><strong>' + leadsCount + '</strong></a><a href="/admin/sales"><span>' + icon('clock', 14) + ' Payments due in 14 days</span><strong>' + dueSoon + '</strong></a><a href="/admin/maintenance"><span>' + icon('alert', 14) + ' Open site issues</span><strong>' + issuesCount + '</strong></a><a href="/admin/documents"><span>' + icon('file', 14) + ' Estate documents</span><strong>' + (data.estateDocuments || []).length + '</strong></a></div>' +
    '<div class="ops-widget-grid"><section class="card ops-widget"><div class="card-head"><div><h3>Tasks due</h3><p>Reminders that need follow-up</p></div><a class="btn-link" href="/admin/tasks">All tasks ' + icon('arrowRight', 12) + '</a></div>' + taskContent + '</section>' +
    '<section class="card ops-widget"><div class="card-head"><div><h3>Lead follow-ups</h3><p>Prospects due to contact</p></div><a class="btn-link" href="/admin/leads">All leads ' + icon('arrowRight', 12) + '</a></div>' + leadContent + '</section>' +
    '<section class="card ops-widget"><div class="card-head"><div><h3>Expenses by category</h3><p>All recorded expenses</p></div><a class="btn-link" href="/admin/accounting">Accounting ' + icon('arrowRight', 12) + '</a></div>' + expenseContent + '</section>' +
    '<section class="card ops-widget"><div class="card-head"><div><h3>Reports &amp; estate care</h3><p>Quick access to operations</p></div></div><div class="ops-shortcuts"><a href="/admin/reports">' + icon('trendUp', 16) + '<span><strong>Business reports</strong><small>Sales, cash and inventory</small></span>' + icon('chevronRight', 14) + '</a><a href="/admin/maintenance">' + icon('settings', 16) + '<span><strong>Maintenance issues</strong><small>Track open site work</small></span>' + icon('chevronRight', 14) + '</a></div></section></div>';
}
