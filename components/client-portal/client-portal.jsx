'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './client-portal.module.css';
import { clearCachedUserState } from '../../lib/session-cleanup';
import {
  SERVICE_PRIORITIES,
  SERVICE_STATUSES,
  TGNE_SERVICE_TYPES,
  businessServiceTypeLabel,
  documentStatusLabel,
  documentTypeLabel,
  serviceStatusLabel,
} from '../../lib/client-portal';

const CLIENT_PAGE_PATHS = {
  overview: '/client',
  profile: '/client/profile',
  settings: '/client/settings',
  'new-order': '/client/new-order',
  orders: '/client/orders',
  tracking: '/client/tracking',
  quotes: '/client/quotes',
  invoices: '/client/invoices',
  documents: '/client/documents',
  team: '/client/team',
  support: '/client/support'
};

const NAV_ITEMS = [
  ['overview', 'Overview'],
  ['new-order', 'New service request'],
  ['orders', 'My requests'],
  ['quotes', 'Quotes'],
  ['invoices', 'Invoices'],
  ['documents', 'Documents'],
  ['profile', 'Profile'],
  ['team', 'Team'],
  ['support', 'Support']
];

const PAGE_TITLES = {
  overview: 'Overview',
  profile: 'Your profile',
  settings: 'Account settings',
  'new-order': 'New service request',
  orders: 'My requests',
  tracking: 'Request details',
  quotes: 'Quotes',
  invoices: 'Invoices',
  documents: 'Documents',
  team: 'Your team',
  support: 'Support'
};

async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    cache: 'no-store',
    credentials: 'same-origin',
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
  return data;
}

function money(value) {
  if (value == null || value === '') return 'To be quoted';
  return `GH₵ ${Number(value).toLocaleString('en-GH')}`;
}

function formatDate(value) {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Not scheduled'
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusTone(value) {
  if (value === 'IN_PROGRESS' || value === 'SCHEDULED') return 'progress';
  if (value === 'APPROVED') return 'approved';
  if (value === 'QUOTED') return 'quote';
  if (value === 'COMPLETED') return 'complete';
  return 'submitted';
}

function safeDocumentUrl(value) {
  if (typeof value !== 'string') return '';
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function Icon({ name, size = 17 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    list: <><path d="M9 6h12M9 12h12M9 18h12" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></>,
    receipt: <><path d="M4 3v18l3-2 3 2 3-2 3 2 4-2V3l-4 2-3-2-3 2-3-2z" /><path d="M8 9h8M8 13h6" /></>,
    folder: <path d="M3 6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    help: <><circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>
  };
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name] || paths.file}
    </svg>
  );
}

