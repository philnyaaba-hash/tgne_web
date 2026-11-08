/* LandLedger — buyers and settings views */
'use strict';

/* ---------------- Buyers ---------------- */
function filteredBuyers() {
  const query = state.buyersQuery.trim().toLowerCase();
  let list = data.buyers.slice().sort((a, b) => a.name.localeCompare(b.name));
  if (query) list = list.filter((b) => buyerSearchText(b).includes(query));
  return list;
}

function buyerCardHTML(buyer) {
  const sales = salesForBuyer(buyer.id);
  const balance = sales.reduce((sum, sale) => sum + sale.balance, 0);
  const last = sales.slice().sort((a, b) => S.parseDate(b.date) - S.parseDate(a.date))[0];
  const outstanding = sales.reduce((sum, sale) => sum + sale.balance, 0);
  const buyerAriaLabel = 'View ' + esc(buyer.name) + ' — ' + esc(buyer.name) + ' · ' + esc(buyer.business || buyer.phone || 'No business name') + ' · Plots bought ' + sales.length + ' · Outstanding ' + money(outstanding);
  return '<div class="card buyer-card" data-action="view-buyer" data-buyer-id="' + esc(buyer.id) + '" tabindex="0" role="button" aria-label="' + buyerAriaLabel + '">' +
    '<div class="buyer-top">' +
      buyerAvatarHTML(buyer, 'buyer-avatar') +
      '<div class="buyer-id"><strong>' + esc(buyer.name) + '</strong><small>' + esc(buyer.business || buyer.phone || 'No business name') + '</small></div>' +
      (balance > 0 ? '<span class="badge overdue">' + money(balance) + ' due</span>' : '<span class="badge paid">Clear</span>') +
    '</div>' +
    '<div class="buyer-stats">' +
      '<div class="buyer-stat"><small>Plots bought</small><strong>' + sales.length + '</strong></div>' +
      '<div class="buyer-stat"><small>Outstanding</small><strong class="' + (balance > 0 ? 'due' : '') + '">' + money(balance) + '</strong></div>' +
    '</div>' +
    '<div class="buyer-foot"><span>' + (last ? 'Last purchase ' + esc(fmtDate(last.date)) : 'No purchase yet') + '</span>' +
      '<span class="buyer-contact">' +
        '<button type="button" class="mini-btn" data-action="call" data-phone="' + esc(buyer.phone) + '" title="Call ' + esc(buyer.name) + '">' + icon('phone', 12) + '</button>' +
        '<button type="button" class="mini-btn" data-action="sms-buyer" data-buyer-id="' + esc(buyer.id) + '" title="Send SMS">' + icon('message', 12) + '</button>' +
        '<button type="button" class="mini-btn" data-action="whatsapp-buyer" data-buyer-id="' + esc(buyer.id) + '" title="WhatsApp">' + icon('whatsapp', 12) + '</button>' +
      '</span>' +
    '</div>' +
  '</div>';
}

function buyersResultsHTML() {
  const list = filteredBuyers();
  if (!list.length) {
    return '<div class="card empty"><div class="empty-ico">' + icon('buyers') + '</div><h3>No buyers found</h3><p>Try a different search, or add a new buyer record.</p><button type="button" class="btn btn-primary btn-sm" data-action="add-buyer">' + icon('plus') + ' Add buyer</button></div>';
  }
  const pageSize = PAGE_SIZE.buyers;
  const pages = Math.max(1, Math.ceil(list.length / pageSize));
  if (state.buyersPage > pages) state.buyersPage = pages;
  const page = Math.max(1, state.buyersPage);
  const rows = list.slice((page - 1) * pageSize, page * pageSize);
  return '<div class="buyer-grid">' + rows.map(buyerCardHTML).join('') + '</div>' + pagerHTML(list.length, page, pageSize, 'buyers-page');
}

function viewBuyers() {
  const stats = S.stats(data);
  return '<div class="page">' +
    '<div class="page-head"><div><h2>Buyers</h2><p>' + data.buyers.length + ' buyers on record · ' + stats.overdue.length + ' with overdue balances.</p></div>' +
      '<div class="head-actions"><button type="button" class="btn btn-primary" data-action="add-buyer">' + icon('plus', 16) + ' Add buyer</button></div>' +
    '</div>' +
    '<div class="toolbar"><div class="search-field"><span>' + icon('search') + '</span><input type="search" id="buyerSearch" value="' + esc(state.buyersQuery) + '" placeholder="Search name, phone or business…" aria-label="Search buyers"></div><span class="spacer"></span><span class="result-count" id="buyersCount">' + filteredBuyers().length + ' buyers</span></div>' +
    '<div id="buyersResults">' + buyersResultsHTML() + '</div>' +
  '</div>';
}

