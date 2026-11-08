/* Staff directory and HRM */
'use strict';

const STAFF_STATUSES = ['Active', 'On leave', 'Inactive'];
const STAFF_DEPARTMENTS = ['Administration', 'Finance', 'HR', 'Legal', 'Operations', 'Sales', 'Other'];

function filteredStaff() {
  const query = state.staffQuery.trim().toLowerCase();
  return (data.staff || []).filter((person) => {
    const matchesQuery = !query || [
      person.name, person.jobTitle, person.department, person.phone, person.email
    ].join(' ').toLowerCase().includes(query);
    return matchesQuery && (state.staffStatus === 'all' || person.status === state.staffStatus);
  }).sort((a, b) => a.name.localeCompare(b.name));
}

function staffStatusBadge(status) {
  const type = status === 'Active' ? 'paid' : status === 'On leave' ? 'partial' : 'neutral';
  return '<span class="badge ' + type + '">' + esc(status) + '</span>';
}

function staffTableHTML(people) {
  if (!people.length) {
    return '<tr><td colspan="6"><div class="staff-empty"><strong>No staff records found</strong><span>Add a team member or adjust your search and status filter.</span></div></td></tr>';
  }
  return people.map((person) =>
    '<tr>' +
      '<td><div class="cell-main"><span class="cell-avatar">' + esc(initials(person.name)) + '</span><span class="cell-copy"><strong>' + esc(person.name) + '</strong><small>' + esc(person.jobTitle) + '</small></span></div></td>' +
      '<td>' + esc(person.department) + '</td>' +
      '<td><span class="cell-copy"><strong>' + esc(person.phone || '—') + '</strong><small>' + esc(person.email || 'No email') + '</small></span></td>' +
      '<td>' + staffStatusBadge(person.status) + '</td>' +
      '<td class="num">' + accountingMoney(person.monthlySalary) + '</td>' +
      '<td><div class="row-actions"><button type="button" class="mini-btn" data-action="edit-staff" data-staff-id="' + esc(person.id) + '" aria-label="Edit ' + esc(person.name) + '" title="Edit staff member">' + icon('edit', 13) + '</button><button type="button" class="mini-btn" data-action="delete-staff" data-staff-id="' + esc(person.id) + '" aria-label="Delete ' + esc(person.name) + '" title="Delete staff member">' + icon('trash', 13) + '</button></div></td>' +
    '</tr>'
  ).join('');
}

function viewStaff() {
  const people = filteredStaff();
  const active = (data.staff || []).filter((person) => person.status === 'Active');
  const onLeave = (data.staff || []).filter((person) => person.status === 'On leave').length;
  const monthlyPayroll = active.reduce((sum, person) => sum + Number(person.monthlySalary || 0), 0);
  return '<div class="page staff-page">' +
    '<div class="page-head"><div><h2>Staff &amp; HRM</h2><p>Manage your team directory, employment status and monthly salary records.</p></div>' +
      (can('staff.manage') ? '<div class="head-actions"><button type="button" class="btn btn-primary" data-action="add-staff">' + icon('plus', 16) + ' Add staff member</button></div>' : '') +
    '</div>' +
    '<div class="accounting-kpis staff-kpis">' +
      '<div class="accounting-kpi net-kpi"><span class="accounting-kpi-icon">' + icon('user', 16) + '</span><small>Team members</small><strong>' + (data.staff || []).length + '</strong><span>All staff records</span></div>' +
      '<div class="accounting-kpi income-kpi"><span class="accounting-kpi-icon">' + icon('checkCircle', 16) + '</span><small>Active staff</small><strong>' + active.length + '</strong><span>Currently active</span></div>' +
      '<div class="accounting-kpi receivable-kpi"><span class="accounting-kpi-icon">' + icon('calendar', 16) + '</span><small>On leave</small><strong>' + onLeave + '</strong><span>Staff marked on leave</span></div>' +
      '<div class="accounting-kpi expense-kpi"><span class="accounting-kpi-icon">' + icon('banknote', 16) + '</span><small>Monthly salaries</small><strong>' + accountingMoney(monthlyPayroll) + '</strong><span>Active staff records</span></div>' +
    '</div>' +
    '<div class="card staff-card"><div class="card-head"><div><h3>Staff directory</h3><p>Employment and contact information is visible to HR-authorized roles.</p></div>' +
      '<div class="staff-filters"><label class="staff-search"><span data-icon="search"></span><input id="staffSearch" type="search" value="' + esc(state.staffQuery) + '" placeholder="Search staff…" aria-label="Search staff"></label>' +
      '<select id="staffStatus" aria-label="Filter staff by status"><option value="all"' + (state.staffStatus === 'all' ? ' selected' : '') + '>All statuses</option>' + STAFF_STATUSES.map((status) => '<option value="' + esc(status) + '"' + (state.staffStatus === status ? ' selected' : '') + '>' + esc(status) + '</option>').join('') + '</select></div>' +
    '</div><div class="table-wrap"><table class="data staff-table"><thead><tr><th>Staff member</th><th>Department</th><th>Contact</th><th>Status</th><th class="num">Monthly salary</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody id="staffRows">' + staffTableHTML(people) + '</tbody></table></div>' +
    '<div class="staff-privacy">' + icon('shield', 14) + '<span>Salary and staff records are stored in this browser and available only to administrator and manager roles.</span></div></div>' +
  '</div>';
}