function Metric({ label, value, detail, tone = 'default' }) {
  return <article className={`${styles.metric} ${styles[`metric_${tone}`]}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function Status({ value }) {
  return <span className={`${styles.status} ${styles[`status_${statusTone(value)}`]}`}>{serviceStatusLabel(value)}</span>;
}

function OrderTable({ orders, onTrack }) {
  if (!orders.length) return <div className={styles.emptyState}><span>No service requests yet</span><p>Your submitted requests and progress updates will appear here.</p></div>;
  return (
    <div className={styles.tableScroll}>
      <table className={styles.orderTable}>
        <thead><tr><th>Reference</th><th>Service</th><th>Schedule</th><th>Status</th><th>Quote</th><th><span className={styles.srOnly}>Action</span></th></tr></thead>
        <tbody>{orders.map((order) => (
          <tr key={order.id}>
            <td><strong>{order.reference}</strong><span className={styles.cellSecondary}>{order.title}</span></td>
            <td>{businessServiceTypeLabel(order.type)}</td>
            <td>{formatDate(order.scheduledFor)}</td>
            <td><Status value={order.status} /></td>
            <td className={styles.amount}>{money(order.quoteAmount)}</td>
            <td><button className={styles.textButton} type="button" onClick={() => onTrack(order.reference)}>View</button></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

export default function ClientPortal({ user, initialPage = 'overview', initialSelectedId }) {
  const router = useRouter();
  const [workspace, setWorkspace] = useState(null);
  const [page, setPage] = useState(initialPage);
  const [selectedId, setSelectedId] = useState(initialSelectedId || '');
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [profileDraft, setProfileDraft] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);

  const loadWorkspace = useCallback(async () => {
    const data = await requestJson('/api/client/workspace');
    setWorkspace(data);
    setProfileDraft({
      phone: data.user?.phone || '',
      companyName: data.profile?.companyName || '',
      ghanaCard: data.profile?.ghanaCard || '',
      address: data.profile?.address || '',
      region: data.profile?.region || '',
      city: data.profile?.city || ''
    });
    setError('');
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        await loadWorkspace();
      } catch (reason) {
        if (active) setError(reason.message || 'Your workspace could not be loaded.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [loadWorkspace]);

  const services = workspace?.services || [];
  const invoices = workspace?.invoices || [];
  const documents = workspace?.documents || [];
  const clientName = workspace?.profile?.companyName || workspace?.user?.name || user?.name || 'Client';
  const clientEmail = workspace?.user?.email || user?.email || '';
  const orders = services;
  const activeOrders = orders.filter((order) => !['COMPLETED', 'CANCELLED'].includes(order.status));
  const quoteOrders = orders.filter((order) => order.status === 'QUOTED');
  const outstanding = invoices
    .filter((invoice) => !['PAID', 'VOID'].includes(invoice.status))
    .reduce((total, invoice) => total + Number(invoice.amount || 0), 0);
  const selectedOrder = orders.find((order) => order.reference === selectedId || order.id === selectedId) || (selectedId ? null : orders[0] || null);

  const filteredOrders = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return orders.filter((order) => {
      const status = serviceStatusLabel(order.status);
      return (filter === 'All' || status === filter) &&
        (!needle || `${order.reference} ${order.title} ${serviceTypeLabel(order.type)}`.toLowerCase().includes(needle));
    });
  }, [orders, filter, query]);

  function navigatePage(nextPage, reference) {
    setPage(nextPage);
    setQuery('');
    if (reference) setSelectedId(reference);
    const path = CLIENT_PAGE_PATHS[nextPage] || '/client';
    router.push(nextPage === 'tracking' && reference ? `${path}?order=${encodeURIComponent(reference)}` : path);
  }

  async function runAction(action, successMessage) {
    setBusy(true);
    setError('');
    let result;
    try {
      result = await action();
    } catch (reason) {
      setError(reason.message || 'The request could not be completed.');
      setBusy(false);
      return false;
    }
    try {
      await loadWorkspace();
    } catch (reason) {
      setError('The change was saved, but the workspace could not refresh. ' + (reason.message || 'Refresh the page to see the latest data.'));
    } finally {
      setBusy(false);
    }
    setNotice(successMessage);
    return result || true;
  }

  async function submitService(form) {
    const result = await runAction(
      () => requestJson('/api/client/services', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form)
      }),
      'Your service request was submitted.'
    );
    if (result && result.service) {
      setSelectedId(result.service.reference);
      setWorkspace((current) => current ? {
        ...current,
        services: [result.service, ...(current.services || []).filter((service) => service.id !== result.service.id)]
      } : current);
      navigatePage('tracking', result.service.reference);
    }
  }

  async function serviceAction(order, action, message = '') {
    return runAction(
      () => requestJson(`/api/client/services/${encodeURIComponent(order.id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, message })
      }),
      action === 'approve' ? 'Quote approved. TGNE will schedule the work.' : action === 'cancel' ? 'Request cancelled.' : 'Message sent to TGNE.'
    );
  }

  async function saveProfile(event) {
    event.preventDefault();
    await runAction(
      () => requestJson('/api/client/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(profileDraft)
      }),
      'Your profile has been updated.'
    );
  }

  async function sendSupport(form) {
    const result = await runAction(
      () => requestJson('/api/client/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form)
      }),
      'Your message was sent to the TGNE service desk.'
    );
    return result;
  }

  async function handleLogout() {
    setLogoutBusy(true);
    setError('');
    clearCachedUserState();
    try {
      await requestJson('/api/auth/logout', { method: 'POST' });
      window.location.assign('/login');
    } catch (reason) {
      setError(reason.message || 'Sign out could not be completed. Please try again.');
      setLogoutBusy(false);
    }
  }

  function openOrder(reference) {
    setSelectedId(reference);
    navigatePage('tracking', reference);
  }

  function renderPage() {
    if (!workspace) return <div className={styles.panel} role={error ? 'alert' : 'status'}>{error || (loading ? 'Loading your workspace…' : 'Your workspace is unavailable.')}</div>;

    if (page === 'overview') {
      return <>
        <section className={styles.welcome}>
          <div className={styles.welcomeCopy}>
            <span className={styles.welcomeEyebrow}>TGNE client workspace</span>
            <h2>Welcome back, {clientName}</h2>
            <p>Track service work, review quotes and submit your next request.</p>
            <div className={styles.welcomeActions}><button type="button" className={styles.primaryButton} onClick={() => navigatePage('new-order')}><Icon name="plus" /> New service request</button></div>
          </div>
          <div className={styles.welcomeStats}><div><strong>{activeOrders.length}</strong><span>Open requests</span></div><div><strong>{quoteOrders.length}</strong><span>Quotes to review</span></div></div>
        </section>
        <section className={styles.metrics} aria-label="Account overview">
          <Metric label="Open requests" value={activeOrders.length} detail="Awaiting action or in progress" />
          <Metric label="Quotes to review" value={quoteOrders.length} detail="Ready for your approval" tone="amber" />
          <Metric label="Outstanding invoices" value={money(outstanding)} detail="Open account balance" tone="blue" />
          <Metric label="Completed services" value={orders.filter((order) => order.status === 'COMPLETED').length} detail="Work delivered" tone="green" />
        </section>
        <section className={styles.contentGrid}>
          <div className={styles.panel}><div className={styles.panelHeader}><div><h2>Recent requests</h2><p>Current work with TGNE Solutions.</p></div><button className={styles.textButton} type="button" onClick={() => navigatePage('orders')}>View all <Icon name="arrow" size={15} /></button></div><OrderTable orders={orders.slice(0, 4)} onTrack={openOrder} /></div>
          <div className={styles.panel}><div className={styles.panelHeader}><div><h2>Quotes to review</h2><p>Approve a quote to move work into scheduling.</p></div></div><QuoteList orders={quoteOrders} busy={busy} onAccept={(order) => serviceAction(order, 'approve')} onRequestChanges={(order) => serviceAction(order, 'message', 'Please contact me to discuss changes to this quote.')} /></div>
        </section>
      </>;
    }

    if (page === 'new-order') return <NewOrderForm busy={busy} error={error} onSubmit={submitService} />;

    if (page === 'profile') {
      if (!profileDraft) return <div className={styles.panel} role="status">Loading your profile…</div>;
      return <form className={styles.panel} onSubmit={saveProfile}>
        <div className={styles.panelHeader}><div><h2>Profile information</h2><p>These details are attached to your authenticated account.</p></div></div>
        <div className={styles.formRow}><label className={styles.formField}>Name<input value={workspace.user?.name || ''} readOnly /></label><label className={styles.formField}>Email address<input value={clientEmail} readOnly /></label></div>
        <div className={styles.formRow}><label className={styles.formField}>Company name<input value={profileDraft.companyName} onChange={(event) => setProfileDraft({ ...profileDraft, companyName: event.target.value })} maxLength={160} /></label><label className={styles.formField}>Phone number<input value={profileDraft.phone} onChange={(event) => setProfileDraft({ ...profileDraft, phone: event.target.value })} maxLength={40} /></label></div>
        <label className={styles.formField}>Address<input value={profileDraft.address} onChange={(event) => setProfileDraft({ ...profileDraft, address: event.target.value })} maxLength={300} /></label>
        <div className={styles.formRow}><label className={styles.formField}>Region<input value={profileDraft.region} onChange={(event) => setProfileDraft({ ...profileDraft, region: event.target.value })} maxLength={60} /></label><label className={styles.formField}>City<input value={profileDraft.city} onChange={(event) => setProfileDraft({ ...profileDraft, city: event.target.value })} maxLength={80} /></label></div>
        <label className={styles.formField}>Ghana Card<input value={profileDraft.ghanaCard} onChange={(event) => setProfileDraft({ ...profileDraft, ghanaCard: event.target.value })} maxLength={40} /></label>
        <button className={styles.primaryButton} type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
      </form>;
    }

    if (page === 'settings') return <div className={styles.panel}><div className={styles.panelHeader}><div><h2>Account settings</h2><p>Account access is managed by TGNE Solutions.</p></div></div><p>Signed in as <strong>{clientEmail}</strong>.</p><button type="button" className={styles.secondaryButton} onClick={() => navigatePage('profile')}>Manage profile details</button></div>;

    if (page === 'orders') {
      const statuses = ['All', ...SERVICE_STATUSES.map((status) => status.label)];
      return <><div className={styles.toolbar}><div className={styles.filters} aria-label="Filter requests by status">{statuses.map((status) => <button type="button" key={status} className={`${styles.filterButton} ${filter === status ? styles.filterActive : ''}`} onClick={() => setFilter(status)}>{status}</button>)}</div><label className={styles.searchBox}><Icon name="search" size={17} /><span className={styles.srOnly}>Search service requests</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search requests…" /></label></div><div className={styles.panel}><OrderTable orders={filteredOrders} onTrack={openOrder} /></div></>;
    }

    if (page === 'tracking') {
      if (!selectedOrder) return <div className={styles.panel}><div className={styles.emptyState}><span>Request not found</span><p>Choose a request from your list to see details and progress.</p></div><button type="button" className={styles.textButton} onClick={() => navigatePage('orders')}>View my requests</button></div>;
      return <div className={styles.trackingGrid}>
        <div className={styles.trackingMain}>
          <div className={styles.panel}><div className={styles.orderHeading}><div><span className={styles.orderId}>{selectedOrder.reference}</span><h2>{selectedOrder.title}</h2></div><Status value={selectedOrder.status} /></div><p className={styles.panelDescription}>{selectedOrder.description}</p><div className={styles.detailGrid}><Detail label="Service" value={businessServiceTypeLabel(selectedOrder.type)} /><Detail label="Assigned to" value={selectedOrder.assignedTo?.name || 'Awaiting assignment'} /><Detail label="Scheduled" value={formatDate(selectedOrder.scheduledFor)} /><Detail label="Quote" value={money(selectedOrder.quoteAmount)} /></div>{!['COMPLETED', 'CANCELLED'].includes(selectedOrder.status) ? <button className={styles.secondaryButton} type="button" disabled={busy} onClick={() => serviceAction(selectedOrder, 'cancel')}>Cancel request</button> : null}</div>
          <MessagesPanel updates={selectedOrder.updates || []} busy={busy} onSend={(message) => serviceAction(selectedOrder, 'message', message)} />
        </div>
        <div className={styles.panel}><div className={styles.panelHeader}><div><h2>Request progress</h2><p>Updates for {selectedOrder.reference}</p></div></div><ol className={styles.timeline}>{SERVICE_STATUSES.filter((item) => item.value !== 'CANCELLED').map((item, index) => {
          const currentIndex = SERVICE_STATUSES.filter((entry) => entry.value !== 'CANCELLED').findIndex((entry) => entry.value === selectedOrder.status);
          return <li className={index <= currentIndex ? styles.timelineDone : ''} key={item.value}><span className={styles.timelineDot}>{index < currentIndex ? <Icon name="check" size={13} /> : null}</span><span><strong>{item.label}</strong><small>{item.value === selectedOrder.status ? 'Current status' : ''}</small></span></li>;
        })}</ol></div>
      </div>;
    }

    if (page === 'quotes') return <div className={styles.narrowColumn}><QuoteList orders={quoteOrders} busy={busy} onAccept={(order) => serviceAction(order, 'approve')} onRequestChanges={(order) => serviceAction(order, 'message', 'Please contact me to discuss changes to this quote.')} /></div>;

    if (page === 'invoices') return <InvoiceList invoices={invoices} />;

    if (page === 'documents') return <DocumentList documents={documents} />;

    if (page === 'team') return <div className={styles.panel}><div className={styles.panelHeader}><div><h2>Account team</h2><p>TGNE will share service assignments and updates in each request.</p></div></div><p>For team access or account changes, send a message to the service desk.</p><button className={styles.secondaryButton} type="button" onClick={() => navigatePage('support')}>Contact support</button></div>;

    if (page === 'support') return <SupportForm orders={orders} busy={busy} onSubmit={sendSupport} onTrack={openOrder} />;

    return <div className={styles.panel}><p>This workspace page is not available.</p></div>;
  }

  const firstName = String(workspace?.user?.name || user?.name || 'Client').trim().split(/\s+/)[0];

  return (
    <div className={styles.portal}>
      <aside className={styles.sidebar}>
        <a className={styles.brand} href="/client" aria-label="TGNE Solutions client workspace">
          <span className={styles.brandMark}><Image src="/assets/tgne-logo.png" alt="" width={46} height={46} priority unoptimized /></span><span><strong>TGNE Solutions</strong><small>CLIENT WORKSPACE</small></span>
        </a>
        <div className={styles.workspaceLabel}>YOUR ACCOUNT</div>
        <nav className={styles.navigation} aria-label="Client workspace navigation">
          {NAV_ITEMS.map(([id, label]) => <button type="button" key={id} className={`${styles.navItem} ${page === id ? styles.navActive : ''}`} aria-current={page === id ? 'page' : undefined} onClick={() => navigatePage(id)}><Icon name={id === 'overview' ? 'grid' : id === 'new-order' ? 'plus' : id === 'orders' ? 'list' : id === 'quotes' ? 'file' : id === 'invoices' ? 'receipt' : id === 'documents' ? 'folder' : id === 'support' ? 'help' : 'users'} /><span>{label}</span>{id === 'quotes' && quoteOrders.length > 0 ? <span className={styles.navCount}>{quoteOrders.length}</span> : null}</button>)}
        </nav>
        <div className={styles.sidebarFooter}><div className={styles.userCard}><span className={styles.avatar}>{clientName.slice(0, 2).toUpperCase()}</span><span><strong>{clientName}</strong><small>{workspace?.profile?.clientCode || 'Client account'}</small></span></div></div>
      </aside>
      <main className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}><span>TGNE</span><span className={styles.breadcrumbDivider}>/</span><strong>{PAGE_TITLES[page] || 'Overview'}</strong></div>
          <div className={styles.topbarActions}><span className={styles.profileAvatar} aria-label={clientName}>{clientName.slice(0, 1).toUpperCase()}</span><button type="button" className={styles.logoutButton} onClick={handleLogout} disabled={logoutBusy}><Icon name="logout" size={15} />{logoutBusy ? 'Signing out…' : 'Sign out'}</button></div>
        </header>
        <div className={styles.content}>
          <div className={styles.pageIntro}><div><h1>{PAGE_TITLES[page] || 'Overview'}</h1><p>{workspace?.profile?.companyName || clientName}{workspace?.profile?.city || workspace?.profile?.region ? ` · ${workspace.profile.city || workspace.profile.region}` : ''}</p></div>{page === 'overview' ? <button className={styles.secondaryButton} type="button" onClick={() => navigatePage('new-order')}><Icon name="plus" size={16} /> New request</button> : null}</div>
          {error ? <p className={styles.formError} role="alert">{error}</p> : null}
          {notice ? <div className={styles.toast} role="status"><Icon name="check" size={17} />{notice}<button type="button" aria-label="Dismiss message" onClick={() => setNotice('')}>×</button></div> : null}
          {renderPage()}
          <footer className={styles.footer}><span>© {new Date().getFullYear()} TGNE Solutions</span><span>Requests and account details are securely linked to your workspace.</span></footer>
        </div>
      </main>
    </div>
  );
}

