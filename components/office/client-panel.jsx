'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DOCUMENT_TYPES,
  SERVICE_PRIORITIES,
  SERVICE_TYPES,
  documentStatusLabel,
  documentTypeLabel,
  holdingStatusLabel,
  labelFor,
  resaleStatusLabel,
  serviceStatusLabel,
  serviceTypeLabel
} from '../../lib/client-portal';
import { RESERVATION_STATUSES, TITLE_STATUSES, formatAcres, formatGhs } from '../../lib/land-commerce';
import { GHANA_REGIONS } from '../../lib/ghana-regions';
import { LAND_SITE } from '../../lib/land-site';
import { Empty, Field, Icon, Modal, PageHeading, Panel, Stat, StatusBadge, api, formatDate, formatDateTime, jsonBody, money } from './ui';

const EMPTY_WORKSPACE = {
  ready: false,
  profile: null,
  user: { name: '', email: '', phone: '' },
  holdings: [],
  reservations: [],
  resales: [],
  services: [],
  documents: [],
  watches: [],
  invoices: [],
  payments: [],
  stats: {
    reserveCount: 0,
    activeHoldings: 0,
    openServices: 0,
    liveResales: 0,
    unverifiedDocuments: 0,
    portfolio: { count: 0, acres: 0, acquisitionValue: 0, currentValue: 0, gain: 0 },
    totalInvoiced: 0,
    totalPaid: 0,
    outstanding: 0
  }
};

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'portfolio', label: 'My portfolio' },
  { key: 'buy', label: 'Buy land' },
  { key: 'resale', label: 'Resell' },
  { key: 'services', label: 'Services' },
  { key: 'payments', label: 'Payments' },
  { key: 'documents', label: 'Documents' },
  { key: 'support', label: 'Support' }
];

const EMPTY_HOLDING = {
  title: '',
  region: 'Greater Accra',
  district: '',
  community: '',
  sizeAcres: '',
  acquisitionDate: '',
  acquisitionPrice: '',
  currentValue: '',
  titleStatus: 'PENDING',
  titleNumber: '',
  coordinates: '',
  notes: ''
};

const EMPTY_RESALE = {
  holdingId: '',
  title: '',
  askingPrice: '',
  sizeAcres: '',
  region: 'Greater Accra',
  district: '',
  community: '',
  description: ''
};

const EMPTY_SERVICE = {
  type: 'WEB_DEVELOPMENT',
  title: '',
  holdingId: '',
  location: '',
  priority: 'NORMAL',
  description: ''
};

const EMPTY_DOCUMENT = {
  name: '',
  type: 'TITLE_DEED',
  holdingId: '',
  fileUrl: '',
  issuedAt: ''
};

function orderReference(invoice) {
  const number = String(invoice?.number || '');
  return number.startsWith('INV-') ? 'LL-' + number.slice(4) : '';
}

function Status({ value, label }) {
  return <StatusBadge value={value} label={label} />;
}

