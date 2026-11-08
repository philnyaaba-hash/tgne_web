/* LandLedger — staff complaint tracking */
'use strict';

const COMPLAINT_CATEGORIES = ['Payments', 'Documentation', 'Site / boundary', 'Service', 'Other'];
const COMPLAINT_STATUSES = ['Open', 'In progress', 'Waiting on buyer', 'Resolved', 'Closed'];
const COMPLAINT_PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'];

function complaintBuyerName(complaint) {
  const buyer = S.buyerById(data, complaint.buyerId);
  return buyer ? buyer.name : 'Unknown buyer';
}

function filteredComplaints() {
  const query = String(state.complaintQuery || '').trim().toLowerCase();
  return (data.complaints || [])
    .filter((complaint) => {
      const matchesQuery = !query || [
        complaint.subject,
        complaint.description,
        complaint.category,
        complaintBuyerName(complaint),
        complaint.assigneeName
      ].join(' ').toLowerCase().includes(query);
      return matchesQuery && (state.complaintStatus === 'all' || complaint.status === state.complaintStatus);
    })
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
}

function complaintRowsHTML(complaints) {
  if (!complaints.length) {
    return ['<tr><td colspan="6"><div class="staff-empty"><strong>No complaints found</strong><span>Log a buyer concern or change your filters.</span></div></td></tr>'];
  }
  return complaints.map((complaint) =>
    '<tr><td><span class="cell-copy"><strong>' + esc(complaint.subject) + '</strong><small>' + esc(complaint.category) + '</small></span></td>' +
      '<td>' + esc(complaintBuyerName(complaint)) + '</td>' +
      '<td>' + operationStatusBadge(complaint.status) + '</td>' +
      '<td>' + operationStatusBadge(complaint.priority) + '</td>' +
      '<td>' + esc(complaint.assigneeName || 'Unassigned') + '</td>' +
      '<td><button class="mini-btn" type="button" data-action="view-complaint" data-complaint-id="' + esc(complaint.id) + '" aria-label="View complaint from ' + esc(complaintBuyerName(complaint)) + '" title="' + (can('complaints.manage') ? 'Update complaint' : 'View complaint') + '">' + icon(can('complaints.manage') ? 'edit' : 'chevronRight', 13) + '</button></td></tr>'
  );
}

function viewComplaints() {
  const complaints = filteredComplaints();
  const openCount = (data.complaints || []).filter((item) => !['Resolved', 'Closed'].includes(item.status)).length;
  const urgentCount = (data.complaints || []).filter((item) => item.priority === 'Urgent' && !['Resolved', 'Closed'].includes(item.status)).length;
  const resolvedCount = (data.complaints || []).filter((item) => ['Resolved', 'Closed'].includes(item.status)).length;
  return '<div class="page">' +
    '<div class="page-head"><div><h2>Customer complaints</h2><p>Record buyer concerns, assign follow-up and keep resolution details with the workspace.</p></div>' +
      (can('complaints.manage') ? '<button class="btn btn-primary" type="button" data-action="add-complaint">' + icon('plus', 15) + ' Log complaint</button>' : '') +
    '</div>' +
    '<div class="accounting-kpis">' +
      '<div class="accounting-kpi receivable-kpi"><span class="accounting-kpi-icon">' + icon('message', 15) + '</span><small>Open</small><strong>' + openCount + '</strong><span>Awaiting follow-up or resolution</span></div>' +
      '<div class="accounting-kpi overdue-kpi"><span class="accounting-kpi-icon">' + icon('alert', 15) + '</span><small>Urgent</small><strong>' + urgentCount + '</strong><span>Open urgent complaints</span></div>' +
      '<div class="accounting-kpi income-kpi"><span class="accounting-kpi-icon">' + icon('checkCircle', 15) + '</span><small>Resolved</small><strong>' + resolvedCount + '</strong><span>Closed or resolved records</span></div>' +
    '</div>' +
    '<div class="toolbar operation-toolbar"><label class="search-field"><span>' + icon('search', 14) + '</span><input id="complaintSearch" type="search" value="' + esc(state.complaintQuery) + '" placeholder="Search buyer, subject or category…" aria-label="Search complaints"></label>' +
      '<select id="complaintStatusFilter" aria-label="Filter complaints by status"><option value="all">All statuses</option>' + COMPLAINT_STATUSES.map((status) => '<option value="' + esc(status) + '"' + (state.complaintStatus === status ? ' selected' : '') + '>' + esc(status) + '</option>').join('') + '</select>' +
      '<span class="result-count">' + complaints.length + ' complaint' + (complaints.length === 1 ? '' : 's') + '</span></div>' +
    operationTable('Complaint register', 'Use each record to review the issue, owner and current resolution status.', ['Subject', 'Buyer', 'Status', 'Priority', 'Assigned to', ''], complaintRowsHTML(complaints), 'No complaints found', 'Log a buyer concern or change your filters.') +
    '</div>';
}