function Detail({ label, value }) {
  return <div className={styles.detail}><span>{label}</span><strong>{value || '—'}</strong></div>;
}

function NewOrderForm({ busy, error, onSubmit }) {
  const [type, setType] = useState(TGNE_SERVICE_TYPES[0]?.value || 'OTHER');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  return <div className={styles.formLayout}>
    <form className={styles.panel} onSubmit={(event) => { event.preventDefault(); onSubmit({ type, title: title.trim(), description: description.trim(), location: location.trim(), priority }); }}>
      <fieldset className={styles.serviceFieldset}><legend>Choose a service</legend><div className={styles.serviceChoices}>{TGNE_SERVICE_TYPES.map((service) => <label className={`${styles.serviceChoice} ${type === service.value ? styles.serviceChoiceActive : ''}`} key={service.value}><input type="radio" name="service" value={service.value} checked={type === service.value} onChange={() => setType(service.value)} /><span>{service.label}</span></label>)}</div></fieldset>
      <label className={styles.formField}>Request title<input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={6} maxLength={160} placeholder="e.g. Refresh our company website" /></label>
      <label className={styles.formField}>What do you need?<textarea value={description} onChange={(event) => setDescription(event.target.value)} required minLength={15} maxLength={4000} rows={5} placeholder="Share your goals, requirements, quantities or other helpful details." /></label>
      <label className={styles.formField}>Project location <span>(optional)</span><input value={location} onChange={(event) => setLocation(event.target.value)} maxLength={160} placeholder="Town, region or remote" /></label>
      <label className={styles.formField}>Priority<select value={priority} onChange={(event) => setPriority(event.target.value)}>{SERVICE_PRIORITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      {error ? <p className={styles.formError} role="alert">{error}</p> : null}
      <button className={styles.primaryButton} type="submit" disabled={busy}><Icon name="arrow" size={17} />{busy ? 'Submitting…' : 'Submit request'}</button>
    </form>
    <aside className={styles.panel}><h2>What happens next</h2><ol className={styles.steps}><li><span>1</span><p>TGNE reviews your requirements.</p></li><li><span>2</span><p>We prepare a quote and clarify any questions.</p></li><li><span>3</span><p>Approve the quote to schedule the work.</p></li><li><span>4</span><p>Follow updates and documents in this workspace.</p></li></ol><div className={styles.supportNote}><strong>Need help?</strong><span>Contact the TGNE service desk through Support.</span></div></aside>
  </div>;
}

function QuoteList({ orders, busy, onAccept, onRequestChanges }) {
  if (!orders.length) return <div className={styles.emptyState}><span>No quotes to review</span><p>New quotes from TGNE will appear here.</p></div>;
  return <div className={styles.quoteList}>{orders.map((order) => <article className={styles.quoteItem} key={order.id}><span className={styles.orderId}>{order.reference}</span><h3>{order.title}</h3><strong className={styles.quoteAmount}>{money(order.quoteAmount)}</strong><p>{businessServiceTypeLabel(order.type)} · {order.scheduledFor ? `proposed for ${formatDate(order.scheduledFor)}` : 'Schedule to be confirmed'}</p><div className={styles.quoteActions}><button type="button" className={styles.primaryButton} disabled={busy} onClick={() => onAccept(order)}>Approve quote</button><button type="button" className={styles.secondaryButton} disabled={busy} onClick={() => onRequestChanges(order)}>Request changes</button></div></article>)}</div>;
}

function MessagesPanel({ updates, busy, onSend }) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (message.trim().length < 2) {
      setError('Write a short message first.');
      return;
    }
    setError('');
    const sent = await onSend(message.trim());
    if (sent) setMessage('');
  }
  return <section className={styles.panel}><div className={styles.panelHeader}><div><h2>Request updates</h2><p>Messages from you and the TGNE service team.</p></div></div><div className={styles.messages}>{updates.length ? updates.map((item) => <article className={`${styles.message} ${item.authorRole === 'CLIENT' ? styles.messageOwn : ''}`} key={item.id}><strong>{item.authorRole === 'CLIENT' ? 'You' : 'TGNE'}</strong><p>{item.message}</p></article>) : <p className={styles.quietEmpty}>No updates yet.</p>}</div><form className={styles.messageForm} onSubmit={submit}><label className={styles.srOnly} htmlFor="request-message">Message TGNE about this request</label><input id="request-message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} placeholder="Message the TGNE team…" required /><button className={styles.primaryButton} type="submit" disabled={busy}>Send</button></form>{error ? <p className={styles.formError} role="alert">{error}</p> : null}</section>;
}