export default function ClientPanel({ initialTab = 'overview', user, notify, fail }) {
  const [data, setData] = useState(EMPTY_WORKSPACE);
  const [tab, setTab] = useState(TABS.some((item) => item.key === initialTab) ? initialTab : 'overview');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(null);
  const [market, setMarket] = useState({ listings: [], ready: false });
  const [marketQuery, setMarketQuery] = useState({ q: '', region: '', landType: '' });
  const [marketLoading, setMarketLoading] = useState(false);
  const [watchedOnly, setWatchedOnly] = useState(false);

  const permissions = useMemo(() => new Set(user?.permissions || []), [user]);
  const allowed = useCallback((permission) => permissions.has('*') || permissions.has(permission), [permissions]);

  const load = useCallback(async () => {
    try {
      const result = await api('/api/client/workspace');
      setData({ ...EMPTY_WORKSPACE, ...result });
      fail('');
    } catch (reason) {
      fail(reason.message);
    } finally {
      setLoading(false);
    }
  }, [fail]);

  useEffect(() => { load(); }, [load]);

  const loadMarket = useCallback(async (query = marketQuery) => {
    setMarketLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.q) params.set('q', query.q);
      if (query.region) params.set('region', query.region);
      if (query.landType) params.set('landType', query.landType);
      const result = await api('/api/client/marketplace?' + params.toString());
      setMarket({ listings: result.listings || [], ready: true });
    } catch (reason) {
      fail(reason.message);
    } finally {
      setMarketLoading(false);
    }
  }, [fail, marketQuery]);

  useEffect(() => {
    if (tab === 'buy' && !market.ready) loadMarket();
  }, [tab, market.ready, loadMarket]);

  async function run(task, success) {
    setBusy(true);
    try {
      await task();
      notify(success);
      await load();
      if (tab === 'buy') await loadMarket();
      return true;
    } catch (reason) {
      fail(reason.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  function openResale(seed = {}) {
    const holding = data.holdings.find((item) => item.id === seed.holdingId);
    setModal({
      type: 'resale',
      form: {
        ...EMPTY_RESALE,
        holdingId: holding?.id || '',
        title: holding ? 'Resale — ' + holding.title : '',
        sizeAcres: holding ? String(holding.sizeAcres) : '',
        region: holding?.region || 'Greater Accra',
        district: holding?.district || '',
        community: holding?.community || ''
      }
    });
  }

  function openService(seed = {}) {
    const holding = data.holdings.find((item) => item.id === seed.holdingId);
    setModal({
      type: 'service',
      form: {
        ...EMPTY_SERVICE,
        type: seed.serviceType || 'SURVEY',
        holdingId: holding?.id || '',
        title: seed.title || '',
        location: holding ? [holding.community, holding.district, holding.region].filter(Boolean).join(', ') : ''
      }
    });
  }

  function openDocument(seed = {}) {
    setModal({
      type: 'document',
      form: { ...EMPTY_DOCUMENT, holdingId: seed.holdingId || '' }
    });
  }

  const firstName = String(data.user.name || '').split(/\s+/).filter(Boolean)[0] || 'there';

  const tabs = TABS.filter((item) => {
    if (item.key === 'resale') return allowed('client.resell');
    if (item.key === 'services') return allowed('client.services');
    if (item.key === 'payments') return allowed('client.payments');
    if (item.key === 'documents') return allowed('client.documents');
    return allowed('client.portal');
  });

  const recent = useMemo(() => {
    const events = [
      ...data.reservations.map((item) => ({
        at: item.createdAt,
        title: 'Reservation ' + item.reference,
        detail: item.listing?.title || 'Land reservation',
        status: item.status,
        label: labelFor(RESERVATION_STATUSES, item.status),
        tab: 'buy'
      })),
      ...data.services.map((item) => ({
        at: item.createdAt,
        title: serviceTypeLabel(item.type),
        detail: item.title,
        status: item.status,
        label: serviceStatusLabel(item.status),
        tab: 'services'
      })),
      ...data.resales.map((item) => ({
        at: item.createdAt,
        title: 'Resale ' + item.reference,
        detail: item.title,
        status: item.status,
        label: resaleStatusLabel(item.status),
        tab: 'resale'
      })),
      ...data.payments.map((item) => ({
        at: item.receivedAt,
        title: 'Payment received',
        detail: money(item.amount) + (item.invoice?.number ? ' · ' + item.invoice.number : ''),
        status: 'RECEIVED',
        label: 'Received',
        tab: 'payments'
      }))
    ];
    return events
      .filter((event) => event.at)
      .sort((left, right) => new Date(right.at) - new Date(left.at))
      .slice(0, 8);
  }, [data.reservations, data.services, data.resales, data.payments]);

  const actions = useMemo(() => {
    const list = [];
    data.services.filter((item) => item.status === 'QUOTED').slice(0, 2).forEach((item) => {
      list.push({ key: 'quote-' + item.id, title: 'Approve the quote for ' + item.title, detail: money(item.quoteAmount) + ' · ' + serviceTypeLabel(item.type), tab: 'services' });
    });
    data.reservations.filter((item) => item.status === 'PENDING').slice(0, 2).forEach((item) => {
      list.push({ key: 'reserve-' + item.id, title: 'Complete payment for reservation ' + item.reference, detail: (item.listing?.title || 'Land') + ' · ' + formatGhs(item.amount), tab: 'buy' });
    });
    data.resales.filter((item) => item.status === 'REJECTED').slice(0, 1).forEach((item) => {
      list.push({ key: 'resale-' + item.id, title: 'Update resale ' + item.reference, detail: item.reviewNote || 'The client desk asked for changes.', tab: 'resale' });
    });
    if (data.stats.unverifiedDocuments) {
      list.push({ key: 'documents', title: data.stats.unverifiedDocuments + ' document' + (data.stats.unverifiedDocuments === 1 ? '' : 's') + ' awaiting verification', detail: 'The client desk reviews new documents.', tab: 'documents' });
    }
    if (data.stats.outstanding > 0) {
      list.push({ key: 'balance', title: 'Outstanding balance of ' + money(data.stats.outstanding), detail: 'Settle by bank transfer, mobile money or at the office.', tab: 'payments' });
    }
    return list;
  }, [data]);

  const filteredMarket = watchedOnly ? market.listings.filter((listing) => listing.watched) : market.listings;

  return (
    <>
      <PageHeading
        eyebrow={'Client workspace · ' + (data.profile?.clientCode || '')}
        title={tab === 'overview' ? 'Welcome, ' + firstName : (TABS.find((item) => item.key === tab) || {}).label}
        description={
          tab === 'overview'
            ? 'Manage your TGNE service requests, track delivery, review documents and stay up to date on payments.'
            : undefined
        }
        actions={
          <>
            <button className="office-button secondary" type="button" onClick={() => openService({})} disabled={!allowed('client.services')}><Icon name="shield" size={14} />Request a service</button>
            <button className="office-button primary" type="button" onClick={() => setModal({ type: 'holding', form: { ...EMPTY_HOLDING }, editId: null })}><Icon name="plus" size={14} />Add land</button>
          </>
        }
      />

      <div className="office-stat-grid">
        <Stat label="Portfolio value" value={loading ? '—' : money(data.stats.portfolio.currentValue)} hint={data.stats.portfolio.acres.toLocaleString('en-US') + ' acres under management'} icon="map" />
        <Stat label="Active reservations" value={loading ? '—' : data.stats.reserveCount} hint="Awaiting payment or confirmation" icon="building" tone={data.stats.reserveCount ? 'attention' : ''} />
        <Stat label="Open services" value={loading ? '—' : data.stats.openServices} hint="Survey, build, legal and more" icon="settings" tone={data.stats.openServices ? 'attention' : ''} />
        <Stat label="Outstanding" value={loading ? '—' : money(data.stats.outstanding)} hint={data.stats.totalPaid ? money(data.stats.totalPaid) + ' paid to date' : 'No payments recorded'} icon="money" tone={data.stats.outstanding ? 'attention' : ''} />
      </div>

      <div className="growth-tabs">
        <div className="office-segmented" role="tablist" aria-label="Client workspace sections">
          {tabs.map((item) => (
            <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} className={tab === item.key ? 'active' : ''} onClick={() => setTab(item.key)}>{item.label}</button>
          ))}
        </div>
      </div>

      {tab === 'overview' ? (
        <div className="office-client-grid">
          <Panel title="What needs your attention" subtitle={actions.length ? actions.length + ' open item' + (actions.length === 1 ? '' : 's') : 'You are all caught up.'}>
            {actions.length ? (
              <div className="office-client-actions">
                {actions.map((item) => (
                  <button key={item.key} type="button" className="office-client-action" onClick={() => setTab(item.tab)}>
                    <span className="office-client-action-icon"><Icon name="alert" size={15} /></span>
                    <span><strong>{item.title}</strong><small>{item.detail}</small></span>
                    <Icon name="arrow" size={14} />
                  </button>
                ))}
              </div>
            ) : <p className="office-client-empty"><Icon name="check" size={16} /> Nothing is waiting on you. Browse new land or request a service whenever you are ready.</p>}
          </Panel>

          <Panel title="Recent activity" subtitle="Reservations, services, resales and payments">
            {recent.length ? (
              <div className="office-client-timeline">
                {recent.map((event, index) => (
                  <button key={event.title + index} type="button" className="office-client-event" onClick={() => setTab(event.tab)}>
                    <span className="office-client-dot" />
                    <span className="office-client-event-copy">
                      <strong>{event.title}</strong>
                      <small>{event.detail}</small>
                    </span>
                    <span className="office-client-event-meta">
                      <Status value={event.status} label={event.label} />
                      <small>{formatDate(event.at)}</small>
                    </span>
                  </button>
                ))}
              </div>
            ) : <p className="office-client-empty">Your activity will appear here after your first reservation or service request.</p>}
          </Panel>
        </div>
      ) : null}

      {tab === 'portfolio' ? (
        <>
          <div className="office-stat-grid">
            <Stat label="Land holdings" value={loading ? '—' : data.holdings.length} hint="Active and sold records" icon="map" />
            <Stat label="Total acres" value={loading ? '—' : data.stats.portfolio.acres.toLocaleString('en-US')} hint="Across your active land" icon="building" />
            <Stat label="Acquisition value" value={loading ? '—' : money(data.stats.portfolio.acquisitionValue)} hint="What you paid" icon="money" />
            <Stat label="Unrealised gain" value={loading ? '—' : money(data.stats.portfolio.gain)} hint="Current value minus acquisition" icon="arrow" tone={data.stats.portfolio.gain >= 0 ? 'positive' : 'attention'} />
          </div>

          <Panel
            title="Your land"
            subtitle="Add land you already own to manage documents, resale and services."
            action={<button className="office-button primary small" type="button" onClick={() => setModal({ type: 'holding', form: { ...EMPTY_HOLDING }, editId: null })}><Icon name="plus" size={13} />Add land</button>}
          >
            <div className="office-table-wrap">
              <table className="office-table land-admin-table">
                <thead><tr><th>Land</th><th>Location</th><th>Size</th><th>Value</th><th>Title</th><th>Records</th><th>Action</th></tr></thead>
                <tbody>
                  {data.holdings.map((holding) => (
                    <tr key={holding.id}>
                      <td><strong>{holding.title}</strong><small>{holdingStatusLabel(holding.status)}</small></td>
                      <td><strong>{holding.region}</strong><small>{[holding.district, holding.community].filter(Boolean).join(' · ')}</small></td>
                      <td><strong>{formatAcres(holding.sizeAcres)}</strong><small>{holding.acquisitionDate ? 'Acquired ' + formatDate(holding.acquisitionDate) : 'Acquisition date not set'}</small></td>
                      <td><strong>{money(holding.currentValue || holding.acquisitionPrice)}</strong><small>{holding.acquisitionPrice ? 'Paid ' + money(holding.acquisitionPrice) : 'No purchase price'}</small></td>
                      <td><Status value={holding.titleStatus} label={labelFor(TITLE_STATUSES, holding.titleStatus)} /><small>{holding.titleNumber || 'No title number'}</small></td>
                      <td><strong>{holding._count?.documents || 0} documents</strong><small>{data.services.filter((service) => service.holdingId === holding.id && !['COMPLETED', 'CANCELLED'].includes(service.status)).length} open services</small></td>
                      <td>
                        <div className="land-admin-actions">
                          {allowed('client.services') ? <button className="office-button secondary small" type="button" onClick={() => openService({ holdingId: holding.id })}>Service</button> : null}
                          {allowed('client.resell') ? <button className="office-button secondary small" type="button" onClick={() => openResale({ holdingId: holding.id })}>Resell</button> : null}
                          {allowed('client.documents') ? <button className="office-button secondary small" type="button" onClick={() => openDocument({ holdingId: holding.id })}>Document</button> : null}
                          <button className="office-button secondary small" type="button" onClick={() => setModal({ type: 'holding', form: { ...EMPTY_HOLDING, ...holding, acquisitionDate: holding.acquisitionDate ? String(holding.acquisitionDate).slice(0, 10) : '', acquisitionPrice: holding.acquisitionPrice ?? '', currentValue: holding.currentValue ?? '' }, editId: holding.id })}>Edit</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!data.holdings.length ? <Empty colSpan={7}>{loading ? 'Loading your land…' : 'No land yet. Add a plot you own to start managing it.'}</Empty> : null}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      ) : null}

      {tab === 'buy' ? (
        <>
          <form className="office-filter-bar" onSubmit={(event) => { event.preventDefault(); loadMarket(); }}>
            <label className="grow"><Icon name="search" size={15} /><input value={marketQuery.q} onChange={(event) => setMarketQuery({ ...marketQuery, q: event.target.value })} placeholder="Search region, district, community or title" aria-label="Search land for sale" /></label>
            <label>Region<select value={marketQuery.region} onChange={(event) => setMarketQuery({ ...marketQuery, region: event.target.value })}><option value="">All regions</option>{GHANA_REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}</select></label>
            <label>Land type<select value={marketQuery.landType} onChange={(event) => setMarketQuery({ ...marketQuery, landType: event.target.value })}><option value="">All types</option><option value="RESIDENTIAL">Residential</option><option value="COMMERCIAL">Commercial</option><option value="MIXED_USE">Mixed use</option><option value="AGRICULTURAL">Agricultural</option><option value="INDUSTRIAL">Industrial</option></select></label>
            <label className="office-check"><input type="checkbox" checked={watchedOnly} onChange={(event) => setWatchedOnly(event.target.checked)} />Watched only</label>
            <button className="office-button primary" type="submit" disabled={marketLoading}>{marketLoading ? 'Searching…' : 'Search'}</button>
          </form>

          <Panel title="Land for sale" subtitle={filteredMarket.length + ' listing' + (filteredMarket.length === 1 ? '' : 's') + ' available · reserve online and pay the fee at the office or by transfer'}>
            {filteredMarket.length ? (
              <div className="office-client-market">
                {filteredMarket.map((listing) => (
                  <article key={listing.id} className="office-client-card">
                    <div className="office-client-card-media">
                      {listing.imageUrls?.[0] ? <img src={listing.imageUrls[0]} alt="" loading="lazy" /> : null}
                      <button
                        type="button"
                        className={'office-client-watch' + (listing.watched ? ' active' : '')}
                        aria-label={listing.watched ? 'Remove from watchlist' : 'Add to watchlist'}
                        onClick={async () => {
                          try {
                            const result = await api('/api/client/watchlist', { method: 'POST', ...jsonBody({ listingId: listing.id }) });
                            notify(result.watched ? 'Added to your watchlist.' : 'Removed from your watchlist.');
                            await loadMarket();
                            await load();
                          } catch (reason) {
                            fail(reason.message);
                          }
                        }}
                      >
                        <Icon name="check" size={13} />
                      </button>
                    </div>
                    <div className="office-client-card-body">
                      <div className="office-client-card-top">
                        <span>{listing.region}</span>
                        {listing.verified ? <span className="office-client-verified">Verified</span> : null}
                      </div>
                      <h3>{listing.title}</h3>
                      <p>{listing.summary}</p>
                      <dl>
                        <div><dt>Price</dt><dd>{formatGhs(listing.price)}</dd></div>
                        <div><dt>Size</dt><dd>{formatAcres(listing.sizeAcres)}</dd></div>
                        <div><dt>Title</dt><dd>{labelFor(TITLE_STATUSES, listing.titleStatus)}</dd></div>
                      </dl>
                      <div className="office-client-card-actions">
                        <a className="office-button secondary small" href={'/listings/' + listing.slug} target="_blank" rel="noreferrer">View land</a>
                        <a className="office-button primary small" href={'/listings/' + listing.slug + '#reserve'} target="_blank" rel="noreferrer">Reserve</a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : <p className="office-client-empty">{marketLoading ? 'Loading the marketplace…' : 'No listings match this search. Clear the filters or check back soon.'}</p>}
          </Panel>

          <Panel title="Your reservations" subtitle="Reservations hold a plot while the client desk confirms your payment.">
            <div className="office-table-wrap">
              <table className="office-table land-admin-table">
                <thead><tr><th>Reference</th><th>Land</th><th>Fee</th><th>Status</th><th>Requested</th><th>Action</th></tr></thead>
                <tbody>
                  {data.reservations.map((reservation) => (
                    <tr key={reservation.id}>
                      <td><strong className="land-admin-ref">{reservation.reference}</strong><small>{reservation.paymentMethod.replaceAll('_', ' ').toLowerCase()}</small></td>
                      <td><strong>{reservation.listing?.title || 'Listing removed'}</strong><small>{[reservation.listing?.district, reservation.listing?.region].filter(Boolean).join(' · ')}</small></td>
                      <td><strong>{formatGhs(reservation.amount)}</strong><small>{reservation.note ? reservation.note.slice(0, 70) : 'No note'}</small></td>
                      <td><Status value={reservation.status} label={labelFor(RESERVATION_STATUSES, reservation.status)} /></td>
                      <td><small>{formatDate(reservation.createdAt)}</small></td>
                      <td><a className="office-button secondary small" href={'/orders/' + reservation.reference} target="_blank" rel="noreferrer">Order</a></td>
                    </tr>
                  ))}
                  {!data.reservations.length ? <Empty colSpan={6}>{loading ? 'Loading reservations…' : 'No reservations yet. Reserve a plot to start the buying process.'}</Empty> : null}
                </tbody>
              </table>
            </div>
          </Panel>

          {data.watches.length ? (
            <Panel title="Your watchlist" subtitle="Plots you are keeping an eye on">
              <div className="office-client-watchlist">
                {data.watches.map((watch) => (
                  <a key={watch.id} className="office-client-watch-item" href={watch.listing?.slug ? '/listings/' + watch.listing.slug : '/'} target="_blank" rel="noreferrer">
                    {watch.listing?.imageUrls?.[0] ? <img src={watch.listing.imageUrls[0]} alt="" loading="lazy" /> : null}
                    <span><strong>{watch.listing?.title || 'Listing removed'}</strong><small>{formatGhs(watch.listing?.price)} · {formatAcres(watch.listing?.sizeAcres)}</small></span>
                    <Icon name="arrow" size={14} />
                  </a>
                ))}
              </div>
            </Panel>
          ) : null}
        </>
      ) : null}

      {tab === 'resale' ? (
        <>
          <Panel
            title="Resale requests"
            subtitle="The client desk reviews every resale before it goes live on the storefront."
            action={<button className="office-button primary small" type="button" onClick={() => openResale({})}><Icon name="plus" size={13} />Submit resale</button>}
          >
            <div className="office-table-wrap">
              <table className="office-table land-admin-table">
                <thead><tr><th>Reference</th><th>Land</th><th>Asking price</th><th>Status</th><th>Review note</th><th>Action</th></tr></thead>
                <tbody>
                  {data.resales.map((resale) => (
                    <tr key={resale.id}>
                      <td><strong className="land-admin-ref">{resale.reference}</strong><small>{formatDate(resale.createdAt)}</small></td>
                      <td><strong>{resale.title}</strong><small>{[resale.district, resale.region].filter(Boolean).join(' · ')} · {formatAcres(resale.sizeAcres)}</small></td>
                      <td><strong>{formatGhs(resale.askingPrice)}</strong><small>{resale.holding?.title || 'Not linked to a holding'}</small></td>
                      <td><Status value={resale.status} label={resaleStatusLabel(resale.status)} /></td>
                      <td><small>{resale.reviewNote || '—'}</small></td>
                      <td>
                        <div className="land-admin-actions">
                          {resale.listing?.slug && resale.status === 'LIVE' ? <a className="office-button secondary small" href={'/listings/' + resale.listing.slug} target="_blank" rel="noreferrer">Live page</a> : null}
                          {['SUBMITTED', 'APPROVED', 'LIVE', 'REJECTED'].includes(resale.status) ? (
                            <button
                              className="office-button secondary small"
                              type="button"
                              disabled={busy}
                              onClick={() => run(() => api('/api/client/resales/' + resale.id, { method: 'PATCH', ...jsonBody({ action: 'withdraw' }) }), 'Resale request withdrawn.')}
                            >Withdraw</button>
                          ) : null}
                          {['REJECTED', 'WITHDRAWN'].includes(resale.status) ? (
                            <button
                              className="office-button primary small"
                              type="button"
                              disabled={busy}
                              onClick={() => run(() => api('/api/client/resales/' + resale.id, { method: 'PATCH', ...jsonBody({ action: 'resubmit' }) }), 'Resale request sent back to the client desk.')}
                            >Resubmit</button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!data.resales.length ? <Empty colSpan={6}>{loading ? 'Loading resales…' : 'No resale requests. Submit one when you are ready to sell.'}</Empty> : null}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="How resale works">
            <ol className="office-client-steps">
              <li><strong>Submit the details.</strong> We check the land, title and asking price.</li>
              <li><strong>We publish it.</strong> Approved land appears on the public storefront with your asking price.</li>
              <li><strong>We handle buyers.</strong> Reservations, payments and paperwork stay in one place until the sale completes.</li>
            </ol>
          </Panel>
        </>
      ) : null}

      {tab === 'services' ? (
        <>
          <Panel
            title="Land services"
            subtitle="Surveying, valuation, title checks, construction, fencing, legal work and site visits."
            action={<button className="office-button primary small" type="button" onClick={() => openService({})}><Icon name="plus" size={13} />New request</button>}
          >
            {data.services.length ? (
              <div className="office-client-services">
                {data.services.map((service) => {
                  const updates = service.updates || [];
                  return (
                    <details key={service.id} className="office-client-service">
                      <summary>
                        <span className="office-client-service-main">
                          <strong>{service.title}</strong>
                          <small>{serviceTypeLabel(service.type)} · {service.reference} · {formatDate(service.createdAt)}</small>
                        </span>
                        <span className="office-client-service-side">
                          {service.quoteAmount ? <strong>{money(service.quoteAmount)}</strong> : null}
                          <Status value={service.status} label={serviceStatusLabel(service.status)} />
                        </span>
                      </summary>
                      <div className="office-client-service-body">
                        <p>{service.description}</p>
                        <dl className="office-client-service-meta">
                          <div><dt>Land</dt><dd>{service.holding?.title || service.location || 'Not specified'}</dd></div>
                          <div><dt>Priority</dt><dd>{labelFor(SERVICE_PRIORITIES, service.priority)}</dd></div>
                          <div><dt>Assigned to</dt><dd>{service.assignedTo?.name || 'Client desk'}</dd></div>
                          <div><dt>Scheduled</dt><dd>{service.scheduledFor ? formatDateTime(service.scheduledFor) : 'Not scheduled'}</dd></div>
                        </dl>
                        {updates.length ? (
                          <div className="office-client-service-timeline">
                            {updates.map((update) => (
                              <div key={update.id} className={'office-client-update ' + update.authorRole.toLowerCase()}>
                                <strong>{update.authorRole === 'CLIENT' ? 'You' : update.authorRole === 'SYSTEM' ? 'LandLedger' : 'Client desk'}</strong>
                                <p>{update.message}</p>
                                <small>{formatDateTime(update.createdAt)}</small>
                              </div>
                            ))}
                          </div>
                        ) : null}
                        <div className="office-client-service-actions">
                          {service.status === 'QUOTED' ? (
                            <button className="office-button primary small" type="button" disabled={busy} onClick={() => run(() => api('/api/client/services/' + service.id, { method: 'PATCH', ...jsonBody({ action: 'approve' }) }), 'Quote approved. The client desk will schedule the work.')}>Approve quote</button>
                          ) : null}
                          {!['COMPLETED', 'CANCELLED'].includes(service.status) ? (
                            <button className="office-button secondary small" type="button" disabled={busy} onClick={() => run(() => api('/api/client/services/' + service.id, { method: 'PATCH', ...jsonBody({ action: 'cancel' }) }), 'Service request cancelled.')}>Cancel request</button>
                          ) : null}
                          {service.invoiceNumber ? <button className="office-button secondary small" type="button" onClick={() => setTab('payments')}>View invoice</button> : null}
                        </div>
                        {!['COMPLETED', 'CANCELLED'].includes(service.status) ? (
                          <form
                            className="office-client-message"
                            onSubmit={(event) => {
                              event.preventDefault();
                              const value = String(new FormData(event.currentTarget).get('message') || '');
                              run(() => api('/api/client/services/' + service.id, { method: 'PATCH', ...jsonBody({ action: 'message', message: value }) }), 'Message sent to the client desk.');
                              event.currentTarget.reset();
                            }}
                          >
                            <input name="message" placeholder="Ask the client desk about this job" maxLength={2000} required />
                            <button className="office-button secondary small" type="submit" disabled={busy}>Send</button>
                          </form>
                        ) : null}
                      </div>
                    </details>
                  );
                })}
              </div>
            ) : <p className="office-client-empty">{loading ? 'Loading services…' : 'No service requests yet. Request a survey, build, title check or site visit.'}</p>}
          </Panel>

          <Panel title="Popular services">
            <div className="office-client-service-types">
              {SERVICE_TYPES.slice(0, 6).map((type) => (
                <button key={type.value} type="button" className="office-client-service-type" onClick={() => openService({ serviceType: type.value, title: type.label })}>
                  <Icon name="settings" size={16} />
                  <span>{type.label}</span>
                  <Icon name="arrow" size={13} />
                </button>
              ))}
            </div>
          </Panel>
        </>
      ) : null}

      {tab === 'payments' ? (
        <>
          <div className="office-stat-grid">
            <Stat label="Invoiced" value={loading ? '—' : money(data.stats.totalInvoiced)} hint="All non-void invoices" icon="money" />
            <Stat label="Paid" value={loading ? '—' : money(data.stats.totalPaid)} hint="Payments recorded by the office" icon="check" tone={data.stats.totalPaid ? 'positive' : ''} />
            <Stat label="Outstanding" value={loading ? '—' : money(data.stats.outstanding)} hint="Balance still due" icon="alert" tone={data.stats.outstanding ? 'attention' : ''} />
            <Stat label="Receipts" value={loading ? '—' : data.payments.length} hint="Payments on your record" icon="report" />
          </div>

          <Panel title="Invoices" subtitle="Reservation fees and service quotes appear here once the office issues them.">
            <div className="office-table-wrap">
              <table className="office-table land-admin-table">
                <thead><tr><th>Invoice</th><th>Description</th><th>Amount</th><th>Status</th><th>Issued</th><th>Action</th></tr></thead>
                <tbody>
                  {data.invoices.map((invoice) => {
                    const reference = orderReference(invoice);
                    return (
                      <tr key={invoice.id}>
                        <td><strong className="land-admin-ref">{invoice.number}</strong><small>{invoice.dueDate ? 'Due ' + formatDate(invoice.dueDate) : 'No due date'}</small></td>
                        <td><strong>{invoice.description}</strong><small>{invoice.customerName}</small></td>
                        <td><strong>{money(invoice.amount)}</strong></td>
                        <td><Status value={invoice.status} /></td>
                        <td><small>{formatDate(invoice.issueDate)}</small></td>
                        <td>{reference ? <a className="office-button secondary small" href={'/orders/' + reference} target="_blank" rel="noreferrer">Order</a> : <small>Service invoice</small>}</td>
                      </tr>
                    );
                  })}
                  {!data.invoices.length ? <Empty colSpan={6}>{loading ? 'Loading invoices…' : 'No invoices yet. They appear after a reservation is confirmed or a quote is issued.'}</Empty> : null}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="office-client-grid">
            <Panel title="Payment history">
              <div className="office-table-wrap">
                <table className="office-table land-admin-table">
                  <thead><tr><th>Date</th><th>For</th><th>Amount</th><th>Method</th></tr></thead>
                  <tbody>
                    {data.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td><small>{formatDate(payment.receivedAt)}</small></td>
                        <td><strong>{payment.invoice?.description || payment.note || 'Payment'}</strong><small>{payment.invoice?.number || payment.reference || ''}</small></td>
                        <td><strong>{money(payment.amount)}</strong></td>
                        <td><small>{String(payment.method || '').replaceAll('_', ' ').toLowerCase()}</small></td>
                      </tr>
                    ))}
                    {!data.payments.length ? <Empty colSpan={4}>No payments recorded yet.</Empty> : null}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel title="How to pay">
              <div className="office-client-guidance">
                <p>Quote the invoice number on every payment so the office can match it to your record.</p>
                <ul>
                  <li><strong>Bank transfer</strong> — use the account details on your invoice.</li>
                  <li><strong>Mobile money</strong> — send to the office number and keep the transaction ID.</li>
                  <li><strong>At the office</strong> — pay at the client desk during working hours.</li>
                </ul>
                <p>Questions about a payment? Send a message from the <button type="button" className="office-link" onClick={() => setTab('support')}>Support</button> tab and quote the invoice number.</p>
              </div>
            </Panel>
          </div>
        </>
      ) : null}

      {tab === 'documents' ? (
        <>
          <Panel
            title="Your documents"
            subtitle="Keep title deeds, survey plans, receipts and agreements together with your land."
            action={<button className="office-button primary small" type="button" onClick={() => openDocument({})}><Icon name="plus" size={13} />Add document</button>}
          >
            <div className="office-table-wrap">
              <table className="office-table land-admin-table">
                <thead><tr><th>Document</th><th>Land</th><th>Type</th><th>Issued</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {data.documents.map((document) => (
                    <tr key={document.id}>
                      <td><strong>{document.name}</strong><small>{document.verifiedBy?.name ? 'Verified by ' + document.verifiedBy.name : 'Awaiting client desk review'}</small></td>
                      <td><strong>{document.holding?.title || 'General'}</strong></td>
                      <td><small>{documentTypeLabel(document.type)}</small></td>
                      <td><small>{document.issuedAt ? formatDate(document.issuedAt) : '—'}</small></td>
                      <td><Status value={document.status} label={documentStatusLabel(document.status)} /></td>
                      <td>
                        <div className="land-admin-actions">
                          <a className="office-button secondary small" href={document.fileUrl} target="_blank" rel="noreferrer">Open</a>
                          {document.status !== 'VERIFIED' ? (
                            <button
                              className="office-button secondary small"
                              type="button"
                              disabled={busy}
                              onClick={() => run(() => api('/api/client/documents/' + document.id, { method: 'DELETE' }), 'Document removed.')}
                            >Remove</button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!data.documents.length ? <Empty colSpan={6}>{loading ? 'Loading documents…' : 'No documents yet. Add a title deed, survey plan or receipt.'}</Empty> : null}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Document tips">
            <ul className="office-client-list">
              <li>Use a secure <strong>https</strong> link (for example your cloud storage share link) or an <code>/uploads/…</code> path.</li>
              <li>The client desk verifies documents before they are marked verified. You can replace an unverified document at any time.</li>
              <li>Verified documents stay on record and cannot be removed from the portal.</li>
            </ul>
          </Panel>
        </>
      ) : null}

      {tab === 'support' ? (
        <div className="office-client-grid">
          <Panel title="Message the client desk" subtitle="We usually reply within one working day.">
            <form
              className="office-client-support-form"
              onSubmit={async (event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const payload = Object.fromEntries(new FormData(form).entries());
                setBusy(true);
                try {
                  await api('/api/client/messages', { method: 'POST', ...jsonBody(payload) });
                  notify('Message sent to the client desk.');
                  form.reset();
                } catch (reason) {
                  fail(reason.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Field label="Subject"><input name="subject" maxLength={160} placeholder="Reservation, service or document" required /></Field>
              <Field label="Message" full><textarea name="message" rows={5} maxLength={2000} placeholder="Tell us what you need help with" required /></Field>
              <button className="office-button primary" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send message'}</button>
            </form>
          </Panel>

          <Panel title="Contact the office">
            <div className="office-client-guidance">
              <p><strong>{LAND_SITE.name}</strong></p>
              <ul>
                <li><strong>Email</strong> — <a className="office-link" href={'mailto:' + LAND_SITE.email}>{LAND_SITE.email}</a></li>
                {LAND_SITE.phone ? <li><strong>Phone</strong> — <a className="office-link" href={'tel:' + LAND_SITE.phone.replace(/\s+/g, '')}>{LAND_SITE.phone}</a></li> : null}
                <li><strong>Address</strong> — {LAND_SITE.address}</li>
                <li><strong>Hours</strong> — {LAND_SITE.hours}</li>
              </ul>
            </div>
          </Panel>

          <Panel title="Your profile" subtitle="Keep your contact details current for paperwork and site visits.">
            <form
              className="office-form-grid office-client-profile-form"
              onSubmit={async (event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const payload = Object.fromEntries(new FormData(form).entries());
                setBusy(true);
                try {
                  await api('/api/client/profile', { method: 'PATCH', ...jsonBody(payload) });
                  notify('Profile updated.');
                  await load();
                } catch (reason) {
                  fail(reason.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Field label="Phone"><input name="phone" defaultValue={data.user.phone} maxLength={40} /></Field>
              <Field label="Company"><input name="companyName" defaultValue={data.profile?.companyName || ''} maxLength={160} /></Field>
              <Field label="Ghana Card"><input name="ghanaCard" defaultValue={data.profile?.ghanaCard || ''} maxLength={40} placeholder="GHA-000000000-0" /></Field>
              <Field label="City / town"><input name="city" defaultValue={data.profile?.city || ''} maxLength={80} /></Field>
              <Field label="Region"><select name="region" defaultValue={data.profile?.region || ''}><option value="">Select region</option>{GHANA_REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}</select></Field>
              <Field label="Address" full><input name="address" defaultValue={data.profile?.address || ''} maxLength={300} /></Field>
              <button className="office-button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
            </form>
          </Panel>
        </div>
      ) : null}

      {modal?.type === 'holding' ? (
        <HoldingModal
          form={modal.form}
          editId={modal.editId}
          busy={busy}
          onClose={() => setModal(null)}
          onSave={(form) => run(
            () => api('/api/client/holdings' + (modal.editId ? '/' + modal.editId : ''), {
              method: modal.editId ? 'PATCH' : 'POST',
              ...jsonBody(form)
            }),
            modal.editId ? 'Land updated.' : 'Land added to your portfolio.'
          ).then((ok) => { if (ok) setModal(null); })}
        />
      ) : null}

      {modal?.type === 'resale' ? (
        <ResaleModal
          form={modal.form}
          holdings={data.holdings.filter((holding) => holding.status !== 'SOLD')}
          busy={busy}
          onClose={() => setModal(null)}
          onSave={(form) => run(
            () => api('/api/client/resales', { method: 'POST', ...jsonBody(form) }),
            'Resale request submitted for review.'
          ).then((ok) => { if (ok) setModal(null); })}
        />
      ) : null}

      {modal?.type === 'service' ? (
        <ServiceModal
          form={modal.form}
          holdings={data.holdings.filter((holding) => holding.status !== 'SOLD')}
          busy={busy}
          onClose={() => setModal(null)}
          onSave={(form) => run(
            () => api('/api/client/services', { method: 'POST', ...jsonBody(form) }),
            'Service request submitted.'
          ).then((ok) => { if (ok) setModal(null); })}
        />
      ) : null}

      {modal?.type === 'document' ? (
        <DocumentModal
          form={modal.form}
          holdings={data.holdings.filter((holding) => holding.status !== 'SOLD')}
          busy={busy}
          onClose={() => setModal(null)}
          onSave={(form) => run(
            () => api('/api/client/documents', { method: 'POST', ...jsonBody(form) }),
            'Document added for review.'
          ).then((ok) => { if (ok) setModal(null); })}
        />
      ) : null}
    </>
  );
}

function HoldingModal({ form, editId, busy, onClose, onSave }) {
  const [draft, setDraft] = useState(form);
  const set = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  return (
    <Modal title={editId ? 'Edit land' : 'Add land'} eyebrow="Portfolio" description="Record land you already own. You can update the value and title details at any time." onClose={onClose} wide>
      <form className="office-form-grid" onSubmit={(event) => { event.preventDefault(); onSave(draft); }}>
        <Field label="Land name" full><input value={draft.title} onChange={(event) => set('title', event.target.value)} placeholder="e.g. Aburi hillside plot" required maxLength={160} /></Field>
        <Field label="Region"><select value={draft.region} onChange={(event) => set('region', event.target.value)} required>{GHANA_REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}</select></Field>
        <Field label="District"><input value={draft.district} onChange={(event) => set('district', event.target.value)} required maxLength={80} /></Field>
        <Field label="Community"><input value={draft.community} onChange={(event) => set('community', event.target.value)} maxLength={80} /></Field>
        <Field label="Size (acres)"><input type="number" step="0.01" min="0.01" value={draft.sizeAcres} onChange={(event) => set('sizeAcres', event.target.value)} required /></Field>
        <Field label="Acquisition date"><input type="date" value={draft.acquisitionDate || ''} onChange={(event) => set('acquisitionDate', event.target.value)} /></Field>
        <Field label="Purchase price (GHS)"><input type="number" min="0" step="1" value={draft.acquisitionPrice} onChange={(event) => set('acquisitionPrice', event.target.value)} /></Field>
        <Field label="Current value (GHS)"><input type="number" min="0" step="1" value={draft.currentValue} onChange={(event) => set('currentValue', event.target.value)} /></Field>
        <Field label="Title status"><select value={draft.titleStatus} onChange={(event) => set('titleStatus', event.target.value)}>{TITLE_STATUSES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
        <Field label="Title / indenture number"><input value={draft.titleNumber} onChange={(event) => set('titleNumber', event.target.value)} maxLength={80} /></Field>
        <Field label="Coordinates"><input value={draft.coordinates} onChange={(event) => set('coordinates', event.target.value)} placeholder="5.6037, -0.1870" maxLength={80} /></Field>
        <Field label="Notes" full><textarea rows={3} value={draft.notes} onChange={(event) => set('notes', event.target.value)} maxLength={2000} /></Field>
        <div className="office-modal-actions office-field-full">
          <button className="office-button secondary" type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="office-button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : editId ? 'Save changes' : 'Add land'}</button>
        </div>
      </form>
    </Modal>
  );
}

function ResaleModal({ form, holdings, busy, onClose, onSave }) {
  const [draft, setDraft] = useState(form);
  const set = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  function chooseHolding(id) {
    const holding = holdings.find((item) => item.id === id);
    setDraft((current) => ({
      ...current,
      holdingId: id,
      sizeAcres: holding ? String(holding.sizeAcres) : current.sizeAcres,
      region: holding?.region || current.region,
      district: holding?.district || current.district,
      community: holding?.community || current.community,
      title: holding && !current.title ? 'Resale — ' + holding.title : current.title
    }));
  }
  return (
    <Modal title="Submit a resale" eyebrow="Resale" description="We review the land and title before publishing it to buyers." onClose={onClose} wide>
      <form className="office-form-grid" onSubmit={(event) => { event.preventDefault(); onSave(draft); }}>
        <Field label="Link to your land" full hint="Linking the holding keeps the title and documents together.">
          <select value={draft.holdingId} onChange={(event) => chooseHolding(event.target.value)}>
            <option value="">Not linked</option>
            {holdings.map((holding) => <option key={holding.id} value={holding.id}>{holding.title} · {holding.region}</option>)}
          </select>
        </Field>
        <Field label="Resale title" full><input value={draft.title} onChange={(event) => set('title', event.target.value)} required maxLength={160} /></Field>
        <Field label="Asking price (GHS)"><input type="number" min="1" step="1" value={draft.askingPrice} onChange={(event) => set('askingPrice', event.target.value)} required /></Field>
        <Field label="Size (acres)"><input type="number" min="0.01" step="0.01" value={draft.sizeAcres} onChange={(event) => set('sizeAcres', event.target.value)} required /></Field>
        <Field label="Region"><select value={draft.region} onChange={(event) => set('region', event.target.value)} required>{GHANA_REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}</select></Field>
        <Field label="District"><input value={draft.district} onChange={(event) => set('district', event.target.value)} required maxLength={80} /></Field>
        <Field label="Community"><input value={draft.community} onChange={(event) => set('community', event.target.value)} maxLength={80} /></Field>
        <Field label="Why are you selling?" full><textarea rows={4} value={draft.description} onChange={(event) => set('description', event.target.value)} placeholder="Describe the land, access, documents and anything a buyer should know." required maxLength={4000} /></Field>
        <div className="office-modal-actions office-field-full">
          <button className="office-button secondary" type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="office-button primary" type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit for review'}</button>
        </div>
      </form>
    </Modal>
  );
}

function ServiceModal({ form, holdings, busy, onClose, onSave }) {
  const [draft, setDraft] = useState(form);
  const set = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  function chooseType(value) {
    const type = SERVICE_TYPES.find((item) => item.value === value);
    setDraft((current) => ({
      ...current,
      type: value,
      title: current.title && current.title !== (SERVICE_TYPES.find((item) => item.value === current.type) || {}).label ? current.title : (type?.label || '')
    }));
  }
  return (
    <Modal title="Request a land service" eyebrow="Services" description="Tell us what you need. The client desk will review it and issue a quote." onClose={onClose} wide>
      <form className="office-form-grid" onSubmit={(event) => { event.preventDefault(); onSave(draft); }}>
        <Field label="Service"><select value={draft.type} onChange={(event) => chooseType(event.target.value)}>{SERVICE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></Field>
        <Field label="Priority"><select value={draft.priority} onChange={(event) => set('priority', event.target.value)}>{SERVICE_PRIORITIES.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}</select></Field>
        <Field label="Title" full><input value={draft.title} onChange={(event) => set('title', event.target.value)} placeholder="e.g. Survey and beacon the Aburi plot" required maxLength={160} /></Field>
        <Field label="Land (optional)"><select value={draft.holdingId} onChange={(event) => set('holdingId', event.target.value)}><option value="">Not linked to a holding</option>{holdings.map((holding) => <option key={holding.id} value={holding.id}>{holding.title}</option>)}</select></Field>
        <Field label="Location"><input value={draft.location} onChange={(event) => set('location', event.target.value)} maxLength={160} placeholder="Community, district, region" /></Field>
        <Field label="What do you need?" full><textarea rows={5} value={draft.description} onChange={(event) => set('description', event.target.value)} required maxLength={4000} /></Field>
        <div className="office-modal-actions office-field-full">
          <button className="office-button secondary" type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="office-button primary" type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit request'}</button>
        </div>
      </form>
    </Modal>
  );
}

function DocumentModal({ form, holdings, busy, onClose, onSave }) {
  const [draft, setDraft] = useState(form);
  const set = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  return (
    <Modal title="Add a document" eyebrow="Documents" description="Link a document you already have. The client desk reviews new documents before verifying them." onClose={onClose} wide>
      <form className="office-form-grid" onSubmit={(event) => { event.preventDefault(); onSave(draft); }}>
        <Field label="Document name" full><input value={draft.name} onChange={(event) => set('name', event.target.value)} placeholder="e.g. Registered title deed" required maxLength={160} /></Field>
        <Field label="Type"><select value={draft.type} onChange={(event) => set('type', event.target.value)}>{DOCUMENT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></Field>
        <Field label="Land"><select value={draft.holdingId} onChange={(event) => set('holdingId', event.target.value)}><option value="">General document</option>{holdings.map((holding) => <option key={holding.id} value={holding.id}>{holding.title}</option>)}</select></Field>
        <Field label="Document link" full hint="A secure https link or an /uploads path."><input value={draft.fileUrl} onChange={(event) => set('fileUrl', event.target.value)} placeholder="https://..." required maxLength={2000} /></Field>
        <Field label="Issue date"><input type="date" value={draft.issuedAt || ''} onChange={(event) => set('issuedAt', event.target.value)} /></Field>
        <div className="office-modal-actions office-field-full">
          <button className="office-button secondary" type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="office-button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Add document'}</button>
        </div>
      </form>
    </Modal>
  );
}
