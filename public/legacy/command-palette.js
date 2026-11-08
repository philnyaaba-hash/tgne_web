/* LandLedger — Command Palette & Keyboard Shortcuts */
'use strict';

const COMMANDS = [
  { id: 'new-sale', title: 'New sale', desc: 'Start a new plot sale', shortcut: '⌘N', action: 'new-sale', icon: 'plus', roles: ['admin', 'manager', 'sales'] },
  { id: 'record-payment', title: 'Record payment', desc: 'Add a payment to a sale', shortcut: '⌘P', action: 'record-payment', icon: 'wallet', roles: ['admin', 'manager', 'sales'] },
  { id: 'go-dashboard', title: 'Go to dashboard', desc: 'Open dashboard view', shortcut: '⌘1', action: 'go-dashboard', icon: 'dashboard', roles: ['admin', 'manager', 'sales', 'viewer'] },
  { id: 'go-map', title: 'Land map', desc: 'View interactive site plan', shortcut: '⌘2', action: 'go-map', icon: 'map', roles: ['admin', 'manager', 'sales', 'viewer'] },
  { id: 'go-plots', title: 'Plots list', desc: 'Manage all plots', shortcut: '⌘3', action: 'go-plots', icon: 'plots', roles: ['admin', 'manager', 'sales', 'viewer'] },
  { id: 'go-sales', title: 'Sales', desc: 'View all sales', shortcut: '⌘4', action: 'go-sales', icon: 'sales', roles: ['admin', 'manager', 'sales', 'viewer'] },
  { id: 'go-receipts', title: 'Receipts', desc: 'Browse receipts & invoices', shortcut: '⌘5', action: 'go-receipts', icon: 'receipts', roles: ['admin', 'manager', 'sales', 'viewer'] },
  { id: 'go-buyers', title: 'Buyers', desc: 'Manage buyer records', shortcut: '⌘6', action: 'go-buyers', icon: 'buyers', roles: ['admin', 'manager', 'sales', 'viewer'] },
  { id: 'go-leads', title: 'Leads', desc: 'Lead pipeline & follow-ups', shortcut: '⌘7', action: 'go-leads', icon: 'user', roles: ['admin', 'manager', 'sales', 'viewer'] },
  { id: 'go-tasks', title: 'Tasks', desc: 'Tasks & reminders', shortcut: '⌘8', action: 'go-tasks', icon: 'calendar', roles: ['admin', 'manager', 'sales', 'viewer'] },
  { id: 'go-reports', title: 'Reports', desc: 'Business reports & exports', shortcut: '⌘9', action: 'go-reports', icon: 'trendUp', roles: ['admin', 'manager', 'sales', 'viewer'] },
  { id: 'go-accounting', title: 'Accounting', desc: 'Cash flow & expenses', shortcut: '⌘0', action: 'go-accounting', icon: 'wallet', roles: ['admin', 'manager', 'sales', 'viewer'] },
  { id: 'go-finance', title: 'Finance overview', desc: 'Double-entry ledger overview', shortcut: '⌘F', action: 'go-finance', icon: 'wallet', roles: ['admin', 'manager'] },
  { id: 'go-staff', title: 'Staff & HRM', desc: 'Team directory & salaries', shortcut: '⌘S', action: 'go-staff', icon: 'user', roles: ['admin', 'manager'] },
  { id: 'go-settings', title: 'Settings', desc: 'Business profile & data tools', shortcut: '⌘,', action: 'go-settings', icon: 'settings', roles: ['admin', 'manager'] },
  { id: 'add-plot', title: 'Add plot', desc: 'Create a new plot', shortcut: '', action: 'add-plot', icon: 'plus', roles: ['admin', 'manager'] },
  { id: 'add-buyer', title: 'Add buyer', desc: 'Create a new buyer record', shortcut: '', action: 'add-buyer', icon: 'plus', roles: ['admin', 'manager', 'sales'] },
  { id: 'add-lead', title: 'Add lead', desc: 'Capture a new enquiry', shortcut: '', action: 'add-lead', icon: 'plus', roles: ['admin', 'manager', 'sales'] },
  { id: 'add-task', title: 'Add task', desc: 'Create a reminder', shortcut: '', action: 'add-task', icon: 'plus', roles: ['admin', 'manager', 'sales'] },
  { id: 'add-expense', title: 'Record expense', desc: 'Log an operating expense', shortcut: '', action: 'add-expense', icon: 'plus', roles: ['admin', 'manager', 'sales'] },
  { id: 'export-data', title: 'Export backup', desc: 'Download JSON backup', shortcut: '', action: 'export-data', icon: 'download', roles: ['admin'] },
  { id: 'import-data', title: 'Import backup', desc: 'Restore from JSON backup', shortcut: '', action: 'import-data', icon: 'upload', roles: ['admin'] },
  { id: 'reset-demo', title: 'Reset demo data', desc: 'Restore sample workspace', shortcut: '', action: 'reset-demo', icon: 'refresh', roles: ['admin'] },
  { id: 'toggle-theme', title: 'Toggle theme', desc: 'Switch light/dark/system', shortcut: 'T', action: 'toggle-theme', icon: 'sparkles', roles: ['admin', 'manager', 'sales', 'viewer'] },
  { id: 'shortcuts', title: 'Keyboard shortcuts', desc: 'Show all shortcuts', shortcut: '?', action: 'shortcuts', icon: 'keyboard', roles: ['admin', 'manager', 'sales', 'viewer'] },
  { id: 'global-search', title: 'Global search', desc: 'Search buyers, plots, receipts', shortcut: '⌘K', action: 'global-search', icon: 'search', roles: ['admin', 'manager', 'sales', 'viewer'] },
];

