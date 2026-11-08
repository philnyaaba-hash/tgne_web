/* LandLedger — map and plots views */
'use strict';

/* ---------------- Land map ---------------- */
function mapFilterChipsHTML() {
  const counts = {
    all: data.plots.length,
    available: data.plots.filter((p) => p.status === 'available').length,
    reserved: data.plots.filter((p) => p.status === 'reserved').length,
    sold: data.plots.filter((p) => p.status === 'sold').length
  };
  const items = [
    ['all', 'All plots'],
    ['available', 'Available'],
    ['reserved', 'Reserved'],
    ['sold', 'Sold']
  ];
  return items.map(([key, label]) =>
    '<button type="button" class="chip' + (state.mapStatus === key ? ' active' : '') + '" data-action="map-filter" data-status="' + key + '">' +
      label + ' <span class="count">' + counts[key] + '</span>' +
    '</button>'
  ).join('');
}

function sitePlanHTML() {
  const blocks = Array.from(new Set(data.plots.map((p) => p.block))).sort();
  let html = '<div class="plan-road"></div>';
  blocks.forEach((block) => {
    const plots = data.plots.filter((p) => p.block === block).sort((a, b) => a.code.localeCompare(b.code));
    html += '<div class="block-row"><div class="block-label">' + esc(block) + '</div><div class="block-plots">';
    plots.forEach((plot) => {
      const sale = saleForPlot(plot);
      const dim = !plotMatches(plot);
      const tileName = plot.label.replace('Plot ', '');
      const title = tileName + ' · Block ' + plot.block + ' · ' + plot.size + ' m² · ' + statusLabel(plot.status) + (sale && sale.buyer ? ' · ' + sale.buyer.name : '');
      html += '<button type="button" class="plot-tile ' + esc(plot.status) + (plot.id === state.selectedPlotId ? ' selected' : '') + (dim ? ' dim' : '') + '" data-action="select-plot" data-plot-id="' + esc(plot.id) + '" title="' + esc(title) + '" aria-label="' + esc(title) + '">' +
        plot.label.replace('Plot ', '') + '<small>' + plot.size + 'm²</small><span class="tile-dot"></span>' +
      '</button>';
    });
    html += '</div></div>';
  });
  return html;
}