function InvoiceList({ invoices }) {
  if (!invoices.length) return <div className={styles.panel}><div className={styles.emptyState}><span>No invoices yet</span><p>Invoices for approved work will appear here.</p></div></div>;
  return <div className={styles.panel}><div className={styles.panelHeader}><div><h2>Invoices</h2><p>Invoices issued for your TGNE services.</p></div></div><div className={styles.tableScroll}><table className={styles.orderTable}><thead><tr><th>Invoice</th><th>Description</th><th>Issued</th><th>Due</th><th>Amount</th><th>Status</th></tr></thead><tbody>{invoices.map((invoice) => <tr key={invoice.id}><td><strong>{invoice.number}</strong></td><td>{invoice.description}</td><td>{formatDate(invoice.issueDate)}</td><td>{formatDate(invoice.dueDate)}</td><td className={styles.amount}>{money(invoice.amount)}</td><td><span className={`${styles.status} ${invoice.status === 'PAID' ? styles.status_complete : styles.status_quote}`}>{invoice.status === 'PAID' ? 'Paid' : invoice.status}</span></td></tr>)}</tbody></table></div><p className={styles.panelDescription}>For payment options or receipts, contact TGNE Support. Payments are never marked as complete from this page.</p></div>;
}

function DocumentList({ documents }) {
  if (!documents.length) return <div className={styles.panel}><div className={styles.emptyState}><span>No shared documents</span><p>Documents shared by TGNE will appear here.</p></div></div>;
  return <div className={styles.panel}><div className={styles.panelHeader}><div><h2>Documents from TGNE</h2><p>Files attached to your client workspace.</p></div></div><div className={styles.documentList}>{documents.map((document) => {
    const url = safeDocumentUrl(document.fileUrl);
    return <article className={styles.documentRow} key={document.id}><span className={styles.documentIcon}><Icon name="file" /></span><span><strong>{document.name}</strong><small>{documentTypeLabel(document.type)} · {documentStatusLabel(document.status)}</small></span>{url ? <a href={url} target="_blank" rel="noreferrer">Open</a> : <span className={styles.quietLabel}>Unavailable</span>}</article>;
  })}</div></div>;
}

