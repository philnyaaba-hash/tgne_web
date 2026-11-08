/* LandLedger — dashboard view */
'use strict';

function collectionsByMonth() {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: d.getFullYear() + '-' + S.pad(d.getMonth() + 1, 2),
      label: d.toLocaleDateString('en-GB', { month: 'short' }),
      total: 0
    });
  }
  data.payments.forEach((payment) => {
    const d = S.parseDate(payment.date);
    const key = d.getFullYear() + '-' + S.pad(d.getMonth() + 1, 2);
    const month = months.find((m) => m.key === key);
    if (month) month.total += Number(payment.amount) || 0;
  });
  return months;
}

function collectionsChartHTML() {
  const months = collectionsByMonth();
  const width = 640;
  const height = 210;
  const padL = 42;
  const padR = 12;
  const padT = 16;
  const padB = 30;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const max = Math.max(1, ...months.map((m) => m.total));
  const stepX = months.length > 1 ? plotW / (months.length - 1) : plotW;
  const points = months.map((m, i) => ({
    x: padL + i * stepX,
    y: padT + plotH - (m.total / max) * plotH,
    ...m
  }));
  const line = points.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' ');
  const area = line + ' L' + points[points.length - 1].x.toFixed(1) + ' ' + (padT + plotH) + ' L' + points[0].x.toFixed(1) + ' ' + (padT + plotH) + ' Z';
  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((f) => {
      const y = padT + plotH - f * plotH;
      return '<line x1="' + padL + '" y1="' + y + '" x2="' + (width - padR) + '" y2="' + y + '" stroke="#e8eee9" stroke-width="1"/>' +
        '<text x="' + (padL - 8) + '" y="' + (y + 3) + '" text-anchor="end" fill="#93a39a" font-size="9">' + (f === 0 ? '0' : moneyCompact(max * f).replace('GH₵ ', '')) + '</text>';
    })
    .join('');
  const dots = points
    .map((p) => '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="3.4" fill="#fff" stroke="#149b52" stroke-width="2"><title>' + esc(p.label) + ': ' + money(p.total) + '</title></circle>')
    .join('');
  const labels = points
    .map((p) => '<text x="' + p.x.toFixed(1) + '" y="' + (height - 8) + '" text-anchor="middle" fill="#93a39a" font-size="9.5">' + esc(p.label) + '</text>')
    .join('');
  const total = months.reduce((sum, m) => sum + m.total, 0);
  return {
    total,
    html: '<div class="chart-summary"><strong>' + money(total) + '</strong><span>collected in the last 6 months</span></div>' +
      '<div class="chart-wrap"><svg class="chart-svg" viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="none" role="img" aria-label="Collections over the last six months">' +
      '<defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#149b52" stop-opacity=".22"/><stop offset="100%" stop-color="#149b52" stop-opacity="0"/></linearGradient></defs>' +
      grid +
      '<path d="' + area + '" fill="url(#chartFill)"/>' +
      '<path d="' + line + '" fill="none" stroke="#149b52" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
      dots + labels +
      '</svg></div>' +
      '<div class="chart-legend"><span><i></i>Payments received</span><span style="margin-left:auto">' + months.length + ' month view</span></div>'
  };
}

function donutHTML(stats) {
  const total = Math.max(1, stats.totalPlots);
  const soldPct = (stats.sold / total) * 100;
  const availPct = (stats.available / total) * 100;
  const reservedPct = Math.max(0, 100 - soldPct - availPct);
  const a1 = soldPct;
  const a2 = soldPct + availPct;
  return '<div class="donut-wrap">' +
    '<div class="donut" style="background:conic-gradient(var(--red) 0 ' + a1.toFixed(2) + '%, var(--accent) ' + a1.toFixed(2) + '% ' + a2.toFixed(2) + '%, var(--amber) ' + a2.toFixed(2) + '% 100%)">' +
      '<div class="donut-center"><strong>' + stats.totalPlots + '</strong><small>plots</small></div>' +
    '</div>' +
    '<div class="donut-legend">' +
      '<div class="leg-row"><i style="background:var(--red)"></i>Sold<strong>' + stats.sold + '</strong></div>' +
      '<div class="leg-row"><i style="background:var(--accent)"></i>Available<strong>' + stats.available + '</strong></div>' +
      '<div class="leg-row"><i style="background:var(--amber)"></i>Reserved<strong>' + stats.reserved + '</strong></div>' +
      '<div class="leg-row" style="padding-top:5px;border-top:1px solid var(--line);margin-top:2px"><i style="background:var(--green-900)"></i>Total<strong>' + stats.totalPlots + '</strong></div>' +
    '</div>' +
  '</div>';
}

