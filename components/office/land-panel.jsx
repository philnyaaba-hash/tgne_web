'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, Empty, Field, formatDate, formatDateTime, Icon, jsonBody, Modal, PageHeading, Panel, Stat, StatusBadge } from './ui';
import { GHANA_REGIONS } from '../../lib/ghana-regions';
import {
  INQUIRY_TYPES,
  LAND_TYPES,
  LISTING_STATUSES,
  PAYMENT_METHODS,
  RESERVATION_STATUSES,
  TITLE_STATUSES,
  formatAcres,
  formatGhs,
  labelFor
} from '../../lib/land-commerce';

const IMAGE_LIBRARY = [
  { url: '/assets/land/hero.png', label: 'Estate aerial' },
  { url: '/assets/land/residential.png', label: 'Residential plots' },
  { url: '/assets/land/gated.png', label: 'Gated community' },
  { url: '/assets/land/commercial.png', label: 'Commercial frontage' },
  { url: '/assets/land/farmland.png', label: 'Farmland' },
  { url: '/assets/land/hills.png', label: 'Hillside land' },
  { url: '/assets/land/survey.png', label: 'Survey visit' }
];

const EMPTY_FORM = {
  title: '',
  region: 'Greater Accra',
  district: '',
  community: '',
  landType: 'RESIDENTIAL',
  titleStatus: 'REGISTERED',
  status: 'DRAFT',
  sizeAcres: '',
  price: '',
  summary: '',
  description: '',
  highlights: '',
  imageUrls: [],
  coordinates: '',
  sellerName: '',
  sellerPhone: '',
  sellerEmail: '',
  featured: false,
  verified: false
};

const EMPTY_DATA = {
  listings: [],
  reservations: [],
  inquiries: [],
  ready: false,
  canManage: false,
  stats: { listings: 0, published: 0, pendingReservations: 0, newInquiries: 0 }
};

const EMPTY_PIPELINE = {
  ready: false,
  rows: [],
  stages: [],
  accounts: null,
  funnel: { enquiries: 0, newEnquiries: 0, requests: 0, confirmed: 0, completed: 0, pipelineValue: 0 },
  canSyncAccounts: false,
  canViewAccounts: false
};

function formFromListing(listing) {
  return {
    title: listing.title || '',
    region: listing.region || 'Greater Accra',
    district: listing.district || '',
    community: listing.community || '',
    landType: listing.landType || 'RESIDENTIAL',
    titleStatus: listing.titleStatus || 'REGISTERED',
    status: listing.status || 'DRAFT',
    sizeAcres: String(listing.sizeAcres ?? ''),
    price: String(listing.price ?? ''),
    summary: listing.summary || '',
    description: listing.description || '',
    highlights: (listing.highlights || []).join('\n'),
    imageUrls: Array.isArray(listing.imageUrls) ? listing.imageUrls : [],
    coordinates: listing.coordinates || '',
    sellerName: listing.sellerName || '',
    sellerPhone: listing.sellerPhone || '',
    sellerEmail: listing.sellerEmail || '',
    featured: listing.featured === true,
    verified: listing.verified === true
  };
}

function listingPayload(form) {
  return {
    title: form.title,
    region: form.region,
    district: form.district,
    community: form.community,
    landType: form.landType,
    titleStatus: form.titleStatus,
    status: form.status,
    sizeAcres: Number(form.sizeAcres),
    price: Number(form.price),
    summary: form.summary,
    description: form.description,
    highlights: form.highlights.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
    imageUrls: form.imageUrls,
    coordinates: form.coordinates,
    sellerName: form.sellerName,
    sellerPhone: form.sellerPhone,
    sellerEmail: form.sellerEmail,
    featured: form.featured,
    verified: form.verified
  };
}