function plotDetailHTML() {
  const plot = state.selectedPlotId ? S.plotById(data, state.selectedPlotId) : null;
  if (!plot) {
    return '<div class="card map-empty"><div class="empty-ico">' + icon('mapPin') + '</div><h3>Select a plot</h3><p>Tap any plot on the site plan to see its owner, balance and location.</p></div>';
  }
  const sale = saleForPlot(plot);
  const buyer = sale && sale.buyer ? sale.buyer : null;
  const mapUrl = 'https://www.openstreetmap.org/export/embed.html?bbox=' +
    (plot.lng - 0.0035) + '%2C' + (plot.lat - 0.0025) + '%2C' + (plot.lng + 0.0035) + '%2C' + (plot.lat + 0.0025) +
    '&layer=mapnik&marker=' + plot.lat + '%2C' + plot.lng;
  const googleUrl = 'https://www.google.com/maps/search/?api=1&query=' + plot.lat + ',' + plot.lng;

  return '<div class="card plot-detail">' +
    '<div class="plot-detail-head">' +
      '<div><h3>' + esc(plot.label) + '</h3><p>' + esc(plot.code) + ' · Block ' + esc(plot.block) + '</p></div>' +
      statusBadge(plot.status) +
    '</div>' +
    '<div class="plot-facts">' +
      '<div class="plot-fact"><small>Plot size</small><strong>' + plot.size + ' m²</strong></div>' +
      '<div class="plot-fact"><small>Asking price</small><strong>' + money(plot.price) + '</strong></div>' +
      '<div class="plot-fact"><small>Location</small><strong>' + plot.lat.toFixed(4) + ', ' + plot.lng.toFixed(4) + '</strong></div>' +
      '<div class="plot-fact"><small>Status</small><strong>' + esc(statusLabel(plot.status)) + '</strong></div>' +
    '</div>' +
    (buyer
      ? '<div class="plot-owner">' +
          buyerAvatarHTML(buyer, 'cell-avatar') +
          '<div class="plot-owner-copy"><strong>' + esc(buyer.name) + '</strong><small>' + esc(buyer.phone) + ' · ' + esc(sale.receiptNo) + '</small></div>' +
          '<button type="button" class="mini-btn" data-action="view-buyer" data-buyer-id="' + esc(buyer.id) + '" title="View buyer">' + icon('chevronRight', 13) + '</button>' +
        '</div>'
      : '<div class="plot-owner"><span class="cell-avatar" style="background:var(--surface-3);color:var(--muted)">' + icon('user', 15) + '</span><div class="plot-owner-copy"><strong>No buyer yet</strong><small>This plot is ready for a sale.</small></div></div>') +
    (sale
      ? '<div style="padding:0 15px 13px"><div class="balance-strip" style="margin-top:0"><div><small>Outstanding balance</small><strong class="' + (sale.balance > 0 ? 'due' : '') + '">' + money(sale.balance) + '</strong></div><span class="badge ' + esc(sale.status) + '">' + esc(statusLabel(sale.status)) + '</span></div></div>'
      : '') +
    '<div class="plot-actions">' +
      (sale
        ? '<button type="button" class="btn btn-primary btn-sm" data-action="view-sale" data-sale-id="' + esc(sale.id) + '">' + icon('receipts', 14) + ' View sale</button>' +
          (sale.balance > 0 ? '<button type="button" class="btn btn-soft btn-sm" data-action="record-payment" data-sale-id="' + esc(sale.id) + '">' + icon('wallet', 14) + ' Payment</button>' : '')
        : '<button type="button" class="btn btn-primary btn-sm" data-action="new-sale" data-plot-id="' + esc(plot.id) + '">' + icon('plus', 14) + ' New sale</button>') +
      '<button type="button" class="btn btn-ghost btn-sm" data-action="edit-plot" data-plot-id="' + esc(plot.id) + '">' + icon('edit', 14) + ' Edit</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-action="open-maps" data-plot-id="' + esc(plot.id) + '">' + icon('external', 14) + ' Google Maps</button>' +
    '</div>' +
    '<div class="mini-map"><iframe src="' + esc(mapUrl) + '" loading="lazy" title="Map location for ' + esc(plot.label) + '" referrerpolicy="no-referrer"></iframe></div>' +
    '<div style="padding:9px 15px;font-size:9.5px;color:var(--muted);border-top:1px solid var(--line)">' + icon('mapPin', 12) + ' ' + esc(googleUrl) + '</div>' +
  '</div>';
}

function viewMap() {
  return '<div class="page">' +
    '<div class="page-head"><div><h2>Land map</h2><p>Your whole site on one screen. Green is available, amber is reserved and red is sold.</p></div>' +
      '<div class="head-actions"><button type="button" class="btn btn-ghost" data-action="add-plot">' + icon('plus', 16) + ' Add plot</button><button type="button" class="btn btn-primary" data-action="new-sale">' + icon('plus', 16) + ' New sale</button></div>' +
    '</div>' +
    '<div class="toolbar"><div id="mapFilters" class="chip-row">' + mapFilterChipsHTML() + '</div><span class="spacer"></span><div class="search-field"><span>' + icon('search') + '</span><input type="search" id="mapSearch" value="' + esc(state.mapQuery) + '" placeholder="Search plot or buyer…" aria-label="Search plots"></div></div>' +
    '<div class="map-layout">' +
      '<div class="card plan-card">' +
        '<div class="plan-head"><div><h3>' + esc(data.settings.siteName || 'Site plan') + '</h3><p>' + esc(data.settings.address) + '</p></div><div class="plan-legend"><span><i style="background:#dcf7e6;border:1px solid #aee5c3"></i>Available</span><span><i style="background:#fff1d2;border:1px solid #f2cf87"></i>Reserved</span><span><i style="background:#fbdcdc;border:1px solid #f0b5b5"></i>Sold</span></div></div>' +
        '<div class="plan-scroll"><div class="site-plan" id="sitePlan">' + sitePlanHTML() + '</div></div>' +
        '<div class="card-foot" style="display:flex;justify-content:space-between;gap:12px;font-size:10.5px;color:var(--muted)"><span id="mapCount">' + data.plots.filter(plotMatches).length + ' plots shown</span><span>' + data.plots.length + ' plots · ' + (data.plots.reduce((sum, p) => sum + p.size, 0) / 10000).toFixed(2) + ' hectares</span></div>' +
      '</div>' +
      '<div class="map-side" id="mapSide">' + plotDetailHTML() + '</div>' +
    '</div>' +
  '</div>';
}

