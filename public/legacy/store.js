/* LandLedger — local data store and demo seed */
(function () {
  'use strict';

  const KEY = 'landledger.data.v1';
  const VERSION = 1;
  const DAY = 86400000;

  const pad = (n, w) => String(n).padStart(w || 2, '0');

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function dateOnly(d) {
    const x = new Date(d);
    return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
  }

  function parseDate(value) {
    if (!value) return new Date(NaN);
    if (value instanceof Date) return new Date(value.getTime());
    const s = String(value);
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
    return new Date(s);
  }

  function addDays(value, days) {
    const d = parseDate(value);
    d.setDate(d.getDate() + days);
    return dateOnly(d);
  }

  function daysAgo(n) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - n);
    return d;
  }

  function uid(prefix) {
    return (prefix || '') + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }

  const FIRST = [
    'Kwame', 'Kojo', 'Ama', 'Kofi', 'Akosua', 'Yaw', 'Abena', 'Nana', 'Efua', 'Kwesi',
    'Adwoa', 'Esi', 'Kwabena', 'Afia', 'Kweku', 'Yaa', 'Nii', 'Akua', 'Fiifi', 'Mansa',
    'Kwame', 'Ama', 'Kofi', 'Akosua', 'Yaw', 'Abena', 'Nana', 'Efua', 'Kwesi', 'Adwoa',
    'Kojo', 'Esi', 'Kwabena', 'Afia', 'Kweku', 'Yaa', 'Nii', 'Akua', 'Fiifi', 'Mansa',
    'Kwame', 'Ama', 'Kofi', 'Akosua', 'Yaw', 'Abena', 'Nana', 'Efua'
  ];
  const LAST = [
    'Mensah', 'Boateng', 'Serwaa', 'Asante', 'Owusu', 'Darko', 'Sarpong', 'Adjei', 'Dadzie', 'Appiah',
    'Frimpong', 'Agyeman', 'Osei', 'Nyarko', 'Amoah', 'Asantewaa', 'Armah', 'Boakye', 'Quansah', 'Ali',
    'Addo', 'Agyei', 'Mensah', 'Badu', 'Oppong', 'Danso', 'Ofori', 'Aidoo', 'Adjei', 'Yeboah',
    'Antwi', 'Amankwah', 'Nkrumah', 'Sarpong', 'Appiah', 'Owusu', 'Tetteh', 'Asare', 'Botchwey', 'Abubakar',
    'Osei', 'Kyei', 'Boateng', 'Nyarko', 'Frimpong', 'Asante', 'Ansah', 'Mensah'
  ];

  const BUSINESSES = [
    'Mensah Logistics', 'Boateng Ventures', 'Serwaa Foods', 'Asante Holdings', 'Owusu Motors',
    'Darko Farms', 'Sarpong Textiles', 'Adjei Builders', 'Dadzie Imports', 'Appiah & Sons',
    '', '', '', 'Frimpong Pharmacy', '', 'Asantewaa Catering', '', '', 'Quansah Travel', '',
    '', 'Agyei Legal', '', '', '', 'Danso Metals', '', '', '', '',
    '', '', '', '', '', '', '', '', '', '',
    '', '', '', '', '', '', '', ''
  ];

  const ID_TYPES = ['Ghana Card', 'Passport', 'Voter ID', 'Driver’s Licence'];

  function phoneFor(i) {
    const prefixes = ['024', '020', '055', '027', '026', '059'];
    const base = 1000000 + ((i * 73856093) % 8999999);
    return `${prefixes[i % prefixes.length]} ${String(base).slice(0, 3)} ${String(base).slice(3, 7)}`;
  }

  function seed() {
    const rng = mulberry32(20261030);
    const now = new Date();
    now.setHours(12, 0, 0, 0);

    const settings = {
      orgName: 'Asante Land Company',
      tagline: 'Land, managed with confidence.',
      ownerName: 'Ama',
      phone: '024 000 0000',
      email: 'hello@asanteland.com',
      address: 'Plot 12, Airport Residential Area, Accra',
      siteName: 'Asante Ridge Estates',
      lat: 5.6037,
      lng: -0.187,
      currency: 'GHS',
      saleSeq: 0
    };

    /* ---------------- Plots ---------------- */
    const plots = [];
    for (let block = 0; block < 8; block++) {
      for (let n = 1; n <= 10; n++) {
        const index = block * 10 + n;
        const size = 400 + ((index * 7) % 5) * 50;
        const price = Math.round((size * 52 + (7 - block) * 1800) / 500) * 500;
        const lat = settings.lat + (block - 3.5) * 0.00072 + (n % 5) * 0.00008;
        const lng = settings.lng + (Math.floor(n / 5) - 0.5) * 0.00052 + (n % 5) * 0.00007;
        plots.push({
          id: 'plot-' + pad(index, 3),
          code: 'P-' + pad(index, 3),
          label: 'Plot ' + index,
          block: String.fromCharCode(65 + block),
          size,
          price,
          status: 'available',
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6)),
          description: '',
          createdAt: dateOnly(addDays(now, -420))
        });
      }
    }

    /* Sold plots: 48 of 80. Plot 14 is the demo sale, plot 24 is the overdue buyer. */
    const sold = new Set([13, 23]);
    while (sold.size < 48) sold.add(Math.floor(rng() * 80));
    const soldOrder = [13, 23, ...Array.from(sold).filter((i) => i !== 13 && i !== 23).sort((a, b) => a - b)];

    const buyers = [];
    const sales = [];
    const payments = [];

    soldOrder.forEach((plotIndex, i) => {
      const plot = plots[plotIndex];
      const buyerId = 'buyer-' + pad(i + 1, 3);
      const first = FIRST[i];
      const last = LAST[i];
      const name = `${first} ${last}`;
      const buyer = {
        id: buyerId,
        name,
        phone: phoneFor(i),
        email: i % 3 === 0 ? `${first.toLowerCase()}.${last.toLowerCase()}@example.com` : '',
        business: BUSINESSES[i] || '',
        idType: ID_TYPES[i % ID_TYPES.length],
        idNumber: `GHA-${100000000 + i * 7919}-${(i % 9) + 1}`,
        nextOfKin: `${FIRST[(i + 9) % FIRST.length]} ${LAST[(i + 11) % LAST.length]}`,
        nextOfKinPhone: phoneFor(i + 17),
        address: ['East Legon, Accra', 'Spintex, Accra', 'Tema Community 7', 'Adenta, Accra', 'Kasoa, Central Region', 'Airport Residential, Accra'][i % 6],
        notes: '',
        createdAt: dateOnly(addDays(now, -(340 - i * 2)))
      };
      buyers.push(buyer);

      let price = plot.price;
      if (plotIndex === 13) price = 15000;
      if (plotIndex === 23) price = 28000;
      plot.price = price;
      plot.status = 'sold';

      const saleDate = plotIndex === 13 ? dateOnly(addDays(now, -3)) : plotIndex === 23 ? dateOnly(addDays(now, -140)) : dateOnly(addDays(now, -(8 + Math.floor(rng() * 315))));

      const ratioPool = [1, 1, 0.4, 0.7, 0.9, 1, 0.5, 0.75, 1, 0.6, 0.8, 0.35, 1, 0.55, 0.9, 0.95];
      let ratio = ratioPool[i % ratioPool.length];
      if (plotIndex === 13) ratio = 1;
      let paid = plotIndex === 23 ? 20000 : Math.round((price * ratio) / 500) * 500;
      if (paid > price) paid = price;

      const sale = {
        id: 'sale-' + pad(i + 1, 3),
        receiptNo: '',
        seq: 0,
        plotId: plot.id,
        buyerId,
        date: saleDate,
        price,
        dueDate: plotIndex === 23 ? addDays(saleDate, 60) : addDays(saleDate, 120),
        paymentPlan: paid >= price ? 'Full payment' : 'Installments',
        notes: plotIndex === 13 ? 'Buyer paid in full. Documents verified.' : '',
        docs: plotIndex === 13
          ? [
              { id: uid('doc-'), name: 'Ghana Card - Kwame Mensah.jpg', type: 'image/jpeg', size: 184320, dataUrl: null, addedAt: new Date().toISOString() },
              { id: uid('doc-'), name: 'Indenture - Plot 14.pdf', type: 'application/pdf', size: 642000, dataUrl: null, addedAt: new Date().toISOString() }
            ]
          : [],
        createdAt: new Date(parseDate(saleDate).getTime() + 10 * 3600000).toISOString()
      };

      if (paid > 0) {
        const methods = ['Mobile Money', 'Bank transfer', 'Cash', 'Cheque'];
        if (paid === price) {
          payments.push({
            id: uid('pay-'),
            saleId: sale.id,
            amount: paid,
            date: saleDate,
            method: methods[i % methods.length],
            note: 'Full payment',
            createdAt: new Date(parseDate(saleDate).getTime() + 11 * 3600000).toISOString()
          });
        } else {
          const firstAmount = Math.round((paid * 0.6) / 500) * 500;
          const secondAmount = paid - firstAmount;
          payments.push({
            id: uid('pay-'),
            saleId: sale.id,
            amount: firstAmount,
            date: saleDate,
            method: methods[i % methods.length],
            note: 'Deposit',
            createdAt: new Date(parseDate(saleDate).getTime() + 11 * 3600000).toISOString()
          });
          if (secondAmount > 0) {
            let secondDate = addDays(saleDate, 45);
            if (parseDate(secondDate) > now) secondDate = dateOnly(addDays(now, -1));
            payments.push({
              id: uid('pay-'),
              saleId: sale.id,
              amount: secondAmount,
              date: secondDate,
              method: methods[(i + 1) % methods.length],
              note: 'Installment',
              createdAt: new Date(parseDate(secondDate).getTime() + 13 * 3600000).toISOString()
            });
          }
        }
      }

      plot.buyerId = buyerId;
      plot.saleId = sale.id;
      sales.push(sale);
    });

    /* receipt numbers in chronological order */
    sales
      .slice()
      .sort((a, b) => parseDate(a.date) - parseDate(b.date))
      .forEach((sale, i) => {
        sale.seq = i + 1;
        sale.receiptNo = `LL-${parseDate(sale.date).getFullYear()}-${pad(i + 1, 4)}`;
      });

    /* Plot 14 sale should be the most recent receipt */
    settings.saleSeq = sales.length;

    /* ---------------- Activities ---------------- */
    const activities = [];
    sales.forEach((sale) => {
      const buyer = buyers.find((b) => b.id === sale.buyerId);
      const plot = plots.find((p) => p.id === sale.plotId);
      activities.push({
        id: uid('act-'),
        type: 'sale',
        text: `Sold ${plot.label} to ${buyer.name}`,
        detail: `${sale.receiptNo} · GH₵ ${sale.price.toLocaleString('en-GH')}`,
        at: sale.createdAt,
        refId: sale.id
      });
    });
    payments.forEach((payment) => {
      const sale = sales.find((s) => s.id === payment.saleId);
      const buyer = buyers.find((b) => b.id === sale.buyerId);
      activities.push({
        id: uid('act-'),
        type: 'payment',
        text: `Payment received from ${buyer.name}`,
        detail: `GH₵ ${payment.amount.toLocaleString('en-GH')} · ${payment.method}`,
        at: payment.createdAt,
        refId: sale.id
      });
    });
    activities.push({
      id: uid('act-'),
      type: 'reminder',
      text: 'Payment reminder sent to Kojo Boateng',
      detail: 'GH₵ 8,000 outstanding · SMS',
      at: new Date(now.getTime() - 2 * DAY).toISOString(),
      refId: sales.find((s) => s.buyerId === buyers[1].id)?.id
    });
    activities.sort((a, b) => new Date(b.at) - new Date(a.at));

    const data = {
      version: VERSION,
      settings,
      plots,
      buyers,
      sales,
      payments,
      expenses: [],
      staff: [],
      leads: [],
      tasks: [],
      estateDocuments: [],
      maintenance: [],
      complaints: [],
      clientVault: null,
      clientDocuments: [],
      finance: null,
      activities: activities.slice(0, 80),
      createdAt: new Date().toISOString()
    };

    return data;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && data.version === VERSION && Array.isArray(data.plots)) {
          if (!Array.isArray(data.expenses)) data.expenses = [];
          if (!Array.isArray(data.staff)) data.staff = [];
          if (!Array.isArray(data.leads)) data.leads = [];
          if (!Array.isArray(data.tasks)) data.tasks = [];
          if (!Array.isArray(data.estateDocuments)) data.estateDocuments = [];
          if (!Array.isArray(data.maintenance)) data.maintenance = [];
          if (!Array.isArray(data.complaints)) data.complaints = [];
          if (!Array.isArray(data.activities)) data.activities = [];
          if (!Array.isArray(data.clientDocuments)) data.clientDocuments = [];
          if (!data.finance || typeof data.finance !== 'object') data.finance = null;
          return data;
        }
      }
    } catch (err) {
      console.warn('Could not read saved data, using demo data.', err);
    }
    const data = seed();
    save(data);
    return data;
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return { ok: true, stripped: false };
    } catch (err) {
      let stripped = false;
      (data.sales || []).forEach((sale) => {
        (sale.docs || []).forEach((doc) => {
          if (doc.dataUrl) {
            doc.dataUrl = null;
            stripped = true;
          }
        });
      });
      try {
        localStorage.setItem(KEY, JSON.stringify(data));
        return { ok: true, stripped };
      } catch (err2) {
        return { ok: false, stripped, error: err2 };
      }
    }
  }

  function reset() {
    localStorage.removeItem(KEY);
    const data = seed();
    save(data);
    return data;
  }

  function nextReceipt(data, date) {
    const d = parseDate(date || new Date());
    data.settings.saleSeq = (Number(data.settings.saleSeq) || 0) + 1;
    return `LL-${d.getFullYear()}-${pad(data.settings.saleSeq, 4)}`;
  }

  function buyerById(data, id) {
    return data.buyers.find((b) => b.id === id) || null;
  }
  function plotById(data, id) {
    return data.plots.find((p) => p.id === id) || null;
  }
  function saleById(data, id) {
    return data.sales.find((s) => s.id === id) || null;
  }
  function paymentsFor(data, saleId) {
    return data.payments
      .filter((p) => p.saleId === saleId)
      .sort((a, b) => parseDate(a.date) - parseDate(b.date));
  }
  function paidFor(data, saleId) {
    return paymentsFor(data, saleId).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }
  function decorateSale(data, sale) {
    if (!sale) return null;
    const payments = paymentsFor(data, sale.id);
    const paid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const balance = Math.max(0, Number(sale.price || 0) - paid);
    const due = parseDate(sale.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysOverdue = balance > 0 && due < today ? Math.floor((today - due) / DAY) : 0;
    let status = 'partial';
    if (balance <= 0) status = 'paid';
    else if (daysOverdue > 0) status = 'overdue';
    return {
      ...sale,
      buyer: buyerById(data, sale.buyerId),
      plot: plotById(data, sale.plotId),
      payments,
      paid,
      balance,
      status,
      daysOverdue
    };
  }
  function decoratedSales(data) {
    return data.sales.map((sale) => decorateSale(data, sale)).filter(Boolean);
  }
  function stats(data) {
    const sales = decoratedSales(data);
    const sold = data.plots.filter((p) => p.status === 'sold').length;
    const reserved = data.plots.filter((p) => p.status === 'reserved').length;
    const available = data.plots.filter((p) => p.status === 'available').length;
    const collected = data.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const outstanding = sales.reduce((sum, s) => sum + s.balance, 0);
    const overdue = sales.filter((s) => s.status === 'overdue');
    const overdueAmount = overdue.reduce((sum, s) => sum + s.balance, 0);
    const soldValue = sales.reduce((sum, s) => sum + Number(s.price || 0), 0);
    return {
      sales,
      sold,
      reserved,
      available,
      totalPlots: data.plots.length,
      collected,
      outstanding,
      overdue,
      overdueAmount,
      soldValue,
      paidSales: sales.filter((s) => s.status === 'paid').length
    };
  }

  function normalizeImported(data) {
    if (!data || typeof data !== 'object') return null;
    if (!Array.isArray(data.plots) || !Array.isArray(data.buyers) || !Array.isArray(data.sales) || !Array.isArray(data.payments)) return null;
    return {
      version: VERSION,
      settings: Object.assign(seed().settings, data.settings || {}),
      plots: data.plots,
      buyers: data.buyers,
      sales: data.sales,
      payments: data.payments,
      expenses: Array.isArray(data.expenses) ? data.expenses : [],
      staff: Array.isArray(data.staff) ? data.staff : [],
      leads: Array.isArray(data.leads) ? data.leads : [],
      tasks: Array.isArray(data.tasks) ? data.tasks : [],
      estateDocuments: Array.isArray(data.estateDocuments) ? data.estateDocuments : [],
      maintenance: Array.isArray(data.maintenance) ? data.maintenance : [],
      complaints: Array.isArray(data.complaints) ? data.complaints : [],
      clientVault: data.clientVault || null,
      clientDocuments: Array.isArray(data.clientDocuments) ? data.clientDocuments : [],
      finance: data.finance && typeof data.finance === 'object' ? data.finance : null,
      activities: Array.isArray(data.activities) ? data.activities : [],
      createdAt: data.createdAt || new Date().toISOString()
    };
  }

  window.LandStore = {
    KEY,
    VERSION,
    load,
    save,
    reset,
    seed,
    uid,
    pad,
    dateOnly,
    parseDate,
    addDays,
    nextReceipt,
    buyerById,
    plotById,
    saleById,
    paymentsFor,
    paidFor,
    decorateSale,
    decoratedSales,
    stats,
    normalizeImported
  };
})();
