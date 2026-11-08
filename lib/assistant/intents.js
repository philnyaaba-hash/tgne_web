export const TOPIC_ORDER = ['visitors', 'attendance', 'finance', 'survey', 'staff', 'audit', 'clients', 'pipeline', 'overview'];

export const TOPIC_DEFINITIONS = {
  visitors: {
    label: 'Visitor operations',
    permission: 'visitors.view',
    suggestions: ['Who is on site right now?', 'How many visitors today?', 'Which visits are awaiting approval?']
  },
  attendance: {
    label: 'Attendance',
    permission: null,
    suggestions: ['Who is in today?', 'Who is late today?', 'Am I clocked in?']
  },
  finance: {
    label: 'Finance desk',
    permission: 'finance.view',
    suggestions: ['What is outstanding?', 'How much did we collect this month?', 'How much is pending in expenses?']
  },
  survey: {
    label: 'Surveying',
    permission: 'field.view',
    suggestions: ['How are the survey projects doing?', 'Any overdue field tasks?']
  },
  staff: {
    label: 'Staff directory',
    permission: 'staff.view',
    suggestions: ['How many staff do we have?', 'Staff by department']
  },
  audit: {
    label: 'Audit history',
    permission: 'audit.view',
    suggestions: ['What changed this week?', 'Show recent audit activity']
  },
  clients: {
    label: 'Client desk',
    permission: 'client.view',
    suggestions: ['How many clients do we have?', 'Any new clients this month?', 'How many holdings are tracked?']
  },
  pipeline: {
    label: 'Land storefront',
    permission: 'land.view',
    suggestions: ['How is the reservation pipeline?', 'Any new reservations this week?', 'How many listings are published?']
  },
  overview: {
    label: 'Workspace overview',
    permission: null,
    suggestions: ['Give me a workspace overview', 'What needs attention today?']
  }
};

const TOPIC_PATTERNS = [
  ['visitors', /\b(visitors?|visits?|guests?|reception|on[- ]?site|inside|checked[- ]?(?:in|out)|check[- ]?(?:in|out)|awaiting approval|hosts?)\b/],
  ['attendance', /\b(attendance|clock(?:ed|ing)?[- ]?(?:in|out)|late|absent|absence|leave|present|remote|shift|on duty|who is in|in today|at work)\b/],
  ['finance', /\b(finance|financial|invoices?|payments?|paid|collect(?:ed|ion)?|outstanding|receivables?|revenue|expenses?|money|cash|income|debt|owed|profit|net)\b/],
  ['clients', /\b(clients?|buyers?|customers?|client base|holdings?|resales?|land services)\b/],
  ['pipeline', /\b(reservations?|reserved|pipeline|inquir(?:y|ies)|storefront|listings?)\b/],
  ['survey', /\b(parcels?|survey(?:ing)?|field reports?|projects?|tasks?|land)\b/],
  ['staff', /\b(staff|employees?|headcount|team|departments?|hired|hires|workforce|personnel)\b/],
  ['audit', /\b(audit|audits|activity|logs?|history|(?:what|who) changed|changes|recent actions)\b/],
  ['overview', /\b(overview|summary|snapshot|dashboard|status|how is|how are|what needs attention|everything)\b/]
];

const HELP_PATTERN = /^(hi|hello|hey|help|what can you do|who are you|how do you work)\b/;

const DEFAULT_RANGE = {
  visitors: 'today',
  attendance: 'today',
  finance: 'month',
  survey: 'all',
  staff: 'all',
  audit: 'week',
  clients: 'month',
  pipeline: 'week',
  overview: 'today',
  help: 'today'
};

export function detectRange(question, topic) {
  const q = String(question || '').toLowerCase();
  if (/\b(all time|overall|ever|total)\b/.test(q)) return 'all';
  if (/\byesterday\b/.test(q)) return 'yesterday';
  if (/\b(today|right now|currently|now|on[- ]?site|inside)\b/.test(q)) return 'today';
  if (/\b(this week|last week|past week|last 7 days|seven days|weekly)\b/.test(q)) return 'week';
  if (/\b(this month|last month|past month|last 30 days|thirty days|monthly)\b/.test(q)) return 'month';
  if (/\b(this year|last year|yearly|annual)\b/.test(q)) return 'year';
  return DEFAULT_RANGE[topic] || 'today';
}

export function parseQuestion(raw) {
  const question = String(raw || '').trim().slice(0, 400);
  const normalized = question.toLowerCase();
  if (!normalized || HELP_PATTERN.test(normalized)) {
    return { question, topic: 'help', range: 'today' };
  }
  const match = TOPIC_PATTERNS.find(([, pattern]) => pattern.test(normalized));
  const topic = match ? match[0] : 'help';
  return { question, topic, range: detectRange(normalized, topic) };
}

export function humanizeTopic(value) {
  return String(value || '').replace(/[._-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function canUseTopic(user, topic) {
  const def = TOPIC_DEFINITIONS[topic];
  if (!def) return false;
  if (!def.permission) return true;
  return Boolean(user && Array.isArray(user.permissions) && user.permissions.includes(def.permission));
}

export function topicSuggestions(user) {
  return TOPIC_ORDER
    .filter((topic) => canUseTopic(user, topic))
    .flatMap((topic) => TOPIC_DEFINITIONS[topic].suggestions)
    .slice(0, 6);
}

export function assistantStatus(user) {
  const permitted = TOPIC_ORDER.filter((topic) => canUseTopic(user, topic));
  const capabilities = permitted.map((topic) => ({ key: topic, label: TOPIC_DEFINITIONS[topic].label }));
  const prompts = {};
  for (const topic of permitted) prompts[topic] = TOPIC_DEFINITIONS[topic].suggestions.slice(0, 3);
  const firstName = String(user && user.name ? user.name : '').trim().split(/\s+/)[0];
  return {
    greeting: 'Hi' + (firstName ? ' ' + firstName : '') + ' — I can query the live office database.',
    capabilities,
    prompts,
    suggestions: topicSuggestions(user)
  };
}