function updateMap() {
  const plan = $('#sitePlan');
  if (plan) plan.innerHTML = sitePlanHTML();
  const side = $('#mapSide');
  if (side) side.innerHTML = plotDetailHTML();
  const filters = $('#mapFilters');
  if (filters) filters.innerHTML = mapFilterChipsHTML();
  const count = $('#mapCount');
  if (count) count.textContent = data.plots.filter(plotMatches).length + ' plots shown';
  initMapTouch();
}

function initMapTouch() {
  const plan = $('#sitePlan');
  if (!plan) return;

  let startX = 0;
  let startY = 0;
  let isScrolling = false;

  plan.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isScrolling = false;
  }, { passive: true });

  plan.addEventListener('touchmove', (e) => {
    if (!isScrolling) {
      const dx = Math.abs(e.touches[0].clientX - startX);
      const dy = Math.abs(e.touches[0].clientY - startY);
      if (dx > 10 && dx > dy) {
        isScrolling = true;
        e.preventDefault();
      }
    }
    if (isScrolling) {
      e.preventDefault();
      plan.scrollLeft -= e.touches[0].clientX - startX;
      startX = e.touches[0].clientX;
    }
  }, { passive: false });

  // Double-tap to select plot
  plan.addEventListener('touchend', (e) => {
    if (isScrolling) return;
    const now = Date.now();
    if (plan.lastTap && now - plan.lastTap < 300) {
      const target = e.changedTouches[0].target.closest('.plot-tile');
      if (target) target.click();
    }
    plan.lastTap = now;
  });
}

/* ---------------- Plots ---------------- */
function filteredPlots() {
  const query = state.plotsQuery.trim().toLowerCase();
  let list = data.plots.slice().sort((a, b) => a.code.localeCompare(b.code));
  if (state.plotsStatus !== 'all') list = list.filter((p) => p.status === state.plotsStatus);
  if (state.plotsBlock !== 'all') list = list.filter((p) => p.block === state.plotsBlock);
  if (query) {
    list = list.filter((p) => {
      const sale = saleForPlot(p);
      const hay = [p.code, p.label, p.block, p.description, sale && sale.buyer ? sale.buyer.name : ''].join(' ').toLowerCase();
      return hay.includes(query);
    });
  }
  return list;
}

function pagerHTML(total, page, pageSize, action) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pages);
  const from = total ? (current - 1) * pageSize + 1 : 0;
  const to = Math.min(total, current * pageSize);
  return '<div class="pager"><span>Showing ' + from + '–' + to + ' of ' + total + '</span><div class="pager-btns">' +
    '<button type="button" class="pager-btn" data-action="' + action + '" data-page="' + (current - 1) + '"' + (current <= 1 ? ' disabled' : '') + ' aria-label="Previous page">' + icon('chevronLeft', 13) + '</button>' +
    '<button type="button" class="pager-btn" data-action="' + action + '" data-page="' + (current + 1) + '"' + (current >= pages ? ' disabled' : '') + ' aria-label="Next page">' + icon('chevronRight', 13) + '</button>' +
  '</div></div>';
}

