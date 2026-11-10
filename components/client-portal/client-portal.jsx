'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import styles from './client-portal.module.css';
import {
  CLIENT_DEMO_STORAGE_KEY,
  DEMO_ORDERS,
  ORDER_STATUSES,
  SERVICE_TYPES
} from '../../lib/client-demo-data';

const CLIENT_NAME = 'Volta Foods Ltd';
const CLIENT_LOCATION = 'Tema, Ghana';
const NAV_ITEMS = {
  client: [
    { id: 'overview', label: 'Overview', icon: 'grid' },
    { id: 'new-order', label: 'New order', icon: 'plus' },
    { id: 'orders', label: 'My orders', icon: 'list' },
    { id: 'tracking', label: 'Track an order', icon: 'route' },
    { id: 'quotes', label: 'Quotes', icon: 'file' },
    { id: 'invoices', label: 'Invoices', icon: 'receipt' },
    { id: 'documents', label: 'Documents', icon: 'folder' },
    { id: 'team', label: 'Team', icon: 'users' },
    { id: 'support', label: 'Support', icon: 'help' }
  ],
  admin: [
    { id: 'overview', label: 'Overview', icon: 'grid' },
    { id: 'orders', label: 'Service requests', icon: 'list' },
    { id: 'clients', label: 'Clients', icon: 'users' }
  ]
};

const PAGE_TITLES = {
  overview: 'Overview',
  'new-order': 'Place a new order',
  orders: 'My orders',
  tracking: 'Track an order',
  quotes: 'Quotes',
  invoices: 'Invoices',
  documents: 'Documents',
  team: 'Your team',
  support: 'Support',
  clients: 'Clients'
};

function Icon({ name, size = 18 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    list: <><path d="M9 6h12M9 12h12M9 18h12" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></>,
    route: <><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18h3a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></>,
    receipt: <><path d="M4 3v18l3-2 3 2 3-2 3 2 4-2V3l-4 2-3-2-3 2-3-2z" /><path d="M8 9h8M8 13h6" /></>,
    folder: <><path d="M3 6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    help: <><circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M10 21h4" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>
  };
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name] || paths.file}
    </svg>
  );
}

function money(amount) {
  if (!amount) return 'To be quoted';
  return `GH₵ ${Number(amount).toLocaleString('en-GH')}`;
}