function updateBuyersResults() {
  const wrap = $('#buyersResults');
  if (wrap) wrap.innerHTML = buyersResultsHTML();
  const count = $('#buyersCount');
  if (count) count.textContent = filteredBuyers().length + ' buyers';
}

/* ---------------- Settings ---------------- */
function storageInfo() {
  const raw = localStorage.getItem(S.KEY) || '';
  const bytes = new Blob([raw]).size;
  return { bytes, pct: Math.min(100, (bytes / (5 * 1024 * 1024)) * 100) };
}
function fmtBytes(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  if (bytes >= 1024) return Math.round(bytes / 1024) + ' KB';
  return bytes + ' B';
}

function slackSettingsHTML() {
  if (!can('settings.edit') || !window.Notify) return '';
  const config = Notify.readConfig();
  const pending = Notify.pending();
  const events = Notify.EVENTS.map(([name, text]) =>
    '<label class="check-field"><input type="checkbox" id="slackEvent-' + name + '"' + (config.events[name] ? ' checked' : '') + '> ' + esc(text) + '</label>'
  ).join('');
  return '<div class="card settings-section"><div class="card-head"><div><h3>Team notifications</h3><p>Post alerts to Slack, email and WhatsApp through your own relay. Recipients will see buyer names and amounts.</p></div></div><div class="card-body">' +
    '<form id="slack-form" novalidate><div class="form-grid">' +
      '<div class="field full"><label for="slackEndpoint">Relay endpoint</label><input id="slackEndpoint" type="url" value="' + esc(config.endpoint) + '" placeholder="http://127.0.0.1:8787/notify"><span class="hint">Run <code>node slack-relay.js</code> for the local relay, or point at your own. Slack, email and WhatsApp credentials stay in the relay\'s .env and are never stored in this app.</span></div>' +
      '<div class="field full"><label for="slackKey">Workspace key</label><input id="slackKey" type="password" autocomplete="off" placeholder="' + (config.key ? 'Saved · leave blank to keep' : 'Shared key from your relay') + '"><span class="hint">Stored in this browser only and excluded from JSON backups.</span></div>' +
      '<div class="field full"><label class="check-field"><input type="checkbox" id="slackEnabled"' + (config.enabled ? ' checked' : '') + '> Enable team alerts</label>' +
        '<span class="hint">Email goes to EMAIL_TO in the relay, or your business email here when that is blank. WhatsApp goes to WHATSAPP_TO.</span>' +
        (pending ? '<span class="hint">' + pending + ' alert' + (pending === 1 ? '' : 's') + ' waiting to send.</span>' : '') + '</div>' +
    '</div>' +
    '<div class="form-grid slack-events">' + events + '</div>' +
    '<div class="form-actions"><button type="button" class="btn btn-ghost btn-sm" data-action="slack-test">' + icon('message', 14) + ' Send test</button><button type="submit" class="btn btn-primary">' + icon('check', 15) + ' Save notifications</button></div>' +
    '</form>' +
  '</div></div>';
}