const SHORTCUTS = [
  { category: 'Navigation', items: [
    { keys: ['⌘', '1'], desc: 'Dashboard' },
    { keys: ['⌘', '2'], desc: 'Land map' },
    { keys: ['⌘', '3'], desc: 'Plots list' },
    { keys: ['⌘', '4'], desc: 'Sales' },
    { keys: ['⌘', '5'], desc: 'Receipts' },
    { keys: ['⌘', '6'], desc: 'Buyers' },
    { keys: ['⌘', '7'], desc: 'Leads' },
    { keys: ['⌘', '8'], desc: 'Tasks' },
    { keys: ['⌘', '9'], desc: 'Reports' },
    { keys: ['⌘', '0'], desc: 'Accounting' },
  ]},
  { category: 'Actions', items: [
    { keys: ['⌘', 'N'], desc: 'New sale' },
    { keys: ['⌘', 'P'], desc: 'Record payment' },
    { keys: ['⌘', 'F'], desc: 'Finance overview' },
    { keys: ['⌘', 'S'], desc: 'Staff & HRM' },
    { keys: ['⌘', ','], desc: 'Settings' },
    { keys: ['T'], desc: 'Toggle theme' },
    { keys: ['?'], desc: 'Show shortcuts' },
    { keys: ['⌘', 'K'], desc: 'Global search / Command palette' },
  ]},
  { category: 'General', items: [
    { keys: ['Esc'], desc: 'Close modal / palette / search' },
    { keys: ['↑', '↓'], desc: 'Navigate lists' },
    { keys: ['Enter'], desc: 'Execute / Select' },
    { keys: ['⌘', 'Click'], desc: 'Open in new tab (links)' },
  ]},
];

let commandPaletteOpen = false;
let highlightedIndex = -1;
let filteredCommands = [];

function getUserRole() {
  const user = Auth && Auth.user ? Auth.user() : null;
  return user ? user.id : null;
}