function activityHTML() {
  const items = (data.activities || []).slice(0, 7);
  if (!items.length) {
    return '<div class="empty" style="padding:32px 20px"><div class="empty-ico">' + icon('clock') + '</div><h3>No activity yet</h3><p>Sales, payments and reminders will appear here.</p></div>';
  }
  return '<div class="activity-list">' + items.map((a) => {
    const ico = a.type === 'sale' ? 'sales' : a.type === 'payment' || a.type === 'expense' ? 'wallet' : a.type === 'reminder' ? 'bell' : 'plots';
    return '<div class="activity-item">' +
      '<span class="act-ico ' + esc(a.type) + '">' + icon(ico, 14) + '</span>' +
      '<div class="act-copy"><strong>' + esc(a.text) + '</strong><small>' + esc(a.detail || '') + ' · ' + esc(relTime(a.at)) + '</small></div>' +
    '</div>';
  }).join('') + '</div>';
}

function recentSalesTableHTML(stats) {
  const sales = stats.sales.slice().sort((a, b) => S.parseDate(b.date) - S.parseDate(a.date)).slice(0, 5);
  if (!sales.length) {
    return '<div class="empty" style="padding:32px 20px"><div class="empty-ico">' + icon('sales') + '</div><h3>No sales yet</h3><p>Record your first sale to start issuing receipts.</p><button type="button" class="btn btn-primary btn-sm" data-action="new-sale">' + icon('plus') + ' New sale</button></div>';
  }
  return '<div class="table-wrap"><table class="data"><thead><tr><th>Buyer</th><th>Plot</th><th>Date</th><th class="num">Amount</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
    sales.map((sale) => '<tr data-action="view-sale" data-sale-id="' + esc(sale.id) + '">' +
      '<td><div class="cell-main">' + buyerAvatarHTML(sale.buyer, 'cell-avatar') + '<div class="cell-copy"><strong>' + esc(sale.buyer ? sale.buyer.name : 'Unknown') + '</strong><small>' + esc(sale.receiptNo) + '</small></div></div></td>' +
      '<td><span class="strong">' + esc(sale.plot ? sale.plot.label : '—') + '</span><span class="sub">' + esc(sale.plot ? 'Block ' + sale.plot.block : '') + '</span></td>' +
      '<td>' + esc(fmtDate(sale.date)) + '</td>' +
      '<td class="num strong">' + money(sale.price) + '</td>' +
      '<td>' + statusBadge(sale.status) + '</td>' +
      '<td class="num"><span class="mini-btn" style="display:inline-grid">' + icon('chevronRight', 13) + '</span></td>' +
    '</tr>').join('') +
    '</tbody></table></div>';
}

