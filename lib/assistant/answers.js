import { TOPIC_DEFINITIONS, humanizeTopic, topicSuggestions } from './intents.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const VISIT_STATUS_LABELS = {
  EXPECTED: 'expected',
  AWAITING_APPROVAL: 'awaiting approval',
  CHECKED_IN: 'checked in',
  CHECKED_OUT: 'checked out',
  CANCELLED: 'cancelled',
  DENIED: 'denied'
};

const ATTENDANCE_STATUS_LABELS = {
  PRESENT: 'present',
  LATE: 'late',
  ABSENT: 'absent',
  REMOTE: 'remote',
  LEAVE: 'on leave'
};

export function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Number(value) || 0);
}

export function formatCount(value, singular, plural) {
  const count = Number(value) || 0;
  return formatNumber(count) + ' ' + (count === 1 ? singular : plural || singular + 's');
}

export function formatMoney(value, currency = 'GHS') {
  const amount = Number(value) || 0;
  const formatted = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  return (currency === 'GHS' ? 'GH₵' : currency) + ' ' + formatted;
}

export function clockTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
}

export function shortWhen(value, now = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const sameDay = date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
  return sameDay
    ? clockTime(date)
    : String(date.getDate()).padStart(2, '0') + ' ' + MONTHS[date.getMonth()] + ' ' + clockTime(date);
}

export function listNames(names) {
  const clean = (names || []).filter(Boolean);
  if (!clean.length) return '';
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return clean[0] + ' and ' + clean[1];
  return clean.slice(0, -1).join(', ') + ' and ' + clean[clean.length - 1];
}

function recordedLabel(label) {
  return label === 'all time' ? 'in total' : label;
}

export function visitorAnswer(snapshot) {
  const lines = [];
  if (snapshot.insideCount) {
    lines.push(formatCount(snapshot.insideCount, 'visitor') + ' on site right now:');
    for (const visit of snapshot.inside) {
      const host = visit.host?.name ? ' — host ' + visit.host.name : '';
      const since = visit.checkedInAt ? ', in since ' + clockTime(visit.checkedInAt) : '';
      lines.push('• ' + (visit.visitor?.fullName || 'Visitor') + host + since);
    }
    if (snapshot.insideCount > snapshot.inside.length) {
      lines.push('…and ' + formatNumber(snapshot.insideCount - snapshot.inside.length) + ' more.');
    }
  } else {
    lines.push('No visitors are on site right now.');
  }

  if (snapshot.awaitingCount) {
    lines.push(formatCount(snapshot.awaitingCount, 'visit') + ' awaiting approval:');
    for (const visit of snapshot.awaiting) {
      const host = visit.host?.name ? ' — host ' + visit.host.name : '';
      lines.push('• ' + (visit.visitor?.fullName || 'Visitor') + host);
    }
    if (snapshot.awaitingCount > snapshot.awaiting.length) {
      lines.push('…and ' + formatNumber(snapshot.awaitingCount - snapshot.awaiting.length) + ' more.');
    }
  }

  if (snapshot.overdueCount) {
    lines.push(formatCount(snapshot.overdueCount, 'visit') + (snapshot.overdueCount === 1 ? ' is' : ' are') + ' past the expected check-out time.');
  }

  lines.push(formatCount(snapshot.rangeTotal, 'visit') + ' recorded ' + recordedLabel(snapshot.label) + '.');

  const breakdown = Object.entries(snapshot.statuses)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => (VISIT_STATUS_LABELS[status] || status.toLowerCase()) + ' ' + formatNumber(count));
  if (breakdown.length) lines.push('Breakdown: ' + breakdown.join(', ') + '.');

  return lines.join('\n');
}

export function staffAnswer(snapshot) {
  const lines = [];
  lines.push(
    'There ' + (snapshot.active === 1 ? 'is' : 'are') + ' ' + formatNumber(snapshot.active) + ' active '
    + (snapshot.active === 1 ? 'staff member' : 'staff members') + ' out of ' + formatNumber(snapshot.total) + ' on record.'
  );
  if (snapshot.departments.length) {
    lines.push('By department: ' + snapshot.departments.map((row) => row.name + ' ' + formatNumber(row.count)).join(', ') + '.');
  }
  if (snapshot.deactivated) lines.push(formatCount(snapshot.deactivated, 'deactivated account') + '.');
  if (snapshot.newHires) lines.push(formatCount(snapshot.newHires, 'new hire') + ' this month.');
  return lines.join('\n');
}