function formatDate(value) {
  if (!value) return 'Not set';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? 'Not set'
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusTone(status) {
  if (status === 'In progress') return 'progress';
  if (status === 'Approved') return 'approved';
  if (status === 'Quote issued') return 'quote';
  if (status === 'Completed') return 'complete';
  return 'submitted';
}

function makeReference() {
  return `SV-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function Metric({ label, value, detail, tone = 'default' }) {
  return (
    <article className={`${styles.metric} ${styles[`metric_${tone}`]}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function OrderTable({ orders, onTrack, admin = false, onStatusChange }) {
  if (!orders.length) {
    return <div className={styles.emptyState}><span>No matching orders</span><p>Try another filter or search term.</p></div>;
  }
  return (
    <div className={styles.tableScroll}>
      <table className={styles.orderTable}>
        <thead>
          <tr>
            <th>Order</th>
            {admin && <th>Client</th>}
            <th>Service</th>
            <th>Due</th>
            <th>Status</th>
            <th>Value</th>
            <th><span className={styles.srOnly}>Action</span></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td><strong>{order.id}</strong><span className={styles.cellSecondary}>{order.title}</span></td>
              {admin && <td>{order.client}</td>}
              <td>{SERVICE_TYPES[order.type] || 'Other service'}</td>
              <td>{formatDate(order.due)}</td>
              <td>
                {admin ? (
                  <label className={styles.srOnly} htmlFor={`status-${order.id}`}>Update status for {order.title}</label>
                ) : null}
                {admin ? (
                  <select
                    id={`status-${order.id}`}
                    className={`${styles.statusSelect} ${styles[`status_${statusTone(order.status)}`]}`}
                    value={order.status}
                    onChange={(event) => onStatusChange(order.id, event.target.value)}
                  >
                    {ORDER_STATUSES.map((status) => <option key={status}>{status}</option>)}
                  </select>
                ) : (
                  <span className={`${styles.status} ${styles[`status_${statusTone(order.status)}`]}`}>{order.status}</span>
                )}
              </td>
              <td className={styles.amount}>{money(order.amount)}</td>
              <td><button className={styles.textButton} type="button" onClick={() => onTrack(order.id)}>{admin ? 'Open' : 'View'}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ClientPortal({ mode, user }) {
  const isAdmin = mode === 'admin';
  const clientName = user?.name || 'Valued Client';

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } catch {
      // Ignore network errors; still redirect
    }
    window.location.href = '/login';
  }
  const [orders, setOrders] = useState(DEMO_ORDERS);
  const [page, setPage] = useState('overview');
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(DEMO_ORDERS[0].id);
  const [notice, setNotice] = useState('');
  const [storageIssue, setStorageIssue] = useState('');

  useEffect(() => {
    function loadSavedOrders() {
      try {
        const saved = window.localStorage.getItem(CLIENT_DEMO_STORAGE_KEY);
        if (saved === null) {
          window.localStorage.setItem(CLIENT_DEMO_STORAGE_KEY, JSON.stringify(DEMO_ORDERS));
          return;
        }
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed) || parsed.some((order) => !order || typeof order.id !== 'string' || typeof order.status !== 'string')) {
          throw new Error('Saved demo orders are not valid.');
        }
        setOrders(parsed);
      } catch {
        setStorageIssue('Local demo data could not be loaded. This view is using its sample data for now.');
      }
    }

    function handleStorage(event) {
      if (event.key !== CLIENT_DEMO_STORAGE_KEY) return;
      if (event.newValue === null) {
        setOrders(DEMO_ORDERS);
        return;
      }
      try {
        const parsed = JSON.parse(event.newValue);
        if (!Array.isArray(parsed) || parsed.some((order) => !order || typeof order.id !== 'string' || typeof order.status !== 'string')) {
          throw new Error('Saved demo orders are not valid.');
        }
        setOrders(parsed);
      } catch {
        setStorageIssue('Changes in another tab could not be loaded because the saved demo data is invalid.');
      }
    }

    loadSavedOrders();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const saveOrders = (nextOrders, message) => {
    setOrders(nextOrders);
    try {
      window.localStorage.setItem(CLIENT_DEMO_STORAGE_KEY, JSON.stringify(nextOrders));
      setStorageIssue('');
    } catch {
      setStorageIssue('This browser could not save local demo changes. They will be lost when you leave this page.');
    }
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3500);
  };

  const activeOrders = useMemo(() => orders.filter((order) => order.status !== 'Completed'), [orders]);
  const quoteOrders = useMemo(() => orders.filter((order) => order.status === 'Quote issued'), [orders]);
  const dueAmount = useMemo(
    () => orders.filter((order) => order.amount && !order.paid && !['Quote issued', 'Submitted'].includes(order.status)).reduce((total, order) => total + Number(order.amount), 0),
    [orders]
  );
  const filteredOrders = useMemo(() => orders.filter((order) => {
    const matchesStatus = filter === 'All' || order.status === filter;
    const value = `${order.id} ${order.title} ${order.client} ${SERVICE_TYPES[order.type] || ''}`.toLowerCase();
    return matchesStatus && value.includes(query.toLowerCase().trim());
  }), [orders, filter, query]);
  const selectedOrder = orders.find((order) => order.id === selectedId) || orders[0];
  const navItems = NAV_ITEMS[mode] || NAV_ITEMS.client;

  const goToOrder = (orderId) => {
    setSelectedId(orderId);
    setPage('tracking');
  };

  const updateOrder = (orderId, transform, message) => {
    const nextOrders = orders.map((order) => order.id === orderId ? transform(order) : order);
    saveOrders(nextOrders, message);
  };

  const renderOverview = () => {
    if (isAdmin) {
      const needsAttention = orders.filter((order) => ['Submitted', 'Quote issued'].includes(order.status));
      const clientCount = new Set(orders.map((order) => order.client).filter(Boolean)).size;
      return (
        <>
          <section className={`${styles.welcome} ${styles.welcomeAdmin}`}>
            <div>
              <span className={styles.welcomeEyebrow}>TGNE service desk</span>
              <h2>Good morning, Kofi</h2>
              <p>Here’s the client work that needs your attention today.</p>
            </div>
            <div className={styles.welcomeDate}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          </section>
          <section className={styles.metrics} aria-label="Service overview">
            <Metric label="Active requests" value={activeOrders.length} detail="Open across all clients" />
            <Metric label="Needs review" value={needsAttention.length} detail="New requests and quotes" tone="amber" />
            <Metric label="Quotes to approve" value={quoteOrders.length} detail="Waiting on the client" tone="blue" />
            <Metric label="Active clients" value={clientCount} detail="With service activity" tone="green" />
          </section>
          <section className={styles.contentGrid}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <div><h2>Recent service requests</h2><p>The latest work across your client accounts.</p></div>
                <button className={styles.textButton} type="button" onClick={() => setPage('orders')}>View all <Icon name="arrow" size={15} /></button>
              </div>
              <OrderTable orders={orders.slice(0, 4)} onTrack={goToOrder} admin onStatusChange={(id, status) => updateOrder(id, (order) => ({ ...order, status, amount: status === 'Quote issued' && !order.amount ? 3600 : order.amount }), `Order status changed to ${status}.`)} />
            </div>
            <div className={styles.panel}>
              <div className={styles.panelHeader}><div><h2>Needs your attention</h2><p>Requests waiting for a TGNE action.</p></div></div>
              <div className={styles.attentionList}>
                {needsAttention.length ? needsAttention.map((order) => (
                  <button className={styles.attentionItem} key={order.id} type="button" onClick={() => goToOrder(order.id)}>
                    <span className={`${styles.attentionIcon} ${styles[`status_${statusTone(order.status)}`]}`}><Icon name={order.status === 'Submitted' ? 'clock' : 'file'} size={17} /></span>
                    <span><strong>{order.title}</strong><small>{order.client} · {order.status}</small></span>
                    <Icon name="arrow" size={16} />
                  </button>
                )) : <p className={styles.quietEmpty}>Nothing needs review right now.</p>}
              </div>
            </div>
          </section>
        </>
      );
    }
    return (
      <>
        <section className={styles.welcome}>
          <div className={styles.welcomeCopy}>
            <span className={styles.welcomeEyebrow}>Corporate client portal</span>
            <h2>Welcome back, {clientName}</h2>
            <p>Keep track of your TGNE work, review quotes and place your next service request.</p>
            <div className={styles.welcomeActions}>
              <button type="button" className={styles.primaryButton} onClick={() => setPage('new-order')}><Icon name="plus" size={15} /> Place a new order</button>
              <button type="button" className={styles.logoutButton} onClick={handleLogout}>
                <Icon name="logout" size={14} />
                Sign out
              </button>
            </div>
          </div>
          <div className={styles.welcomeStats}>
            <div><strong>{activeOrders.length}</strong><span>Open orders</span></div>
            <div><strong>{quoteOrders.length}</strong><span>Quotes to review</span></div>
          </div>
        </section>
        <section className={styles.metrics} aria-label="Account overview">
          <Metric label="Open orders" value={activeOrders.length} detail="In progress or awaiting action" />
          <Metric label="Awaiting your approval" value={quoteOrders.length} detail="Quotes issued" tone="amber" />
          <Metric label="Outstanding invoices" value={money(dueAmount)} detail="Payable now" tone="blue" />
          <Metric label="Completed this year" value={orders.filter((order) => order.status === 'Completed').length + 14} detail="Services delivered" tone="green" />
        </section>
        <section className={styles.contentGrid}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div><h2>Recent orders</h2><p>Updates from your service requests.</p></div>
              <button className={styles.textButton} type="button" onClick={() => setPage('orders')}>View all <Icon name="arrow" size={15} /></button>
            </div>
            <OrderTable orders={orders.slice(0, 4)} onTrack={goToOrder} />
          </div>
          <div className={styles.panel}>
            <div className={styles.panelHeader}><div><h2>Needs your action</h2><p>Review and respond to open quotes.</p></div></div>
            <QuoteList orders={quoteOrders} onAccept={(id) => updateOrder(id, (order) => ({ ...order, status: 'Approved' }), 'Quote accepted. TGNE will schedule your work.')} onRequestChanges={(id) => updateOrder(id, (order) => ({ ...order, messages: [...(order.messages || []), { sender: 'You', text: 'Please contact me to discuss changes to this quote.' }] }), 'Your account manager has been notified about the requested changes.')} />
          </div>
        </section>
      </>
    );
  };

  const renderPage = () => {
    if (page === 'overview') return renderOverview();

    if (page === 'new-order' && !isAdmin) {
      return <NewOrderForm onSubmit={(data) => {
        const order = {
          ...data,
          id: makeReference(),
          status: 'Submitted',
          amount: 0,
          assignedTo: '',
          paid: false,
          client: CLIENT_NAME,
          messages: []
        };
        saveOrders([order, ...orders], 'Order submitted. Expect a quote from TGNE within one business day.');
        setSelectedId(order.id);
        setPage('tracking');
      }} />;
    }

    if (page === 'orders') {
      const statuses = ['All', ...ORDER_STATUSES];
      return (
        <>
          <div className={styles.toolbar}>
            <div className={styles.filters} aria-label="Filter orders by status">
              {statuses.map((status) => <button type="button" key={status} className={`${styles.filterButton} ${filter === status ? styles.filterActive : ''}`} onClick={() => setFilter(status)}>{status}</button>)}
            </div>
            <label className={styles.searchBox}><Icon name="search" size={17} /><span className={styles.srOnly}>Search orders</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search orders…" /></label>
          </div>
          <div className={styles.panel}><OrderTable orders={filteredOrders} onTrack={goToOrder} admin={isAdmin} onStatusChange={(id, status) => updateOrder(id, (order) => ({ ...order, status, amount: status === 'Quote issued' && !order.amount ? 3600 : order.amount }), `Order status changed to ${status}.`)} /></div>
        </>
      );
    }

    if (page === 'tracking' && isAdmin && selectedOrder) {
      return <div className={styles.trackingGrid}>
        <div className={styles.trackingMain}>
          <div className={styles.panel}>
            <div className={styles.orderHeading}><div><span className={styles.orderId}>{selectedOrder.id} · {selectedOrder.client}</span><h2>{selectedOrder.title}</h2></div><select aria-label="Update order status" className={`${styles.statusSelect} ${styles[`status_${statusTone(selectedOrder.status)}`]}`} value={selectedOrder.status} onChange={(event) => updateOrder(selectedOrder.id, (order) => ({ ...order, status: event.target.value, amount: event.target.value === 'Quote issued' && !order.amount ? 3600 : order.amount }), `Order status changed to ${event.target.value}.`)}>{ORDER_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></div>
            <p className={styles.panelDescription}>{selectedOrder.description || 'No request details were provided.'}</p>
            <div className={styles.detailGrid}>
              <Detail label="Service" value={SERVICE_TYPES[selectedOrder.type] || 'Other service'} />
              <Detail label="Assigned to" value={selectedOrder.assignedTo || 'Awaiting assignment'} />
              <Detail label="Due date" value={formatDate(selectedOrder.due)} />
              <Detail label="Order value" value={money(selectedOrder.amount)} />
            </div>
          </div>
          <MessagesPanel order={selectedOrder} sender="TGNE" onSend={(text) => updateOrder(selectedOrder.id, (order) => ({ ...order, messages: [...(order.messages || []), { sender: 'TGNE', text }] }), 'Message added to the client conversation.')} />
        </div>
        <div className={styles.panel}>
          <div className={styles.panelHeader}><div><h2>Order progress</h2><p>Visible to the client portal.</p></div></div>
          <ol className={styles.timeline}>
            {ORDER_STATUSES.map((status, index) => <li className={index <= ORDER_STATUSES.indexOf(selectedOrder.status) ? styles.timelineDone : ''} key={status}><span className={styles.timelineDot}>{index < ORDER_STATUSES.indexOf(selectedOrder.status) ? <Icon name="check" size={13} /> : null}</span><span><strong>{status}</strong><small>{status === selectedOrder.status ? 'Current status' : ''}</small></span></li>)}
          </ol>
        </div>
      </div>;
    }

    if (page === 'tracking' && !isAdmin && selectedOrder) {
      const currentIndex = ORDER_STATUSES.indexOf(selectedOrder.status);
      return <div className={styles.trackingGrid}>
        <div className={styles.trackingMain}>
          <div className={styles.panel}>
            <div className={styles.orderHeading}><div><span className={styles.orderId}>{selectedOrder.id}</span><h2>{selectedOrder.title}</h2></div><span className={`${styles.status} ${styles[`status_${statusTone(selectedOrder.status)}`]}`}>{selectedOrder.status}</span></div>
            <div className={styles.detailGrid}>
              <Detail label="Service" value={SERVICE_TYPES[selectedOrder.type] || 'Other service'} />
              <Detail label="Assigned to" value={selectedOrder.assignedTo || 'Awaiting assignment'} />
              <Detail label="Due date" value={formatDate(selectedOrder.due)} />
              <Detail label="Order value" value={money(selectedOrder.amount)} />
            </div>
          </div>
          <MessagesPanel order={selectedOrder} onSend={(text) => updateOrder(selectedOrder.id, (order) => ({ ...order, messages: [...(order.messages || []), { sender: 'You', text }] }), 'Message sent to TGNE.')} />
        </div>
        <div className={styles.panel}>
          <div className={styles.panelHeader}><div><h2>Order progress</h2><p>Updates for {selectedOrder.id}</p></div></div>
          <ol className={styles.timeline}>
            {ORDER_STATUSES.map((status, index) => <li className={index <= currentIndex ? styles.timelineDone : ''} key={status}><span className={styles.timelineDot}>{index < currentIndex ? <Icon name="check" size={13} /> : null}</span><span><strong>{status}</strong><small>{status === selectedOrder.status ? 'Current status' : ''}</small></span></li>)}
          </ol>
        </div>
      </div>;
    }

    if (page === 'quotes' && !isAdmin) {
      return <div className={styles.narrowColumn}><QuoteList orders={quoteOrders} onAccept={(id) => updateOrder(id, (order) => ({ ...order, status: 'Approved' }), 'Quote accepted. TGNE will schedule your work.')} onRequestChanges={(id) => updateOrder(id, (order) => ({ ...order, messages: [...(order.messages || []), { sender: 'You', text: 'Please contact me to discuss changes to this quote.' }] }), 'Your account manager has been notified about the requested changes.')} /></div>;
    }

    if (page === 'invoices' && !isAdmin) {
      const invoices = orders.filter((order) => order.amount > 0 && !['Quote issued', 'Submitted'].includes(order.status));
      return <div className={styles.panel}><InvoiceList orders={invoices} onPay={(id) => updateOrder(id, (order) => ({ ...order, paid: true }), 'Payment marked as received in this local demo.')} /></div>;
    }

    if (page === 'documents' && !isAdmin) {
      const documents = orders.filter((order) => order.status === 'Completed' || order.amount > 0);
      return <div className={styles.panel}><div className={styles.panelHeader}><div><h2>Documents from TGNE</h2><p>Demo documents linked to your service orders.</p></div></div><div className={styles.documentList}>
        {documents.map((order) => <div className={styles.documentRow} key={order.id}><span className={styles.documentIcon}><Icon name="file" /></span><span><strong>{order.status === 'Completed' ? 'Service completion record' : 'Service quote'}</strong><small>{order.title} · {order.id}</small></span><span className={styles.status}>{order.status === 'Completed' ? 'Available' : 'Demo'}</span><button className={styles.iconButton} type="button" aria-label={`Download demo record for ${order.title}`} onClick={() => setNotice('Demo document downloads are not connected.') }><Icon name="download" /></button></div>)}
      </div></div>;
    }

    if (page === 'team' && !isAdmin) {
      return <div className={styles.narrowColumn}><div className={styles.panel}><div className={styles.panelHeader}><div><h2>Your TGNE contacts</h2><p>People currently supporting Volta Foods.</p></div></div><div className={styles.teamList}><TeamMember name="Kofi Asante" role="Account manager" initials="KA" /><TeamMember name="Efua Mensah" role="Print & production" initials="EM" /><TeamMember name="Yaw Boateng" role="ICT solutions" initials="YB" /></div></div></div>;
    }

    if (page === 'support' && !isAdmin) {
      return <SupportForm orders={orders} onSend={(id, text) => updateOrder(id, (order) => ({ ...order, messages: [...(order.messages || []), { sender: 'You', text }] }), 'Your message has been added to the order conversation.')} onTrack={goToOrder} />;
    }

    if (page === 'clients' && isAdmin) {
      const clients = [...new Set(orders.map((order) => order.client).filter(Boolean))];
      return <div className={styles.panel}><div className={styles.panelHeader}><div><h2>Client accounts</h2><p>Accounts represented in your local demo data.</p></div></div><div className={styles.clientList}>
        {clients.length ? clients.map((client) => {
          const clientOrders = orders.filter((order) => order.client === client);
          return <div className={styles.clientRow} key={client}><span className={styles.avatar}>{client.slice(0, 1)}</span><span className={styles.clientIdentity}><strong>{client}</strong><small>{CLIENT_LOCATION}</small></span><span className={styles.clientMeta}><strong>{clientOrders.length}</strong><small>Orders</small></span><span className={styles.clientMeta}><strong>{clientOrders.filter((order) => order.status !== 'Completed').length}</strong><small>Open</small></span></div>;
        }) : <div className={styles.emptyState}><span>No client accounts yet</span><p>New client orders will appear here.</p></div>}
      </div></div>;
    }

    if (isAdmin) return <div className={styles.panel}><div className={styles.panelHeader}><div><h2>All client service requests</h2><p>Update status here to reflect progress in the client portal.</p></div></div><OrderTable orders={filteredOrders} onTrack={goToOrder} admin onStatusChange={(id, status) => updateOrder(id, (order) => ({ ...order, status, amount: status === 'Quote issued' && !order.amount ? 3600 : order.amount }), `Order status changed to ${status}.`)} /></div>;
    return renderOverview();
  };

  return (
    <div className={styles.portal}>
      <aside className={styles.sidebar}>
        <a className={styles.brand} href={isAdmin ? '/admin' : '/client'} aria-label="TGNE Solutions dashboard">
          <span className={styles.brandMark}><Image src="/assets/tgne-logo.png" alt="" width={46} height={46} priority unoptimized /></span>
          <span><strong>TGNE</strong><small>{isAdmin ? 'SERVICE DESK' : 'CLIENT PORTAL'}</small></span>
        </a>
        <div className={styles.workspaceLabel}>{isAdmin ? 'BUSINESS' : 'YOUR ACCOUNT'}</div>
        <nav className={styles.navigation} aria-label="Dashboard navigation">
          {navItems.map((item) => {
            const count = item.id === 'quotes' ? quoteOrders.length : item.id === 'orders' && isAdmin ? activeOrders.length : 0;
            return <button type="button" key={item.id} className={`${styles.navItem} ${page === item.id ? styles.navActive : ''}`} aria-current={page === item.id ? 'page' : undefined} onClick={() => { setPage(item.id); setQuery(''); }}>
              <Icon name={item.icon} size={18} /><span>{item.label}</span>{count > 0 && <span className={styles.navCount}>{count}</span>}
            </button>;
          })}
        </nav>
        <div className={styles.sidebarFooter}>
          <div className={styles.userCard}><span className={styles.avatar}>{isAdmin ? 'KA' : 'VF'}</span><span><strong>{isAdmin ? 'Kofi Asante' : CLIENT_NAME}</strong><small>{isAdmin ? 'Business owner' : CLIENT_LOCATION}</small></span></div>
          <a className={styles.switchLink} href={isAdmin ? '/client' : '/admin'}><Icon name="logout" size={16} />{isAdmin ? 'Open client demo' : 'Open admin demo'}</a>
        </div>
      </aside>
      <main className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}><span>TGNE</span><span className={styles.breadcrumbDivider}>/</span><strong>{PAGE_TITLES[page] || 'Overview'}</strong></div>
          <div className={styles.topbarActions}>
            {!isAdmin && <label className={styles.searchBox}><Icon name="search" size={17} /><span className={styles.srOnly}>Search orders</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage('orders'); }} placeholder="Search orders…" /></label>}
            <span className={styles.demoBadge}>LOCAL DEMO</span>
            <div className={styles.profileAvatar} aria-label={isAdmin ? 'Kofi Asante' : 'Volta Foods'}>{isAdmin ? 'KA' : 'VF'}</div>
          </div>
        </header>
        <div className={styles.content}>
          <div className={styles.pageIntro}>
            <div><h1>{PAGE_TITLES[page] || 'Overview'}</h1><p>{isAdmin ? 'Manage requests and keep client work moving.' : `${CLIENT_NAME} · ${CLIENT_LOCATION}`}</p></div>
            {isAdmin && page === 'overview' ? <button className={styles.secondaryButton} type="button" onClick={() => setPage('orders')}><Icon name="list" size={16} /> View requests</button> : null}
          </div>
          {storageIssue && <p className={styles.storageNotice} role="status">{storageIssue}</p>}
          {notice && <div className={styles.toast} role="status"><Icon name="check" size={17} />{notice}<button type="button" aria-label="Dismiss message" onClick={() => setNotice('')}>×</button></div>}
          {renderPage()}
          <footer className={styles.footer}><span>© {new Date().getFullYear()} TGNE Solutions</span><span>Local demo data is saved in this browser.</span></footer>
        </div>
      </main>
    </div>
  );
}