function updateComplaintsResults() {
  if (state.route !== 'complaints') return;
  const body = $('#view .operation-table tbody');
  if (!body) return;
  const complaints = filteredComplaints();
  body.innerHTML = complaintRowsHTML(complaints).join('');
  const count = $('#view .operation-toolbar .result-count');
  if (count) count.textContent = complaints.length + ' complaint' + (complaints.length === 1 ? '' : 's');
}

function complaintDetailsHTML(complaint) {
  return '<div class="detail-grid">' +
    '<div class="detail-cell"><small>Buyer</small><strong>' + esc(complaintBuyerName(complaint)) + '</strong></div>' +
    '<div class="detail-cell"><small>Category</small><strong>' + esc(complaint.category) + '</strong></div>' +
    '<div class="detail-cell"><small>Status</small><strong>' + esc(complaint.status) + '</strong></div>' +
    '<div class="detail-cell"><small>Priority</small><strong>' + esc(complaint.priority) + '</strong></div>' +
    '<div class="detail-cell"><small>Assigned to</small><strong>' + esc(complaint.assigneeName || 'Unassigned') + '</strong></div>' +
    '<div class="detail-cell"><small>Last updated</small><strong>' + esc(fmtDate(complaint.updatedAt || complaint.createdAt)) + '</strong></div>' +
    '<div class="detail-cell profile-fact-wide"><small>Description</small><strong style="white-space:pre-wrap">' + esc(complaint.description) + '</strong></div>' +
    (complaint.resolution ? '<div class="detail-cell profile-fact-wide"><small>Resolution / next step</small><strong style="white-space:pre-wrap">' + esc(complaint.resolution) + '</strong></div>' : '') +
    '</div>';
}

function openComplaintForm(complaintId, presetBuyerId) {
  const complaint = complaintId ? (data.complaints || []).find((item) => item.id === complaintId) : null;
  if (complaintId && !complaint) { toast('Complaint not found.', 'error'); return; }
  if (!can('complaints.manage')) {
    if (!complaint || !can('complaints.view')) { toast('Your role does not have access to this complaint.', 'warn'); return; }
    openModal({ title: complaint.subject, subtitle: 'Complaint · ' + fmtDate(complaint.createdAt), size: 'wide', body: complaintDetailsHTML(complaint), footer: '<button type="button" class="btn btn-ghost" data-action="close-modal">Close</button>' });
    return;
  }

  const item = complaint || {
    buyerId: presetBuyerId || '',
    subject: '',
    category: COMPLAINT_CATEGORIES[0],
    description: '',
    status: 'Open',
    priority: 'Normal',
    assigneeId: '',
    assigneeName: '',
    resolution: ''
  };
  const buyers = data.buyers.slice().sort((a, b) => a.name.localeCompare(b.name));
  const staff = (data.staff || []).filter((person) => person.status !== 'Inactive').slice().sort((a, b) => a.name.localeCompare(b.name));
  const buyerOptions = buyers.map((buyer) => '<option value="' + esc(buyer.id) + '"' + (item.buyerId === buyer.id ? ' selected' : '') + '>' + esc(buyer.name) + '</option>').join('');
  const staffOptions = staff.map((person) => '<option value="' + esc(person.id) + '"' + (item.assigneeId === person.id ? ' selected' : '') + '>' + esc(person.name) + '</option>').join('');
  openModal({
    title: complaint ? 'Update complaint' : 'Log a complaint',
    subtitle: complaint ? complaint.subject : 'Record the buyer concern and assign a follow-up.',
    size: 'wide',
    body: '<form id="complaint-form" novalidate><input type="hidden" name="complaintId" value="' + esc(complaint ? complaint.id : '') + '">' +
      '<div class="form-grid">' +
        '<div class="field"><label for="complaintBuyer">Buyer <span class="req">*</span></label><select id="complaintBuyer" name="buyerId" required><option value="">Select a buyer</option>' + buyerOptions + '</select><span class="error"></span></div>' +
        '<div class="field"><label for="complaintCategory">Category</label><select id="complaintCategory" name="category">' + COMPLAINT_CATEGORIES.map((category) => '<option value="' + esc(category) + '"' + (item.category === category ? ' selected' : '') + '>' + esc(category) + '</option>').join('') + '</select></div>' +
        '<div class="field full"><label for="complaintSubject">Subject <span class="req">*</span></label><input id="complaintSubject" name="subject" maxlength="120" value="' + esc(item.subject) + '" required><span class="error"></span></div>' +
        '<div class="field full"><label for="complaintDescription">What happened? <span class="req">*</span></label><textarea id="complaintDescription" name="description" rows="4" maxlength="3000" required>' + esc(item.description) + '</textarea><span class="error"></span></div>' +
        '<div class="field"><label for="complaintPriority">Priority</label><select id="complaintPriority" name="priority">' + COMPLAINT_PRIORITIES.map((priority) => '<option value="' + esc(priority) + '"' + (item.priority === priority ? ' selected' : '') + '>' + esc(priority) + '</option>').join('') + '</select></div>' +
        '<div class="field"><label for="complaintStatus">Status</label><select id="complaintStatus" name="status">' + COMPLAINT_STATUSES.map((status) => '<option value="' + esc(status) + '"' + (item.status === status ? ' selected' : '') + '>' + esc(status) + '</option>').join('') + '</select></div>' +
        '<div class="field"><label for="complaintAssignee">Assigned to</label><select id="complaintAssignee" name="assigneeId"><option value="">Unassigned</option>' + staffOptions + '</select></div>' +
        '<div class="field full"><label for="complaintResolution">Resolution / next step</label><textarea id="complaintResolution" name="resolution" rows="3" maxlength="3000">' + esc(item.resolution || '') + '</textarea></div>' +
      '</div></form>' +
      (complaint ? '<div class="accounting-footnote">Created ' + esc(fmtDate(complaint.createdAt)) + (complaint.createdBy ? ' by ' + esc(complaint.createdBy) : '') + '.</div>' : ''),
    footer: '<button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button><button type="submit" form="complaint-form" class="btn btn-primary">' + icon('check', 14) + ' ' + (complaint ? 'Save updates' : 'Save complaint') + '</button>'
  });
}