export function attendanceAnswer(snapshot) {
  if (!snapshot.canViewAll) {
    const scope = 'Attendance summaries for all staff require additional access.';
    if (!snapshot.myRecord) return 'You have no attendance record ' + recordedLabel(snapshot.label) + '. ' + scope;
    const status = ATTENDANCE_STATUS_LABELS[snapshot.myRecord.status] || snapshot.myRecord.status.toLowerCase();
    if (snapshot.myRecord.checkInAt && !snapshot.myRecord.checkOutAt) {
      return 'You are clocked in since ' + clockTime(snapshot.myRecord.checkInAt) + ' (' + status + ').';
    }
    if (snapshot.myRecord.checkInAt && snapshot.myRecord.checkOutAt) {
      return 'You were ' + status + ' ' + recordedLabel(snapshot.label) + ': '
        + clockTime(snapshot.myRecord.checkInAt) + '–' + clockTime(snapshot.myRecord.checkOutAt) + '.';
    }
    return 'You are marked ' + status + ' ' + recordedLabel(snapshot.label) + '.';
  }

  const summary = snapshot.summary;
  if (!summary.records) {
    return 'No attendance records were found ' + recordedLabel(snapshot.label) + '. Active staff on record: ' + formatNumber(snapshot.activeStaff) + '.';
  }

  const lines = [];
  if (snapshot.range === 'today' || snapshot.range === 'yesterday') {
    lines.push(
      formatNumber(summary.present) + ' in ' + recordedLabel(snapshot.label)
      + ' (' + formatNumber(summary.late) + ' late), '
      + formatNumber(summary.absent) + ' absent, '
      + formatNumber(summary.leave) + ' on leave.'
    );
    if (summary.onSite) lines.push(formatCount(summary.onSite, 'person', 'people') + ' still clocked in.');
  } else {
    lines.push(
      formatCount(summary.records, 'attendance record') + ' ' + recordedLabel(snapshot.label) + ': '
      + formatNumber(summary.present) + ' present, '
      + formatNumber(summary.late) + ' late, '
      + formatNumber(summary.absent) + ' absent, '
      + formatNumber(summary.leave) + ' on leave.'
    );
  }
  if (snapshot.names.late.length) lines.push('Late: ' + listNames(snapshot.names.late) + '.');
  if (snapshot.names.absent.length) lines.push('Absent: ' + listNames(snapshot.names.absent) + '.');
  lines.push('Active staff on record: ' + formatNumber(snapshot.activeStaff) + '.');
  return lines.join('\n');
}

export function financeAnswer(snapshot) {
  const lines = [
    formatMoney(snapshot.outstanding, snapshot.currency) + ' outstanding across ' + formatCount(snapshot.openInvoices, 'open invoice') + '.',
    recordedLabel(snapshot.label).replace(/^./, (letter) => letter.toUpperCase()) + ': '
      + formatMoney(snapshot.collected, snapshot.currency) + ' collected from ' + formatCount(snapshot.paymentCount, 'payment')
      + '; ' + formatMoney(snapshot.invoiced, snapshot.currency) + ' invoiced (' + formatNumber(snapshot.invoiceCount) + ').',
    formatMoney(snapshot.expenses, snapshot.currency) + ' in expenses recorded (' + formatNumber(snapshot.expenseCount) + ').'
  ];
  if (snapshot.pendingExpenses) {
    lines.push(formatMoney(snapshot.pendingExpenses, snapshot.currency) + ' pending approval across ' + formatCount(snapshot.pendingCount, 'expense') + '.');
  }
  lines.push('Net collected ' + recordedLabel(snapshot.label) + ': ' + formatMoney(snapshot.net, snapshot.currency) + '.');
  return lines.join('\n');
}