export default function LandPanel({ notify, fail }) {
  const [data, setData] = useState(EMPTY_DATA);
  const [tab, setTab] = useState('listings');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editor, setEditor] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pipeline, setPipeline] = useState(EMPTY_PIPELINE);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await api('/api/office/land');
      setData({ ...EMPTY_DATA, ...result });
      fail('');
    } catch (reason) {
      fail(reason.message);
    } finally {
      setLoading(false);
    }
  }, [fail]);

  const loadPipeline = useCallback(async () => {
    setPipelineLoading(true);
    try {
      const result = await api('/api/office/land/pipeline');
      setPipeline({ ...EMPTY_PIPELINE, ...result });
      fail('');
    } catch (reason) {
      fail(reason.message);
    } finally {
      setPipelineLoading(false);
    }
  }, [fail]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === 'pipeline') loadPipeline(); }, [tab, loadPipeline]);

  const listings = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.listings.filter((listing) => {
      if (statusFilter && listing.status !== statusFilter) return false;
      if (!needle) return true;
      return [listing.title, listing.region, listing.district, listing.community, listing.slug]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [data.listings, query, statusFilter]);

  function openCreate() {
    setEditor({ mode: 'create', form: { ...EMPTY_FORM, imageUrls: ['/assets/land/residential.png'] } });
  }

  function openEdit(listing) {
    setEditor({ mode: 'edit', id: listing.id, item: listing, form: formFromListing(listing) });
  }

  function setField(key, value) {
    setEditor((current) => (current ? { ...current, form: { ...current.form, [key]: value } } : current));
  }

  function toggleImage(url) {
    setEditor((current) => {
      if (!current) return current;
      const list = current.form.imageUrls;
      return {
        ...current,
        form: {
          ...current.form,
          imageUrls: list.includes(url) ? list.filter((item) => item !== url) : [...list, url].slice(0, 8)
        }
      };
    });
  }

  async function saveListing(event) {
    event.preventDefault();
    if (!editor) return;
    setBusy(true);
    try {
      if (editor.mode === 'create') {
        await api('/api/office/land', { method: 'POST', ...jsonBody(listingPayload(editor.form)) });
        notify('Listing created.');
      } else {
        await api('/api/office/land/' + editor.id, { method: 'PATCH', ...jsonBody(listingPayload(editor.form)) });
        notify('Listing updated.');
      }
      setEditor(null);
      await load();
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  async function archiveListing(listing) {
    if (!window.confirm('Archive "' + listing.title + '"? It will disappear from the public storefront but existing reservations stay intact.')) return;
    setBusy(true);
    try {
      await api('/api/office/land/' + listing.id, { method: 'DELETE' });
      notify('Listing archived.');
      await load();
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  async function setReservationStatus(reservation, status) {
    setBusy(true);
    try {
      const result = await api('/api/office/land/reservations/' + reservation.id, { method: 'PATCH', ...jsonBody({ status }) });
      let message = 'Reservation ' + reservation.reference + ' marked ' + labelFor(RESERVATION_STATUSES, status).toLowerCase() + '.';
      if (result.accounts?.invoiceCreated) message += ' Invoice ' + result.accounts.invoiceNumber + ' raised.';
      if (result.accounts?.paymentRecorded) message += ' Payment recorded against the invoice.';
      if (!result.canSyncAccounts && ['CONFIRMED', 'COMPLETED'].includes(status)) message += ' Finance posting is pending a user with finance permission.';
      notify(message);
      await load();
      if (tab === 'pipeline') await loadPipeline();
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  async function syncAccounts() {
    if (!pipeline.canSyncAccounts) return;
    if (!window.confirm('Post every confirmed and completed reservation to the finance ledger? Invoices and payments are matched by reference, so nothing is posted twice.')) return;
    setSyncing(true);
    try {
      const result = await api('/api/office/land/pipeline/sync', { method: 'POST' });
      const invoices = result.invoicesCreated || 0;
      const payments = result.paymentsRecorded || 0;
      notify('Accounts synced · ' + invoices + ' invoice' + (invoices === 1 ? '' : 's') + ' raised, ' + payments + ' payment' + (payments === 1 ? '' : 's') + ' recorded.');
      if (result.errors?.length) fail(result.errors.length + ' reservation' + (result.errors.length === 1 ? '' : 's') + ' could not be posted. Check the audit history.');
      await Promise.all([load(), loadPipeline()]);
    } catch (reason) {
      fail(reason.message);
    } finally {
      setSyncing(false);
    }
  }

  async function setInquiryStatus(inquiry, status) {
    setBusy(true);
    try {
      await api('/api/office/land/inquiries/' + inquiry.id, { method: 'PATCH', ...jsonBody({ status }) });
      notify('Enquiry marked ' + status.toLowerCase() + '.');
      await load();
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  const stats = data.stats || EMPTY_DATA.stats;

  return (
    <>
      <PageHeading
        eyebrow="STOREFRONT · LAND ONLY"
        title="Land storefront"
        description="Publish vetted land listings, review reservation requests and answer buyer enquiries from the public site."
        actions={data.canManage ? (
          <>
            <a className="office-button secondary" href="/" target="_blank" rel="noreferrer"><Icon name="arrow" size={14} />Open site</a>
            <button className="office-button primary" type="button" onClick={openCreate}><Icon name="plus" size={14} />New listing</button>
          </>
        ) : null}
      />

      {!data.ready && !loading ? (
        <div className="office-alert error" role="alert">
          <span>The storefront tables are not available yet. Apply the latest database migration, then reload this panel.</span>
        </div>
      ) : null}

      <div className="office-stat-grid">
        <Stat label="Listings" value={loading ? '—' : stats.listings} hint="All records in the catalogue" icon="building" />
        <Stat label="Published" value={loading ? '—' : stats.published} hint="Visible on the public site" icon="check" tone={stats.published ? 'positive' : ''} />
        <Stat label="Pending reservations" value={loading ? '—' : stats.pendingReservations} hint="Awaiting payment confirmation" icon="money" tone={stats.pendingReservations ? 'attention' : ''} />
        <Stat label="New enquiries" value={loading ? '—' : stats.newInquiries} hint="Not yet read by the office" icon="mail" tone={stats.newInquiries ? 'attention' : ''} />
      </div>

      <div className="growth-tabs">
        <div className="office-segmented" role="tablist" aria-label="Storefront sections">
          <button type="button" className={tab === 'listings' ? 'active' : ''} onClick={() => setTab('listings')}>Listings</button>
          <button type="button" className={tab === 'reservations' ? 'active' : ''} onClick={() => setTab('reservations')}>Reservations</button>
          <button type="button" className={tab === 'pipeline' ? 'active' : ''} onClick={() => setTab('pipeline')}>Pipeline</button>
          <button type="button" className={tab === 'inquiries' ? 'active' : ''} onClick={() => setTab('inquiries')}>Enquiries</button>
        </div>
      </div>

      {tab === 'listings' ? (
        <>
          <form className="office-filter-bar" onSubmit={(event) => event.preventDefault()}>
            <label className="grow"><Icon name="search" size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, region, district or slug" aria-label="Search listings" /></label>
            <label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All statuses</option>{LISTING_STATUSES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          </form>

          <Panel title="Catalogue" subtitle={listings.length + ' shown · ' + data.listings.length + ' total'}>
            <div className="office-table-wrap">
              <table className="office-table land-admin-table">
                <thead><tr><th>Listing</th><th>Location</th><th>Price</th><th>Status</th><th>Interest</th><th>Action</th></tr></thead>
                <tbody>
                  {listings.map((listing) => (
                    <tr key={listing.id}>
                      <td>
                        <div className="land-admin-land">
                          {listing.imageUrls?.[0] ? <img src={listing.imageUrls[0]} alt="" loading="lazy" /> : null}
                          <div>
                            <strong>{listing.title}</strong>
                            <small>{labelFor(LAND_TYPES, listing.landType)} · {formatAcres(listing.sizeAcres)}{listing.featured ? ' · Featured' : ''}{listing.verified ? ' · Verified' : ''}</small>
                          </div>
                        </div>
                      </td>
                      <td><strong>{listing.region}</strong><small>{[listing.district, listing.community].filter(Boolean).join(' · ')}</small></td>
                      <td><strong>{formatGhs(listing.price)}</strong><small>{labelFor(TITLE_STATUSES, listing.titleStatus)}</small></td>
                      <td>
                        <StatusBadge value={listing.status} label={labelFor(LISTING_STATUSES, listing.status)} />
                        <small>{listing.status === 'PUBLISHED' ? 'Live since ' + formatDate(listing.publishedAt) : 'Not public'}</small>
                      </td>
                      <td>
                        <strong>{listing._count?.reservations || 0} reserved</strong>
                        <small>{listing._count?.inquiries || 0} enquiries · {listing.views || 0} views</small>
                      </td>
                      <td>
                        <div className="land-admin-actions">
                          <button className="office-button secondary small" type="button" onClick={() => openEdit(listing)}>{data.canManage ? 'Edit' : 'View'}</button>
                          {listing.status === 'PUBLISHED' ? <a className="office-button secondary small" href={'/listings/' + listing.slug} target="_blank" rel="noreferrer">Site</a> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!listings.length ? <Empty colSpan={6}>{loading ? 'Loading listings…' : 'No listings match these filters. Create a listing to publish land.'}</Empty> : null}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      ) : null}

      {tab === 'reservations' ? (
        <Panel title="Reservation requests" subtitle="Fees are paid by bank transfer, mobile money or at the office. Confirm only after funds clear.">
          <div className="office-table-wrap">
            <table className="office-table land-admin-table">
              <thead><tr><th>Reference</th><th>Listing</th><th>Buyer</th><th>Amount</th><th>Preferred method</th><th>Status</th><th>Requested</th></tr></thead>
              <tbody>
                {data.reservations.map((reservation) => (
                  <tr key={reservation.id}>
                    <td><strong className="land-admin-ref">{reservation.reference}</strong><a className="land-admin-link" href={'/orders/' + reservation.reference} target="_blank" rel="noreferrer">Buyer view</a></td>
                    <td><strong>{reservation.listing?.title || 'Listing removed'}</strong><small>{reservation.listing?.region || ''}</small></td>
                    <td><strong>{reservation.buyerName}</strong><small>{reservation.email} · {reservation.phone}</small></td>
                    <td><strong>{formatGhs(reservation.amount)}</strong><small>{reservation.note ? reservation.note.slice(0, 80) : 'No buyer note'}</small></td>
                    <td><small>{labelFor(PAYMENT_METHODS, reservation.paymentMethod)}</small></td>
                    <td>
                      {data.canManage ? (
                        <select value={reservation.status} onChange={(event) => setReservationStatus(reservation, event.target.value)} disabled={busy} aria-label={'Status for ' + reservation.reference}>
                          {RESERVATION_STATUSES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      ) : <StatusBadge value={reservation.status} label={labelFor(RESERVATION_STATUSES, reservation.status)} />}
                    </td>
                    <td><small>{formatDateTime(reservation.createdAt)}</small></td>
                  </tr>
                ))}
                {!data.reservations.length ? <Empty colSpan={7}>{loading ? 'Loading reservations…' : 'No reservation requests yet.'}</Empty> : null}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      {tab === 'pipeline' ? (
        <>
          {!pipeline.ready && !pipelineLoading ? (
            <div className="office-alert error" role="alert">
              <span>The sales pipeline could not be loaded. Apply the latest database migration, then reload this panel.</span>
            </div>
          ) : null}

          <ul className="land-pipeline-stages" aria-label="Reservation stages">
            {pipeline.stages.map((stage) => (
              <li key={stage.value}>
                <span>{stage.label}</span>
                <strong>{pipelineLoading ? '—' : stage.count}</strong>
                <small>{formatGhs(stage.amount)} in reservation fees</small>
              </li>
            ))}
          </ul>

          {pipeline.accounts ? (
            <Panel
              title="Accounts posting"
              subtitle="Confirming a request raises an invoice. Completing it records the payment and settles the invoice. Both are matched to the reservation reference."
              action={<a className="office-button secondary small" href="/admin/office-finance" target="_top">Finance desk</a>}
            >
              <div className="land-pipeline-accounts">
                <div><span>Invoiced</span><strong>{formatGhs(pipeline.accounts.invoiced)}</strong></div>
                <div><span>Collected</span><strong>{formatGhs(pipeline.accounts.collected)}</strong></div>
                <div><span>Outstanding</span><strong>{formatGhs(pipeline.accounts.outstanding)}</strong></div>
                <div><span>Not posted</span><strong>{pipeline.accounts.awaitingSync}</strong></div>
              </div>
            </Panel>
          ) : null}

          <Panel
            title="Reservation pipeline"
            subtitle={pipelineLoading ? 'Loading pipeline…' : pipeline.funnel.requests + ' requests · ' + pipeline.funnel.confirmed + ' confirmed · ' + pipeline.funnel.completed + ' completed · ' + formatGhs(pipeline.funnel.pipelineValue) + ' still open'}
            action={pipeline.canSyncAccounts ? <button className="office-button secondary small" type="button" onClick={syncAccounts} disabled={syncing || pipelineLoading}>{syncing ? 'Syncing…' : 'Sync accounts'}</button> : null}
          >
            <div className="office-table-wrap">
              <table className="office-table land-admin-table">
                <thead><tr><th>Stage</th><th>Reference</th><th>Buyer</th><th>Listing</th><th>Fee</th><th>Accounts</th><th></th></tr></thead>
                <tbody>
                  {pipeline.rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        {data.canManage ? (
                          <select value={row.status} onChange={(event) => setReservationStatus(row, event.target.value)} disabled={busy} aria-label={'Stage for ' + row.reference}>
                            {RESERVATION_STATUSES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        ) : <StatusBadge value={row.status} label={labelFor(RESERVATION_STATUSES, row.status)} />}
                      </td>
                      <td><strong className="land-admin-ref">{row.reference}</strong><small>{row.paymentMethodLabel}</small></td>
                      <td><strong>{row.buyerName}</strong><small>{row.email}</small></td>
                      <td><small>{row.listing?.title || 'Listing removed'}{row.listing?.region ? ' · ' + row.listing.region : ''}</small></td>
                      <td><strong>{formatGhs(row.amount)}</strong></td>
                      <td>
                        {row.accounts ? (
                          <>
                            <StatusBadge value={row.accounts.state} label={row.accounts.label} />
                            <small>{row.accounts.invoice ? row.accounts.invoice.number + ' · ' + formatGhs(row.accounts.collected) + ' of ' + formatGhs(row.accounts.invoiceAmount) : 'No invoice posted'}</small>
                          </>
                        ) : <small>Finance permission required</small>}
                      </td>
                      <td><a className="office-button secondary small" href={'/orders/' + row.reference} target="_blank" rel="noreferrer">Buyer view</a></td>
                    </tr>
                  ))}
                  {!pipeline.rows.length ? <Empty colSpan={7}>{pipelineLoading ? 'Loading pipeline…' : 'No reservation requests yet. Storefront reservations appear here as soon as buyers submit them.'}</Empty> : null}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      ) : null}

      {tab === 'inquiries' ? (
        <Panel title="Buyer and seller enquiries" subtitle="Reply from the office inbox. Close an enquiry once it has been answered.">
          <div className="office-table-wrap">
            <table className="office-table land-admin-table">
              <thead><tr><th>Contact</th><th>Type</th><th>Listing</th><th>Message</th><th>Received</th><th>Status</th></tr></thead>
              <tbody>
                {data.inquiries.map((inquiry) => (
                  <tr key={inquiry.id}>
                    <td><strong>{inquiry.name}</strong><small>{inquiry.email}{inquiry.phone ? ' · ' + inquiry.phone : ''}</small></td>
                    <td><small>{labelFor(INQUIRY_TYPES, inquiry.type)}</small></td>
                    <td><small>{inquiry.listing?.title || 'General'}</small></td>
                    <td>
                      <button className="land-admin-message" type="button" onClick={() => setExpanded(expanded === inquiry.id ? null : inquiry.id)} aria-expanded={expanded === inquiry.id}>
                        {expanded === inquiry.id ? inquiry.message : inquiry.message.slice(0, 90) + (inquiry.message.length > 90 ? '…' : '')}
                      </button>
                    </td>
                    <td><small>{formatDateTime(inquiry.createdAt)}</small></td>
                    <td>
                      <div className="land-admin-actions">
                        <StatusBadge value={inquiry.status} />
                        {data.canManage && inquiry.status === 'NEW' ? <button className="office-button secondary small" type="button" onClick={() => setInquiryStatus(inquiry, 'READ')} disabled={busy}>Mark read</button> : null}
                        {data.canManage && inquiry.status !== 'CLOSED' ? <button className="office-button secondary small" type="button" onClick={() => setInquiryStatus(inquiry, 'CLOSED')} disabled={busy}>Close</button> : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {!data.inquiries.length ? <Empty colSpan={6}>{loading ? 'Loading enquiries…' : 'No enquiries yet.'}</Empty> : null}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      {editor ? (
        <Modal
          title={editor.mode === 'create' ? 'New land listing' : editor.item.title}
          eyebrow="LAND LISTING"
          description={editor.mode === 'create' ? 'Draft first, then publish when the title and site plan are verified.' : 'Changes go live immediately when the listing is published.'}
          onClose={() => (busy ? null : setEditor(null))}
          wide
        >
          <form className="office-form-grid land-admin-form" onSubmit={saveListing}>
            <Field label="Listing title" full><input value={editor.form.title} onChange={(event) => setField('title', event.target.value)} maxLength={140} required disabled={!data.canManage} /></Field>
            <Field label="Region">
              <select value={editor.form.region} onChange={(event) => setField('region', event.target.value)} disabled={!data.canManage}>
                {GHANA_REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}
              </select>
            </Field>
            <Field label="District"><input value={editor.form.district} onChange={(event) => setField('district', event.target.value)} maxLength={80} required disabled={!data.canManage} /></Field>
            <Field label="Community or town"><input value={editor.form.community} onChange={(event) => setField('community', event.target.value)} maxLength={80} disabled={!data.canManage} /></Field>
            <Field label="Land type">
              <select value={editor.form.landType} onChange={(event) => setField('landType', event.target.value)} disabled={!data.canManage}>
                {LAND_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </Field>
            <Field label="Title status">
              <select value={editor.form.titleStatus} onChange={(event) => setField('titleStatus', event.target.value)} disabled={!data.canManage}>
                {TITLE_STATUSES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </Field>
            <Field label="Publishing status">
              <select value={editor.form.status} onChange={(event) => setField('status', event.target.value)} disabled={!data.canManage}>
                {LISTING_STATUSES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </Field>
            <Field label="Size in acres"><input type="number" min="0.01" step="0.01" value={editor.form.sizeAcres} onChange={(event) => setField('sizeAcres', event.target.value)} required disabled={!data.canManage} /></Field>
            <Field label="Asking price (GH₵)" hint={editor.form.price && editor.form.sizeAcres ? 'About ' + formatGhs(Number(editor.form.price) / Number(editor.form.sizeAcres)) + ' per acre' : 'Whole-plot asking price'}>
              <input type="number" min="1" step="1" value={editor.form.price} onChange={(event) => setField('price', event.target.value)} required disabled={!data.canManage} />
            </Field>
            <Field label="Coordinates" hint="Optional. Latitude,longitude for the map pin."><input value={editor.form.coordinates} onChange={(event) => setField('coordinates', event.target.value)} maxLength={80} disabled={!data.canManage} placeholder="5.7047,-0.1631" /></Field>
            <Field label="Card summary" full hint="One or two sentences shown on listing cards.">
              <textarea rows={2} value={editor.form.summary} onChange={(event) => setField('summary', event.target.value)} maxLength={400} required disabled={!data.canManage} />
            </Field>
            <Field label="Full description" full hint="Separate paragraphs with a blank line.">
              <textarea rows={7} value={editor.form.description} onChange={(event) => setField('description', event.target.value)} maxLength={10000} required disabled={!data.canManage} />
            </Field>
            <Field label="Highlights" full hint="One per line, up to 10.">
              <textarea rows={4} value={editor.form.highlights} onChange={(event) => setField('highlights', event.target.value)} disabled={!data.canManage} />
            </Field>

            <fieldset className="land-admin-images">
              <legend>Storefront images</legend>
              <p>Choose from the approved land asset library. The first selected image becomes the cover.</p>
              <div className="land-admin-image-grid">
                {IMAGE_LIBRARY.map((asset) => (
                  <label key={asset.url} className={editor.form.imageUrls.includes(asset.url) ? 'selected' : ''}>
                    <input type="checkbox" checked={editor.form.imageUrls.includes(asset.url)} onChange={() => toggleImage(asset.url)} disabled={!data.canManage} />
                    <img src={asset.url} alt="" loading="lazy" />
                    <span>{asset.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <Field label="Seller display name"><input value={editor.form.sellerName} onChange={(event) => setField('sellerName', event.target.value)} maxLength={120} disabled={!data.canManage} placeholder="Defaults to the company" /></Field>
            <Field label="Seller phone"><input value={editor.form.sellerPhone} onChange={(event) => setField('sellerPhone', event.target.value)} maxLength={40} disabled={!data.canManage} /></Field>
            <Field label="Seller email"><input type="email" value={editor.form.sellerEmail} onChange={(event) => setField('sellerEmail', event.target.value)} maxLength={254} disabled={!data.canManage} /></Field>
            <Field label="Visibility">
              <div className="land-admin-checks">
                <label><input type="checkbox" checked={editor.form.featured} onChange={(event) => setField('featured', event.target.checked)} disabled={!data.canManage} />Feature on the home page</label>
                <label><input type="checkbox" checked={editor.form.verified} onChange={(event) => setField('verified', event.target.checked)} disabled={!data.canManage} />Show the verified title badge</label>
              </div>
            </Field>

            <footer className="office-modal-actions">
              {editor.mode === 'edit' && data.canManage && editor.item.status !== 'ARCHIVED' ? <button className="office-button danger" type="button" onClick={() => archiveListing(editor.item)} disabled={busy}>Archive</button> : null}
              <button className="office-button secondary" type="button" onClick={() => setEditor(null)} disabled={busy}>Close</button>
              {data.canManage ? <button className="office-button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : editor.mode === 'create' ? 'Create listing' : 'Save changes'}</button> : null}
            </footer>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