function QuoteList({ orders, onAccept, onRequestChanges }) {
  if (!orders.length) {
    return <div className={styles.emptyState}><span>You’re all caught up</span><p>New quotes from TGNE will appear here for review.</p></div>;
  }
  return <div className={styles.quoteList}>{orders.map((order) => <article className={styles.quoteItem} key={order.id}>
    <span className={styles.orderId}>{order.id}</span><h3>{order.title}</h3>
    <strong className={styles.quoteAmount}>{money(order.amount)}</strong>
    <p>Valid for 14 days · delivery by {formatDate(order.due)}</p>
    <div className={styles.quoteActions}><button type="button" className={styles.primaryButton} onClick={() => onAccept(order.id)}>Accept quote</button><button type="button" className={styles.secondaryButton} onClick={() => onRequestChanges(order.id)}>Request changes</button></div>
  </article>)}</div>;
}

function NewOrderForm({ onSubmit }) {
  const [type, setType] = useState('web');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [due, setDue] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [formError, setFormError] = useState('');
  return <div className={styles.formLayout}>
    <form className={styles.panel} onSubmit={(event) => {
      event.preventDefault();
      if (!title.trim() || !description.trim()) {
        setFormError('Add an order title and a few details so the team can prepare your quote.');
        return;
      }
      setFormError('');
      onSubmit({ title: title.trim(), type, description: description.trim(), due, priority });
    }}>
      <fieldset className={styles.serviceFieldset}>
        <legend>Choose a service</legend>
        <div className={styles.serviceChoices}>{Object.entries(SERVICE_TYPES).map(([key, label]) => <label className={`${styles.serviceChoice} ${type === key ? styles.serviceChoiceActive : ''}`} key={key}><input type="radio" name="service" value={key} checked={type === key} onChange={() => setType(key)} /><span className={styles.serviceChoiceIcon}><Icon name={key === 'web' ? 'grid' : key === 'print' ? 'file' : key === 'ict' ? 'route' : 'folder'} /></span><span>{label}</span></label>)}</div>
      </fieldset>
      <label className={styles.formField}>Order title<input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={120} placeholder="e.g. Staff ID cards and lanyards" /></label>
      <label className={styles.formField}>What do you need?<textarea value={description} onChange={(event) => setDescription(event.target.value)} required rows={5} maxLength={2000} placeholder="Share quantities, sizes, features, references or any other useful details." /></label>
      <div className={styles.formRow}><label className={styles.formField}>Needed by<input type="date" value={due} onChange={(event) => setDue(event.target.value)} required /></label><label className={styles.formField}>Priority<select value={priority} onChange={(event) => setPriority(event.target.value)}><option>Normal</option><option>High</option><option>Urgent</option><option>Low</option></select></label></div>
      {formError && <p className={styles.formError} role="alert">{formError}</p>}
      <button className={styles.primaryButton} type="submit"><Icon name="arrow" size={17} /> Submit order</button>
    </form>
    <aside className={styles.panel}>
      <h2>What happens next</h2>
      <ol className={styles.steps}><li><span>1</span><p>TGNE reviews your request and confirms the details.</p></li><li><span>2</span><p>You receive a quote, usually within one business day.</p></li><li><span>3</span><p>Approve the quote and the team schedules your work.</p></li><li><span>4</span><p>Follow progress here, then receive delivery and your invoice.</p></li></ol>
      <div className={styles.supportNote}><strong>Need help?</strong><span>Call 055 812 2767 · Mon–Fri, 8am–5pm</span></div>
    </aside>
  </div>;
}