function filterCommands(query) {
  const role = getUserRole();
  const q = (query || '').toLowerCase().trim();
  return COMMANDS.filter(cmd => {
    if (cmd.roles && !cmd.roles.includes(role)) return false;
    if (!q) return true;
    const hay = (cmd.title + ' ' + cmd.desc + ' ' + (cmd.shortcut || '')).toLowerCase();
    return hay.includes(q);
  });
}

function renderCommandPalette() {
  const list = $('#commandPaletteList');
  if (!list) return;
  if (!filteredCommands.length) {
    list.innerHTML = '<div class="command-palette-empty">No commands match "' + esc($('#commandPaletteInput').value) + '"</div>';
    return;
  }
  list.innerHTML = filteredCommands.map((cmd, idx) => {
    const isHighlighted = idx === highlightedIndex;
    return '<button type="button" class="command-palette-item' + (isHighlighted ? ' highlighted' : '') + '" data-cmd-id="' + esc(cmd.id) + '" data-action="execute-command">' +
      '<span class="cp-icon">' + icon(cmd.icon, 15) + '</span>' +
      '<span class="cp-main">' +
        '<span class="cp-title">' + esc(cmd.title) + '</span>' +
        '<span class="cp-desc">' + esc(cmd.desc) + '</span>' +
      '</span>' +
      (cmd.shortcut ? '<span class="cp-shortcut">' + esc(cmd.shortcut) + '</span>' : '') +
    '</button>';
  }).join('');
}

function openCommandPalette() {
  const palette = $('#commandPalette');
  const input = $('#commandPaletteInput');
  if (!palette || !input) return;
  commandPaletteOpen = true;
  highlightedIndex = -1;
  filteredCommands = filterCommands('');
  palette.hidden = false;
  renderCommandPalette();
  setTimeout(() => input.focus(), 10);
  document.body.classList.add('modal-open');
}

function closeCommandPalette() {
  const palette = $('#commandPalette');
  const input = $('#commandPaletteInput');
  if (!palette) return;
  commandPaletteOpen = false;
  highlightedIndex = -1;
  if (input) input.value = '';
  palette.hidden = true;
  document.body.classList.remove('modal-open');
}

function handleCommandPaletteInput(e) {
  const query = e.target.value;
  filteredCommands = filterCommands(query);
  highlightedIndex = -1;
  renderCommandPalette();
}

function handleCommandPaletteKeydown(e) {
  if (!commandPaletteOpen) return;
  const items = filteredCommands;
  if (!items.length) {
    if (e.key === 'Escape') closeCommandPalette();
    return;
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    highlightedIndex = Math.min(highlightedIndex + 1, items.length - 1);
    renderCommandPalette();
    scrollHighlighted();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    highlightedIndex = Math.max(highlightedIndex - 1, 0);
    renderCommandPalette();
    scrollHighlighted();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (highlightedIndex >= 0) executeCommand(items[highlightedIndex].id);
  } else if (e.key === 'Escape') {
    closeCommandPalette();
  }
}

function scrollHighlighted() {
  const highlighted = $('.command-palette-item.highlighted');
  const list = $('#commandPaletteList');
  if (highlighted && list) {
    const itemTop = highlighted.offsetTop;
    const itemBottom = itemTop + highlighted.offsetHeight;
    const scrollTop = list.scrollTop;
    const listHeight = list.clientHeight;
    if (itemTop < scrollTop) list.scrollTop = itemTop;
    else if (itemBottom > scrollTop + listHeight) list.scrollTop = itemBottom - listHeight;
  }
}

function executeCommand(cmdId) {
  const cmd = COMMANDS.find(c => c.id === cmdId);
  if (!cmd) return;
  closeCommandPalette();
  const el = document.createElement('button');
  el.dataset.action = cmd.action;
  handleAction(cmd.action, el);
}