function plotsResultsHTML() {
  const list = filteredPlots();
  if (!list.length) {
    return '<div class="empty"><div class="empty-ico">' + icon('plots') + '</div><h3>No plots found</h3><p>Try a different search or add a new plot to your site.</p><button type="button" class="btn btn-primary btn-sm" data-action="add-plot">' + icon('plus') + ' Add plot</button></div>';
  }
  const pageSize = PAGE_SIZE.plots;
  const pages = Math.max(1, Math.ceil(list.length / pageSize));
  if (state.plotsPage > pages) state.plotsPage = pages;
  const page = Math.max(1, state.plotsPage);
  const rows = list.slice((page - 1) * pageSize, page * pageSize);

  return '<div class="table-wrap"><table class="data"><thead><tr><th>Plot</th><th>Size</th><th class="num">Price</th><th>Status</th><th>Buyer</th><th class="num">Balance</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
    rows.map((plot) => {
      const sale = saleForPlot(plot);
      return '<tr data-action="open-plot" data-plot-id="' + esc(plot.id) + '" class="plot-row plot-row-' + esc(plot.status) + '">' +
        '<td><div class="cell-main"><span class="cell-avatar">' + esc(plot.block) + '</span><div class="cell-copy"><strong>' + esc(plot.label) + '</strong><small>' + esc(plot.code) + ' · Block ' + esc(plot.block) + '</small></div></div></td>' +
        '<td>' + plot.size + ' m²</td>' +
        '<td class="num strong">' + money(plot.price) + '</td>' +
        '<td>' + statusBadge(plot.status) + '</td>' +
        '<td>' + (sale && sale.buyer ? '<div class="cell-copy"><strong>' + esc(sale.buyer.name) + '</strong><small>' + esc(sale.buyer.phone) + '</small></div>' : '<span style="color:var(--muted)">—</span>') + '</td>' +
        '<td class="num ' + (sale && sale.balance > 0 ? 'strong' : '') + '" style="' + (sale && sale.balance > 0 ? 'color:var(--red-ink)' : '') + '">' + (sale ? money(sale.balance) : '—') + '</td>' +
        '<td><div class="row-actions">' +
          '<button type="button" class="mini-btn" data-action="edit-plot" data-plot-id="' + esc(plot.id) + '" title="Edit plot">' + icon('edit', 13) + '</button>' +
          '<button type="button" class="mini-btn" data-action="open-maps" data-plot-id="' + esc(plot.id) + '" title="Open in Google Maps">' + icon('external', 13) + '</button>' +
        '</div></td>' +
      '</tr>';
    }).join('') +
    '</tbody></table></div>' + pagerHTML(list.length, page, pageSize, 'plots-page');
}

function viewPlots() {
  const blocks = Array.from(new Set(data.plots.map((p) => p.block))).sort();
  const stats = S.stats(data);
  return '<div class="page">' +
    '<div class="page-head"><div><h2>Plots</h2><p>Manage every plot, its size, price and availability. ' + stats.available + ' available · ' + stats.reserved + ' reserved · ' + stats.sold + ' sold.</p></div>' +
      '<div class="head-actions"><button type="button" class="btn btn-primary" data-action="add-plot">' + icon('plus', 16) + ' Add plot</button></div>' +
    '</div>' +
    '<div class="toolbar">' +
      '<div class="search-field"><span>' + icon('search') + '</span><input type="search" id="plotSearch" value="' + esc(state.plotsQuery) + '" placeholder="Search plot, block or buyer…" aria-label="Search plots"></div>' +
      '<select id="plotStatusFilter" aria-label="Filter by status">' +
        ['all', 'available', 'reserved', 'sold'].map((s) => '<option value="' + s + '"' + (state.plotsStatus === s ? ' selected' : '') + '>' + (s === 'all' ? 'All statuses' : statusLabel(s)) + '</option>').join('') +
      '</select>' +
      '<select id="plotBlockFilter" aria-label="Filter by block">' +
        '<option value="all">All blocks</option>' + blocks.map((b) => '<option value="' + b + '"' + (state.plotsBlock === b ? ' selected' : '') + '>Block ' + b + '</option>').join('') +
      '</select>' +
      '<span class="spacer"></span><span class="result-count" id="plotsCount">' + filteredPlots().length + ' plots</span>' +
    '</div>' +
    '<div class="card" id="plotsResults">' + plotsResultsHTML() + '</div>' +
  '</div>';
}

function updatePlotsResults() {
  const wrap = $('#plotsResults');
  if (wrap) wrap.innerHTML = plotsResultsHTML();
  const count = $('#plotsCount');
  if (count) count.textContent = filteredPlots().length + ' plots';
}