function Detail({ label, value }) {
  return <div className={styles.detail}><span>{label}</span><strong>{value}</strong></div>;
}

function MessagesPanel({ order, onSend, sender = 'You' }) {
  const [message, setMessage] = useState('');
  return <section className={styles.panel}>
    <div className={styles.panelHeader}><div><h2>Messages</h2><p>Keep the order conversation in one place.</p></div></div>
    <div className={styles.messages}>{(order.messages || []).length ? order.messages.map((item, index) => <article className={`${styles.message} ${item.sender === sender ? styles.messageOwn : ''}`} key={`${item.sender}-${index}`}><strong>{item.sender}</strong><p>{item.text}</p></article>) : <p className={styles.quietEmpty}>No messages yet. Send a note to your TGNE team.</p>}</div>
    <form className={styles.messageForm} onSubmit={(event) => { event.preventDefault(); if (!message.trim()) return; onSend(message.trim()); setMessage(''); }}>
      <label className={styles.srOnly} htmlFor="order-message">Message your TGNE team</label><input id="order-message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1000} placeholder="Message the TGNE team…" required /><button className={styles.primaryButton} type="submit">Send</button>
    </form>
  </section>;
}

function InvoiceList({ orders, onPay }) {
  if (!orders.length) return <div className={styles.emptyState}><span>No invoices yet</span><p>Invoices for approved work will show up here.</p></div>;
  return <div className={styles.tableScroll}><table className={styles.orderTable}><thead><tr><th>Invoice</th><th>Order</th><th>Amount</th><th>Status</th><th><span className={styles.srOnly}>Action</span></th></tr></thead><tbody>
    {orders.map((order) => <tr key={order.id}><td><strong>INV-{order.id.slice(-6)}</strong></td><td>{order.title}</td><td className={styles.amount}>{money(order.amount)}</td><td><span className={`${styles.status} ${order.paid ? styles.status_complete : styles.status_quote}`}>{order.paid ? 'Paid' : 'Due'}</span></td><td>{order.paid ? <span className={styles.quietLabel}>Receipt available</span> : <button className={styles.textButton} type="button" onClick={() => onPay(order.id)}>Mark as paid</button>}</td></tr>)}
  </tbody></table></div>;
}