function saveComplaintFromForm() {
  if (!requirePermission('complaints.manage')) return;
  const form = $('#complaint-form');
  if (!form) { toast('Complaint form is unavailable.', 'error'); return; }
  const values = new FormData(form);
  const buyerId = String(values.get('buyerId') || '');
  const subject = String(values.get('subject') || '').trim();
  const description = String(values.get('description') || '').trim();
  const buyer = S.buyerById(data, buyerId);
  if (!buyer) { toast('Select a buyer before saving the complaint.', 'error'); return; }
  if (!subject || !description) { toast('Enter a subject and describe the complaint.', 'error'); return; }

  const id = String(values.get('complaintId') || '');
  const existing = id ? (data.complaints || []).find((item) => item.id === id) : null;
  if (id && !existing) { toast('Complaint not found.', 'error'); return; }
  const previous = existing ? Object.assign({}, existing) : null;
  const oldActivities = data.activities.slice();
  const now = new Date().toISOString();
  const assigneeId = String(values.get('assigneeId') || '');
  const categoryValue = String(values.get('category') || '');
  const assignee = (data.staff || []).find((person) => person.id === assigneeId);
  const user = Auth.user();
  const next = Object.assign(existing || {
    id: S.uid('cmp-'),
    createdAt: now,
    createdBy: user ? user.name : ''
  }, {
    buyerId,
    subject,
    category: COMPLAINT_CATEGORIES.includes(categoryValue) ? categoryValue : COMPLAINT_CATEGORIES[0],
    description,
    priority: COMPLAINT_PRIORITIES.includes(String(values.get('priority'))) ? String(values.get('priority')) : 'Normal',
    status: COMPLAINT_STATUSES.includes(String(values.get('status'))) ? String(values.get('status')) : 'Open',
    assigneeId,
    assigneeName: assignee ? assignee.name : '',
    resolution: String(values.get('resolution') || '').trim(),
    updatedAt: now,
    updatedBy: user ? user.name : ''
  });
  if (!existing) data.complaints.unshift(next);
  addActivity('complaint', existing ? 'Complaint updated for ' + buyer.name : 'Complaint logged for ' + buyer.name, next.subject + ' · ' + next.status, next.id);
  const saved = S.save(data);
  handleSaveResult(saved);
  if (!saved.ok) {
    data.activities = oldActivities;
    if (existing) Object.assign(existing, previous);
    else data.complaints = data.complaints.filter((item) => item.id !== next.id);
    return;
  }
  closeModal();
  refresh();
  toast(existing ? 'Complaint updated.' : 'Complaint logged.');
}