export function surveyAnswer(snapshot) {
  const scope = snapshot.scoped ? ' assigned to you' : '';
  const lines = [
    formatNumber(snapshot.activeProjects) + ' active projects (' + formatNumber(snapshot.projectTotal) + ' total), '
      + formatNumber(snapshot.parcels) + ' parcels on record.',
    formatNumber(snapshot.tasks) + ' survey tasks' + scope
      + (snapshot.overdue ? ', ' + formatNumber(snapshot.overdue) + ' overdue' : '')
      + (snapshot.dueSoon ? ', ' + formatNumber(snapshot.dueSoon) + ' due this week' : '') + '.',
    formatNumber(snapshot.pendingReports) + ' field reports awaiting review' + (snapshot.scoped ? ' from you' : '') + '.'
  ];
  if (snapshot.projects.length) lines.push('Active: ' + snapshot.projects.map((project) => project.name).join(', ') + '.');
  return lines.join('\n');
}

export function clientAnswer(snapshot) {
  const lines = [
    formatCount(snapshot.total, 'client') + ' on record, holding '
    + formatCount(snapshot.holdings, 'land holding') + '.'
  ];
  if (snapshot.newClients) {
    lines.push(formatCount(snapshot.newClients, 'new client') + ' ' + recordedLabel(snapshot.label) + '.');
  }
  if (snapshot.linkedReservations) {
    lines.push(formatCount(snapshot.linkedReservations, 'reservation') + ' linked to client files.');
  }
  if (snapshot.regions.length) {
    lines.push('Regions: ' + snapshot.regions.map((region) => region.name + ' ' + formatNumber(region.count)).join(', ') + '.');
  }
  return lines.join('\n');
}

export function pipelineAnswer(snapshot) {
  const pending = snapshot.reservations.PENDING || 0;
  const confirmed = snapshot.reservations.CONFIRMED || 0;
  const completed = snapshot.reservations.COMPLETED || 0;
  const cancelled = snapshot.reservations.CANCELLED || 0;
  const lines = [
    'Reservation pipeline: ' + formatNumber(pending) + ' awaiting payment, '
    + formatNumber(confirmed) + ' confirmed, '
    + formatNumber(completed) + ' completed'
    + (cancelled ? ', ' + formatNumber(cancelled) + ' cancelled' : '') + '.'
  ];
  if (pending) lines.push(formatMoney(snapshot.pendingValue) + ' awaiting payment.');
  lines.push(formatCount(snapshot.newReservations, 'new reservation') + ' ' + recordedLabel(snapshot.label) + '.');
  const newInquiries = snapshot.inquiries.NEW || 0;
  if (newInquiries) lines.push(formatCount(newInquiries, 'new inquiry', 'new inquiries') + ' from the storefront.');
  lines.push(formatCount(snapshot.published, 'published listing') + (snapshot.featured ? ' (' + formatNumber(snapshot.featured) + ' featured)' : '') + '.');
  return lines.join('\n');
}

export function auditAnswer(snapshot, now = new Date()) {
  if (!snapshot.total) return 'No audit events were recorded ' + recordedLabel(snapshot.label) + '.';
  const lines = [formatCount(snapshot.total, 'audit event') + ' ' + recordedLabel(snapshot.label) + '. Latest:'];
  for (const event of snapshot.events) {
    lines.push('• ' + humanizeTopic(event.action) + ' — ' + event.actor + ' · ' + shortWhen(event.createdAt, now));
  }
  return lines.join('\n');
}

export function overviewAnswer(sections) {
  if (!sections.length) {
    return 'Your office role does not include data-view permissions yet. Ask an administrator for access.';
  }
  return ['Live workspace overview:', ...sections.map((section) => '• ' + section.label + ': ' + section.text)].join('\n');
}

export function helpAnswer(user) {
  const suggestions = topicSuggestions(user);
  const capabilities = Object.keys(TOPIC_DEFINITIONS)
    .map((key) => TOPIC_DEFINITIONS[key])
    .filter((def) => !def.permission || (user && user.permissions && user.permissions.includes(def.permission)))
    .map((def) => def.label.toLowerCase());
  const lines = [
    'I query the live office database in read-only mode, limited by your office role.',
    'I can answer questions about ' + listNames(capabilities) + '.'
  ];
  if (suggestions.length) {
    lines.push('Try:');
    for (const suggestion of suggestions.slice(0, 4)) lines.push('• ' + suggestion);
  }
  return lines.join('\n');
}

export function restrictedAnswer(topic) {
  const def = TOPIC_DEFINITIONS[topic];
  return 'Your office role does not include access to ' + (def ? def.label.toLowerCase() : 'that data')
    + '. Ask an administrator if you need it.';
}