function TeamMember({ name, role, initials }) {
  return <article className={styles.teamMember}><span className={styles.avatar}>{initials}</span><span><strong>{name}</strong><small>{role}</small></span><span className={styles.onlineStatus}><i />Available</span></article>;
}

function SupportForm({ orders, onSend, onTrack }) {
  const [orderId, setOrderId] = useState(orders[0]?.id || '');
  const [message, setMessage] = useState('');
  return <div className={styles.formLayout}>
    <form className={styles.panel} onSubmit={(event) => { event.preventDefault(); if (orderId && message.trim()) { onSend(orderId, message.trim()); setMessage(''); } }}>
      <h2>Contact TGNE support</h2><p className={styles.panelDescription}>Choose an order so your message reaches the right team.</p>
      <label className={styles.formField}>Related order<select value={orderId} onChange={(event) => setOrderId(event.target.value)}>{orders.map((order) => <option key={order.id} value={order.id}>{order.id} · {order.title}</option>)}</select></label>
      <label className={styles.formField}>Your message<textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={5} maxLength={1000} required placeholder="How can we help?" /></label>
      <button className={styles.primaryButton} type="submit" disabled={!orderId}><Icon name="arrow" size={17} /> Send to TGNE</button>
    </form>
    <aside className={styles.panel}><h2>Prefer to talk?</h2><p className={styles.panelDescription}>Our team is available Monday to Friday, 8am–5pm.</p><div className={styles.contactDetails}><strong>055 812 2767</strong><span>support@tgne.com</span><span>Tema, Ghana</span></div>{orderId && <button className={styles.textButton} type="button" onClick={() => onTrack(orderId)}>Open order conversation <Icon name="arrow" size={15} /></button>}</aside>
  </div>;
}