function openShortcutsSheet() {
  const sheet = $('#shortcutsSheet');
  const body = $('#shortcutsSheetBody');
  if (!sheet || !body) return;
  body.innerHTML = SHORTCUTS.map(cat => {
    return '<div class="shortcuts-category">' +
      '<div class="shortcuts-category-title">' + esc(cat.category) + '</div>' +
      '<div class="shortcuts-row">' + cat.items.map(item =>
        '<div class="shortcut-item">' +
          '<span class="shortcut-keys">' + item.keys.map(k => '<kbd>' + esc(k) + '</kbd>').join('') + '</span>' +
          '<span class="shortcut-desc">' + esc(item.desc) + '</span>' +
        '</div>'
      ).join('') + '</div>' +
    '</div>';
  }).join('');
  sheet.hidden = false;
  document.body.classList.add('modal-open');
}

function closeShortcutsSheet() {
  const sheet = $('#shortcutsSheet');
  if (!sheet) return;
  sheet.hidden = true;
  document.body.classList.remove('modal-open');
}

function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  let next;
  if (current === 'dark') next = prefersDark ? 'system' : 'light';
  else if (current === 'light') next = 'dark';
  else next = prefersDark ? 'light' : 'dark';
  if (next === 'system') {
    html.removeAttribute('data-theme');
  } else {
    html.setAttribute('data-theme', next);
  }
  localStorage.setItem('landledger.theme', next);
  toast('Theme: ' + next.charAt(0).toUpperCase() + next.slice(1));
}

function initTheme() {
  const saved = localStorage.getItem('landledger.theme');
  const html = document.documentElement;
  if (saved && saved !== 'system') {
    html.setAttribute('data-theme', saved);
  } else if (saved === 'system') {
    html.removeAttribute('data-theme');
  }
}

function bindCommandPaletteEvents() {
  const palette = $('#commandPalette');
  const input = $('#commandPaletteInput');
  if (!palette || !input) return;
  palette.addEventListener('click', e => {
    if (e.target.matches('[data-action="close-command-palette"]') || e.target === palette) {
      closeCommandPalette();
    }
  });
  input.addEventListener('input', handleCommandPaletteInput);
  input.addEventListener('keydown', handleCommandPaletteKeydown);
  document.addEventListener('keydown', e => {
    const key = String(e.key || '').toLowerCase();
    if ((e.metaKey || e.ctrlKey) && key === 'k') {
      if (commandPaletteOpen) { closeCommandPalette(); }
      else { e.preventDefault(); openCommandPalette(); }
    }
    if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const active = document.activeElement;
      if (!active || !active.matches('input, textarea, select, [contenteditable]')) {
        e.preventDefault();
        const sheet = $('#shortcutsSheet');
        if (sheet && !sheet.hidden) closeShortcutsSheet();
        else openShortcutsSheet();
      }
    }
    if (key === 't' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const active = document.activeElement;
      if (!active || !active.matches('input, textarea, select, [contenteditable]')) {
        e.preventDefault();
        toggleTheme();
      }
    }
    if ((e.metaKey || e.ctrlKey) && /^[0-9]$/.test(e.key)) {
      const active = document.activeElement;
      if (!active || !active.matches('input, textarea, select, [contenteditable]')) {
        e.preventDefault();
        const routes = ['dashboard', 'map', 'plots', 'sales', 'receipts', 'buyers', 'leads', 'tasks', 'reports', 'accounting'];
        const idx = e.key === '0' ? 9 : parseInt(e.key, 10) - 1;
        if (routes[idx] && canRoute(routes[idx])) go(routes[idx]);
      }
    }
  });
  $('#themeBtn')?.addEventListener('click', toggleTheme);
  $('#shortcutsSheet')?.addEventListener('click', e => {
    if (e.target.matches('[data-action="close-shortcuts"]') || e.target === $('#shortcutsSheet')) {
      closeShortcutsSheet();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  bindCommandPaletteEvents();
});

window.CommandPalette = {
  open: openCommandPalette,
  close: closeCommandPalette,
  toggleTheme,
  initTheme,
};