function viewSettings() {
  const org = data.settings;
  const storage = storageInfo();
  const stats = S.stats(data);
  const user = Auth.user();
  return '<div class="page">' +
    '<div class="page-head"><div><h2>Settings</h2><p>Your business details, data and workspace preferences.</p></div></div>' +
    '<div class="settings-grid">' +
      '<div>' +
        '<div class="card settings-section"><div class="card-head"><div><h3>Business profile</h3><p>These details appear on receipts, invoices and the sidebar.</p></div></div><div class="card-body">' +
          '<form id="settings-form" novalidate><div class="form-grid">' +
            '<div class="field full"><label for="setOrgName">Business name</label><input id="setOrgName" name="orgName" value="' + esc(org.orgName) + '" required></div>' +
            '<div class="field"><label for="setOwner">Owner / manager</label><input id="setOwner" name="ownerName" value="' + esc(org.ownerName || '') + '" placeholder="First name"></div>' +
            '<div class="field"><label for="setPhone">Phone number</label><input id="setPhone" name="phone" value="' + esc(org.phone) + '" placeholder="024 000 0000"></div>' +
            '<div class="field"><label for="setEmail">Email address</label><input id="setEmail" name="email" type="email" value="' + esc(org.email) + '" placeholder="hello@example.com"></div>' +
            '<div class="field"><label for="setSite">Site / estate name</label><input id="setSite" name="siteName" value="' + esc(org.siteName || '') + '" placeholder="Asante Ridge Estates"></div>' +
            '<div class="field full"><label for="setAddress">Business address</label><input id="setAddress" name="address" value="' + esc(org.address) + '"></div>' +
            '<div class="field"><label for="setLat">Map latitude</label><input id="setLat" name="lat" type="number" step="0.000001" value="' + esc(org.lat) + '"><span class="hint">Used for plot location links.</span></div>' +
            '<div class="field"><label for="setLng">Map longitude</label><input id="setLng" name="lng" type="number" step="0.000001" value="' + esc(org.lng) + '"><span class="hint">Used for plot location links.</span></div>' +
          '</div><div class="form-actions"><button type="submit" class="btn btn-primary">' + icon('check', 15) + ' Save changes</button></div></form>' +
        '</div></div>' +
        '<div class="card settings-section"><div class="card-head"><div><h3>Your data</h3><p>Back up, restore or start fresh. Data is stored in this browser.</p></div></div><div class="card-body">' +
          '<div class="data-row"><div><strong>Storage used</strong><small>' + fmtBytes(storage.bytes) + ' of about 5 MB</small><div class="storage-bar"><i style="width:' + Math.max(1, storage.pct).toFixed(1) + '%"></i></div></div><span class="badge info">Local</span></div>' +
          (can('data.export') ? '<div class="data-row"><div><strong>Export backup</strong><small>Download all plots, buyers, sales and payments as JSON.</small></div><button type="button" class="btn btn-ghost btn-sm" data-action="export-data">' + icon('download', 14) + ' Export</button></div>' : '') +
          (can('data.import') ? '<div class="data-row"><div><strong>Import backup</strong><small>Replace this workspace with a previous JSON backup.</small></div><button type="button" class="btn btn-ghost btn-sm" data-action="import-data">' + icon('upload', 14) + ' Import</button><input type="file" id="importFile" accept="application/json,.json" hidden></div>' : '') +
          '<div class="data-row"><div><strong>Demo data</strong><small>' + stats.totalPlots + ' plots · ' + data.buyers.length + ' buyers · ' + data.sales.length + ' sales</small></div><span class="badge neutral">Sample workspace</span></div>' +
        '</div></div>' +
        slackSettingsHTML() +
      '</div>' +
      '<div class="settings-side">' +
        '<div class="card"><div class="card-head"><div><h3>Access level</h3><p>Signed in as ' + esc(user ? user.name : 'a team member') + '.</p></div></div><div class="card-body"><div class="about-list">' +
          '<div class="about-item">' + icon('shield') + '<span><strong style="display:block;color:var(--ink-2)">' + esc(user ? user.label : 'Guest') + '</strong>' + esc(user ? user.summary : 'Sign in to see your role permissions.') + '</span></div>' +
          '<div class="about-item">' + icon('checkCircle') + '<span>' + (can('*') ? 'Full access to every workspace tool.' : 'Actions outside your role are hidden automatically.') + '</span></div>' +
        '</div></div></div>' +
        '<div class="card"><div class="card-head"><div><h3>About this workspace</h3><p>Built for land businesses in Ghana.</p></div></div><div class="card-body"><div class="about-list">' +
          '<div class="about-item">' + icon('checkCircle') + '<span>Know every plot, buyer and cedi in one place.</span></div>' +
          '<div class="about-item">' + icon('checkCircle') + '<span>Issue receipts and invoices automatically on every sale.</span></div>' +
          '<div class="about-item">' + icon('checkCircle') + '<span>Track part payments and send SMS reminders.</span></div>' +
          '<div class="about-item">' + icon('checkCircle') + '<span>Attach IDs and documents to each sale.</span></div>' +
          '<div class="about-item">' + icon('shield') + '<span>No cloud account needed. Your records stay in this browser.</span></div>' +
        '</div></div></div>' +
        '<div class="card danger-zone"><div class="card-head"><div><h3>Danger zone</h3><p>Reset the workspace back to demo data.</p></div></div><div class="card-body"><p style="font-size:11px;color:var(--muted);line-height:1.55;margin-bottom:12px">This removes all changes you have made on this device. Export a backup first if you want to keep your records.</p><button type="button" class="btn btn-danger btn-sm" data-action="reset-demo">' + icon('refresh', 14) + ' Reset demo data</button></div></div>' +
        '<div class="card"><div class="card-body" style="font-size:10px;color:var(--muted);line-height:1.6"><strong style="color:var(--ink-2);display:block;margin-bottom:4px">Land management system · v1.0</strong>A local-first land management system. Built with vanilla JavaScript, no build step and no external services.</div></div>' +
      '</div>' +
    '</div>' +
  '</div>';
}