function updateStaffResults() {
  const rows = $('#staffRows');
  if (rows) rows.innerHTML = staffTableHTML(filteredStaff());
}

function openStaffForm(staffId) {
  if (!requirePermission('staff.manage')) return;
  const person = staffId ? (data.staff || []).find((item) => item.id === staffId) : null;
  if (staffId && !person) { toast('Staff record not found.', 'error'); return; }
  const member = person || {
    name: '', jobTitle: '', department: 'Operations', phone: '', email: '',
    status: 'Active', startDate: todayValue(), monthlySalary: '', emergencyContact: '', notes: ''
  };
  openModal({
    title: person ? 'Edit staff member' : 'Add staff member',
    subtitle: 'Keep employment and contact records up to date.',
    size: 'wide',
    body: '<form id="staff-form" novalidate><input type="hidden" name="staffId" value="' + esc(member.id || '') + '"><div class="form-grid">' +
      '<div class="field"><label for="staffName">Full name <span class="req">*</span></label><input id="staffName" name="name" value="' + esc(member.name) + '" autocomplete="name" autofocus><span class="error"></span></div>' +
      '<div class="field"><label for="staffJobTitle">Job title <span class="req">*</span></label><input id="staffJobTitle" name="jobTitle" value="' + esc(member.jobTitle) + '" placeholder="Operations coordinator"><span class="error"></span></div>' +
      '<div class="field"><label for="staffDepartment">Department</label><select id="staffDepartment" name="department">' + STAFF_DEPARTMENTS.map((department) => '<option value="' + esc(department) + '"' + (member.department === department ? ' selected' : '') + '>' + esc(department) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="staffPhone">Phone number</label><input id="staffPhone" name="phone" type="tel" value="' + esc(member.phone) + '" autocomplete="tel"></div>' +
      '<div class="field"><label for="staffEmail">Email address</label><input id="staffEmail" name="email" type="email" value="' + esc(member.email) + '" autocomplete="email"><span class="error"></span></div>' +
      '<div class="field"><label for="staffStatusForm">Employment status</label><select id="staffStatusForm" name="status">' + STAFF_STATUSES.map((status) => '<option value="' + esc(status) + '"' + (member.status === status ? ' selected' : '') + '>' + esc(status) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="staffStartDate">Start date</label><input id="staffStartDate" name="startDate" type="date" value="' + esc(member.startDate || '') + '"></div>' +
      '<div class="field"><label for="staffSalary">Monthly salary (GH₵)</label><input id="staffSalary" name="monthlySalary" type="number" min="0" step="0.01" value="' + esc(member.monthlySalary == null ? '' : member.monthlySalary) + '" placeholder="0.00"><span class="error"></span></div>' +
      '<div class="field full"><label for="staffEmergencyContact">Emergency contact</label><input id="staffEmergencyContact" name="emergencyContact" value="' + esc(member.emergencyContact) + '" placeholder="Contact name and phone number"></div>' +
      '<div class="field full"><label for="staffNotes">HR notes</label><textarea id="staffNotes" name="notes" placeholder="Optional internal notes…">' + esc(member.notes) + '</textarea></div>' +
    '</div></form>',
    footer: '<button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button><button type="submit" form="staff-form" class="btn btn-primary">' + icon('check', 15) + (person ? ' Save changes' : ' Save staff member') + '</button>'
  });
}

function saveStaffFromForm() {
  if (!requirePermission('staff.manage')) return;
  const form = $('#staff-form');
  if (!form) { toast('Staff form is unavailable.', 'error'); return; }
  clearFieldErrors(form);
  const values = new FormData(form);
  const name = String(values.get('name') || '').trim();
  const jobTitle = String(values.get('jobTitle') || '').trim();
  const email = String(values.get('email') || '').trim();
  const salaryValue = String(values.get('monthlySalary') || '').trim();
  const monthlySalary = salaryValue === '' ? 0 : Number(salaryValue);
  let valid = true;
  const nameInput = $('#staffName');
  const jobInput = $('#staffJobTitle');
  if (!name) { fieldError(nameInput, 'Enter the staff member’s name.'); valid = false; }
  if (!jobTitle) { fieldError(jobInput, 'Enter a job title.'); valid = false; }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldError($('#staffEmail'), 'Enter a valid email address.'); valid = false;
  }
  if (!Number.isFinite(monthlySalary) || monthlySalary < 0) {
    fieldError($('#staffSalary'), 'Enter a valid non-negative salary.'); valid = false;
  }
  if (!valid) return;

  const id = String(values.get('staffId') || '');
  const payload = {
    name,
    jobTitle,
    department: String(values.get('department') || 'Other'),
    phone: String(values.get('phone') || '').trim(),
    email,
    status: STAFF_STATUSES.includes(String(values.get('status'))) ? String(values.get('status')) : 'Active',
    startDate: String(values.get('startDate') || ''),
    monthlySalary,
    emergencyContact: String(values.get('emergencyContact') || '').trim(),
    notes: String(values.get('notes') || '').trim(),
    updatedAt: new Date().toISOString()
  };
  if (!Array.isArray(data.staff)) data.staff = [];
  const previousStaff = data.staff.slice();
  let member;
  let previousMember = null;
  if (id) {
    member = data.staff.find((item) => item.id === id);
    if (!member) { toast('Staff record not found.', 'error'); return; }
    previousMember = Object.assign({}, member);
    Object.assign(member, payload);
  } else {
    member = Object.assign({ id: S.uid('staff-'), createdAt: new Date().toISOString() }, payload);
    data.staff.push(member);
  }
  const result = S.save(data);
  handleSaveResult(result);
  if (!result.ok) {
    if (member && previousMember) Object.assign(member, previousMember);
    data.staff = previousStaff;
    return;
  }
  closeModal();
  refresh();
  toast(id ? 'Staff record updated.' : 'Staff member added.');
}

function deleteStaff(staffId) {
  if (!requirePermission('staff.manage')) return;
  const member = (data.staff || []).find((person) => person.id === staffId);
  if (!member) { toast('Staff record not found.', 'error'); return; }
  confirmAction({
    title: 'Delete this staff record?',
    message: 'Remove ' + member.name + ' from the HRM directory? This cannot be undone.',
    confirmText: 'Delete staff record'
  }).then((ok) => {
    if (!ok) return;
    const previous = data.staff;
    data.staff = previous.filter((person) => person.id !== staffId);
    const result = S.save(data);
    handleSaveResult(result);
    if (!result.ok) {
      data.staff = previous;
      return;
    }
    refresh();
    toast('Staff record deleted.');
  });
}