function viewDashboard() {
  const stats = S.stats(data);
  const overdue = stats.overdue.slice().sort((a, b) => b.daysOverdue - a.daysOverdue);
  const chart = collectionsChartHTML();
  const owner = data.settings.ownerName || 'there';

  const attention = overdue.length
    ? '<div class="attention-list">' + overdue.slice(0, 4).map((sale) => '<div class="attention-item">' +
        buyerAvatarHTML(sale.buyer, 'att-avatar') +
        '<div class="att-copy"><strong>' + esc(sale.buyer ? sale.buyer.name : 'Unknown buyer') + '</strong><small>' + esc(sale.plot ? sale.plot.label : '') + ' · ' + sale.daysOverdue + ' days overdue</small></div>' +
        '<div class="att-amt"><strong>' + money(sale.balance) + '</strong><small>outstanding</small></div>' +
        '<button type="button" class="btn btn-soft btn-sm att-remind" data-action="remind" data-sale-id="' + esc(sale.id) + '">' + icon('bell', 13) + ' Remind</button>' +
      '</div>').join('') + '</div>'
    : '<div class="empty" style="padding:38px 20px"><div class="empty-ico">' + icon('checkCircle') + '</div><h3>Everything is settled</h3><p>No overdue balances right now.</p></div>';

  const quickActions = [
      { action: 'new-sale', icon: 'plus', label: 'New sale', primary: true, perm: 'sales.create' },
      { action: 'record-payment', icon: 'wallet', label: 'Record payment', primary: false, perm: 'payments.record' },
      { action: 'add-lead', icon: 'user', label: 'Add lead', primary: false, perm: 'leads.manage' },
      { action: 'add-expense', icon: 'wallet', label: 'Record expense', primary: false, perm: 'expenses.manage' },
      { action: 'add-task', icon: 'calendar', label: 'Add task', primary: false, perm: 'tasks.manage' },
      { action: 'add-plot', icon: 'plots', label: 'Add plot', primary: false, perm: 'plots.manage' },
    ].filter(q => can(q.perm)).map(q => 
      '<button type="button" class="btn ' + (q.primary ? 'btn-primary' : 'btn-soft') + '" data-action="' + esc(q.action) + '">' + icon(q.icon, 16) + ' ' + esc(q.label) + '</button>'
    ).join('');

  return '<div class="page">' +
    '<div class="page-head greeting">' +
      '<div><h2>' + greeting() + ', ' + esc(owner) + '</h2><p>' + esc(fmtDate(new Date())) + ' · Here is how ' + esc(data.settings.orgName) + ' is doing today.</p></div>' +
    '</div>' +

    '<div class="quick-actions-bar" role="toolbar" aria-label="Quick actions">' + quickActions + '</div>' +

    '<div class="kpi-grid">' +
      '<div class="kpi" style="--kpi-soft:var(--red-soft);--kpi-ink:var(--red-ink);--kpi-glow:rgba(223,75,75,.06)">' +
        '<div class="kpi-top"><span class="kpi-label">Plots sold</span><span class="kpi-icon">' + icon('sales', 17) + '</span></div>' +
        '<div class="kpi-value">' + stats.sold + ' <small>/ ' + stats.totalPlots + '</small></div>' +
        '<div class="kpi-foot"><span class="trend up">' + icon('trendUp', 12) + ' ' + stats.paidSales + ' fully paid</span><span>· ' + moneyCompact(stats.soldValue) + ' sold value</span></div>' +
      '</div>' +
      '<div class="kpi" style="--kpi-soft:var(--accent-soft);--kpi-ink:var(--accent-ink)">' +
        '<div class="kpi-top"><span class="kpi-label">Available plots</span><span class="kpi-icon">' + icon('plots', 17) + '</span></div>' +
        '<div class="kpi-value">' + stats.available + ' <small>ready to sell</small></div>' +
        '<div class="kpi-foot"><span>' + stats.reserved + ' reserved</span><span>· ' + Math.round((stats.available / Math.max(1, stats.totalPlots)) * 100) + '% of land</span></div>' +
      '</div>' +
      '<div class="kpi hero-kpi">' +
        '<div class="kpi-top"><span class="kpi-label">Money collected</span><span class="kpi-icon">' + icon('wallet', 17) + '</span></div>' +
        '<div class="kpi-value">' + moneyCompact(stats.collected) + '</div>' +
        '<div class="kpi-foot"><span class="trend up" style="color:var(--accent-bright)">' + icon('trendUp', 12) + ' ' + Math.round((stats.collected / Math.max(1, stats.soldValue)) * 100) + '%</span><span>of sold value collected</span></div>' +
      '</div>' +
      '<div class="kpi" style="--kpi-soft:var(--amber-soft);--kpi-ink:var(--amber-ink);--kpi-glow:rgba(227,154,18,.07)">' +
        '<div class="kpi-top"><span class="kpi-label">Outstanding</span><span class="kpi-icon">' + icon('clock', 17) + '</span></div>' +
        '<div class="kpi-value">' + moneyCompact(stats.outstanding) + '</div>' +
        '<div class="kpi-foot"><span class="trend warn">' + icon('alert', 12) + ' ' + stats.overdue.length + ' overdue</span><span>· ' + moneyCompact(stats.overdueAmount) + '</span></div>' +
      '</div>' +
    '</div>' +

    '<div class="dash-split">' +
      '<div class="card"><div class="card-head"><div><h3>Collections</h3><p>Payments received over the last six months</p></div><button type="button" class="btn-link" data-action="record-payment">Record payment ' + icon('arrowRight', 12) + '</button></div>' + chart.html + '</div>' +
      '<div class="card"><div class="card-head"><div><h3>Land at a glance</h3><p>Plot status across your site</p></div><button type="button" class="btn-link" data-action="go-map">View map ' + icon('arrowRight', 12) + '</button></div>' + donutHTML(stats) + '</div>' +
    '</div>' +

    '<div class="dash-lower">' +
      '<div class="card"><div class="card-head"><div><h3>Needs attention</h3><p>Buyers with overdue balances</p></div><button type="button" class="btn-link" data-action="go-sales-overdue">View all ' + icon('arrowRight', 12) + '</button></div>' + attention + '</div>' +
      '<div class="card"><div class="card-head"><div><h3>Recent activity</h3><p>What happened in your business</p></div></div>' + activityHTML() + '</div>' +
    '</div>' +

    dashboardOpsWidgets() +

    '<div class="card"><div class="card-head" style="padding-bottom:14px"><div><h3>Recent sales</h3><p>Your latest plot sales and receipts</p></div><button type="button" class="btn-link" data-action="go-sales">All sales ' + icon('arrowRight', 12) + '</button></div>' + recentSalesTableHTML(stats) + '</div>' +
  '</div>';
}