function SupportForm({ orders, busy, onSubmit, onTrack }) {
  const [orderId, setOrderId] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  async function submit(event) {
    event.preventDefault();
    const sent = await onSubmit({ subject: subject.trim(), message: message.trim() });
    if (sent) {
      setSubject('');
      setMessage('');
    }
  }
  return <div className={styles.formLayout}><form className={styles.panel} onSubmit={submit}><h2>Contact TGNE Support</h2><p className={styles.panelDescription}>Send a message to the service desk. It will appear in the TGNE admin inquiry queue.</p><label className={styles.formField}>Subject<input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={160} /></label><label className={styles.formField}>Your message<textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={5} minLength={10} maxLength={2000} required placeholder="How can we help?" /></label><button className={styles.primaryButton} type="submit" disabled={busy}><Icon name="arrow" size={17} />{busy ? 'Sending…' : 'Send to TGNE'}</button></form><aside className={styles.panel}><h2>Request conversations</h2><p className={styles.panelDescription}>For an update on a specific service request, open its details and message the assigned team.</p>{orders.length ? <label className={styles.formField}>Choose a request<select value={orderId} onChange={(event) => setOrderId(event.target.value)}><option value="">Select a request</option>{orders.map((order) => <option key={order.id} value={order.reference}>{order.reference} · {order.title}</option>)}</select></label> : null}{orderId ? <button className={styles.textButton} type="button" onClick={() => onTrack(orderId)}>Open request conversation <Icon name="arrow" size={15} /></button> : null}</aside></div>;
}
