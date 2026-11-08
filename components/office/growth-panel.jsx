'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, Empty, Field, formatDate, Icon, jsonBody, Modal, PageHeading, Panel, Stat, StatusBadge } from './ui';

const EMPTY_PROSPECT = {
  company: '',
  contactName: '',
  jobTitle: '',
  email: '',
  phone: '',
  website: '',
  location: '',
  industry: '',
  source: 'MANUAL',
  stage: 'NEW',
  consentStatus: 'UNKNOWN',
  lawfulBasis: '',
  consentDate: '',
  consentEvidence: '',
  consentPurpose: '',
  researchNotes: '',
  notes: '',
  ownerId: '',
  suppressionReason: '',
  reopen: false
};

const EMPTY_CAMPAIGN = {
  name: '',
  subject: '',
  preview: '',
  body: '',
  segmentStage: '',
  minScore: 0
};

const EMPTY_ACTIVITY = { type: 'CALL', summary: '', detail: '' };

function dateInput(value) {
  return value ? String(value).slice(0, 10) : '';
}

function formFromProspect(prospect) {
  return {
    ...EMPTY_PROSPECT,
    company: prospect.company || '',
    contactName: prospect.contactName || '',
    jobTitle: prospect.jobTitle || '',
    email: prospect.email || '',
    phone: prospect.phone || '',
    website: prospect.website || '',
    location: prospect.location || '',
    industry: prospect.industry || '',
    source: prospect.source || 'MANUAL',
    stage: prospect.stage || 'NEW',
    consentStatus: prospect.consentStatus || 'UNKNOWN',
    lawfulBasis: prospect.lawfulBasis || '',
    consentDate: dateInput(prospect.consentAt),
    consentEvidence: prospect.consentEvidence || '',
    consentPurpose: prospect.consentPurpose || '',
    researchNotes: prospect.researchNotes || '',
    notes: prospect.notes || '',
    ownerId: prospect.ownerId || '',
    suppressionReason: prospect.suppressionReason || '',
    reopen: false
  };
}

function formFromCampaign(campaign) {
  return {
    name: campaign.name || '',
    subject: campaign.subject || '',
    preview: campaign.preview || '',
    body: campaign.body || '',
    segmentStage: campaign.segmentStage || '',
    minScore: campaign.minScore || 0
  };
}

function splitCsvLine(line) {
  const cells = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      cells.push(value.trim());
      value = '';
    } else {
      value += character;
    }
  }
  cells.push(value.trim());
  return cells;
}

function parseRows(text, industries) {
  const labels = new Map(Object.entries(industries).map(([key, label]) => [label.toLowerCase(), key]));
  const lines = String(text || '').split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const first = splitCsvLine(lines[0]).map((cell) => cell.toLowerCase());
  const hasHeader = first.includes('company') || first.includes('company name');
  const rows = hasHeader ? lines.slice(1) : lines;
  return rows
    .map((line) => {
      const cells = splitCsvLine(line);
      const industryRaw = cells[5] || '';
      return {
        company: cells[0] || '',
        contactName: cells[1] || '',
        email: cells[2] || '',
        phone: cells[3] || '',
        location: cells[4] || '',
        industry: industries[industryRaw.toUpperCase()] ? industryRaw.toUpperCase() : labels.get(industryRaw.toLowerCase()) || '',
        website: cells[6] || '',
        notes: cells[7] || ''
      };
    })
    .filter((row) => row.company.trim());
}

function Fit({ prospect }) {
  const score = Number(prospect.score || 0);
  const band = (prospect.scoreBand || 'LOW').toLowerCase();
  return (
    <span className={'growth-fit ' + band}>
      <span className="growth-fit-score">{score}</span>
      <span className="growth-fit-bar"><i style={{ width: Math.max(4, score) + '%' }} /></span>
      <small>{band === 'high' ? 'High fit' : band === 'medium' ? 'Medium fit' : 'Low fit'}</small>
    </span>
  );
}

export default function GrowthPanel({ notify, fail }) {
  const [data, setData] = useState({
    prospects: [],
    campaigns: [],
    members: [],
    settings: null,
    stats: { total: 0, eligible: 0, highIntent: 0, suppressed: 0, replied: 0, needsConsent: 0, campaigns: 0, sentCampaigns: 0 },
    canManage: false,
    canSend: false,
    stages: {},
    sources: {},
    industries: {},
    regions: [],
    consentStatuses: {},
    lawfulBases: {}
  });
  const [tab, setTab] = useState('prospects');
  const [filters, setFilters] = useState({ q: '', stage: '', consent: 'all', band: '' });
  const [editor, setEditor] = useState(null);
  const [activity, setActivity] = useState(EMPTY_ACTIVITY);
  const [campaignEditor, setCampaignEditor] = useState(null);
  const [audience, setAudience] = useState(null);
  const [results, setResults] = useState(null);
  const [enrichment, setEnrichment] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [settingsForm, setSettingsForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await api('/api/office/growth');
      setData(result);
      setSettingsForm((current) => current || {
        ...result.settings,
        target: { ...result.settings.target }
      });
      fail('');
    } catch (reason) {
      fail(reason.message);
    } finally {
      setLoading(false);
    }
  }, [fail]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const query = filters.q.trim().toLowerCase();
    return data.prospects.filter((prospect) => {
      if (filters.stage && prospect.stage !== filters.stage) return false;
      if (filters.consent === 'eligible' && !prospect.eligibility?.eligible) return false;
      if (filters.consent === 'blocked' && prospect.eligibility?.eligible) return false;
      if (filters.consent === 'suppressed' && !prospect.suppressed) return false;
      if (filters.band && prospect.scoreBand !== filters.band) return false;
      if (query) {
        const haystack = [prospect.company, prospect.contactName, prospect.email, prospect.location, prospect.industry, prospect.notes]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [data.prospects, filters]);

  function openCreate() {
    setEditor({ mode: 'create', form: { ...EMPTY_PROSPECT } });
    setActivity({ ...EMPTY_ACTIVITY });
    setEnrichment(null);
  }

  function openProspect(prospect) {
    setEditor({ mode: 'edit', id: prospect.id, item: prospect, form: formFromProspect(prospect) });
    setActivity({ ...EMPTY_ACTIVITY });
    setEnrichment(null);
  }

  function setField(key, value) {
    setEditor((current) => (current ? { ...current, form: { ...current.form, [key]: value } } : current));
  }

  async function saveProspect(event) {
    event.preventDefault();
    if (!editor) return;
    setBusy(true);
    try {
      const form = editor.form;
      const payload = {
        company: form.company,
        contactName: form.contactName,
        jobTitle: form.jobTitle,
        email: form.email,
        phone: form.phone,
        website: form.website,
        location: form.location,
        industry: form.industry || null,
        source: form.source,
        stage: form.stage,
        consentStatus: form.consentStatus,
        lawfulBasis: form.lawfulBasis || null,
        consentDate: form.consentDate || null,
        consentEvidence: form.consentEvidence,
        consentPurpose: form.consentPurpose,
        researchNotes: form.researchNotes,
        notes: form.notes,
        ownerId: form.ownerId || null,
        suppressionReason: form.suppressionReason
      };
      if (editor.mode === 'edit' && form.reopen) payload.suppressed = false;

      if (editor.mode === 'create') {
        await api('/api/office/growth', { method: 'POST', ...jsonBody(payload) });
        notify('Prospect added.');
      } else {
        await api('/api/office/growth/prospects/' + editor.id, { method: 'PATCH', ...jsonBody(payload) });
        notify(form.reopen ? 'Consent recorded and the prospect reopened.' : 'Prospect updated.');
      }
      setEditor(null);
      await load();
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  async function logActivity(event) {
    event.preventDefault();
    if (!editor?.id) return;
    setBusy(true);
    try {
      await api('/api/office/growth/prospects/' + editor.id + '/activities', {
        method: 'POST',
        ...jsonBody(activity)
      });
      setActivity({ ...EMPTY_ACTIVITY });
      notify(activity.type === 'REPLY' ? 'Reply logged. Automated campaigns will skip this prospect.' : 'Activity recorded.');
      const refreshed = await api('/api/office/growth');
      setData(refreshed);
      const updated = refreshed.prospects.find((prospect) => prospect.id === editor.id);
      if (updated) setEditor((current) => (current ? { ...current, item: updated, form: formFromProspect(updated) } : current));
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  async function markDoNotContact() {
    if (!editor?.item || !window.confirm('Add this prospect to the do-not-contact list? Marketing email will stop immediately.')) return;
    setBusy(true);
    try {
      await api('/api/office/growth/prospects/' + editor.id, {
        method: 'PATCH',
        ...jsonBody({ suppressed: true, suppressionReason: editor.form.suppressionReason || 'Requested by the office' })
      });
      notify('Prospect added to the do-not-contact list.');
      setEditor(null);
      await load();
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  async function checkWebsite() {
    if (!editor?.id || !editor.item?.website) return;
    setEnrichment({ status: 'running' });
    try {
      const result = await api('/api/office/growth/prospects/' + editor.id + '/enrich', { method: 'POST', ...jsonBody({}) });
      setEnrichment({ status: 'done', result });
      setEditor((current) => (current ? { ...current, item: result.item, form: formFromProspect(result.item) } : current));
      notify('Website checked and research notes updated.');
      await load();
    } catch (reason) {
      setEnrichment({ status: 'error', error: reason.message });
      fail(reason.message);
    }
  }

  async function clearReply() {
    if (!editor?.id || !window.confirm('Clear this reply? The prospect becomes eligible for campaigns again if consent is still valid.')) return;
    setBusy(true);
    try {
      const result = await api('/api/office/growth/prospects/' + editor.id, { method: 'PATCH', ...jsonBody({ clearReply: true }) });
      setEditor((current) => (current ? { ...current, item: result.item, form: formFromProspect(result.item) } : current));
      notify('Reply cleared.');
      await load();
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitImport(event) {
    event.preventDefault();
    const rows = parseRows(importText, data.industries);
    if (!rows.length) {
      fail('Paste at least one valid row.');
      return;
    }
    setBusy(true);
    try {
      const result = await api('/api/office/growth/prospects/import', {
        method: 'POST',
        ...jsonBody({ rows, sourceDetail: 'Pasted list import' })
      });
      notify('Imported ' + result.created + ' prospects. ' + result.skipped + ' skipped.');
      if (result.invalid?.length) fail(result.invalid.slice(0, 3).join(' '));
      setImportOpen(false);
      setImportText('');
      await load();
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  function openCampaign(campaign) {
    setCampaignEditor(campaign ? { mode: 'edit', id: campaign.id, item: campaign, form: formFromCampaign(campaign) } : { mode: 'create', form: { ...EMPTY_CAMPAIGN, minScore: data.settings?.target?.minimumScore || 0 } });
    setAudience(null);
  }

  function setCampaignField(key, value) {
    setCampaignEditor((current) => (current ? { ...current, form: { ...current.form, [key]: value } } : current));
    setAudience(null);
  }

  async function previewAudience() {
    if (!campaignEditor) return;
    setBusy(true);
    try {
      const result = await api('/api/office/growth/audience', {
        method: 'POST',
        ...jsonBody({ segmentStage: campaignEditor.form.segmentStage || null, minScore: campaignEditor.form.minScore })
      });
      setAudience(result);
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveCampaign(event) {
    event.preventDefault();
    if (!campaignEditor) return;
    setBusy(true);
    try {
      if (campaignEditor.mode === 'create') {
        await api('/api/office/growth/campaigns', { method: 'POST', ...jsonBody(campaignEditor.form) });
        notify('Campaign draft created. Approve it before sending.');
      } else {
        await api('/api/office/growth/campaigns/' + campaignEditor.id, { method: 'PATCH', ...jsonBody(campaignEditor.form) });
        notify('Campaign draft updated.');
      }
      setCampaignEditor(null);
      await load();
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  async function campaignAction(campaign, action) {
    const prompts = {
      approve: 'Approve this campaign for sending? Only consented prospects will be included.',
      cancel: 'Cancel this campaign? No further email will be sent.',
      send: 'Send the next batch now? Every recipient must have recorded marketing consent.'
    };
    if (!window.confirm(prompts[action])) return;
    setBusy(true);
    try {
      const result = await api('/api/office/growth/campaigns/' + campaign.id + '/' + action, { method: 'POST', ...jsonBody({}) });
      if (action === 'send') {
        notify('Sent ' + result.sent + ', failed ' + result.failed + ', skipped ' + result.skipped + '. ' + (result.remaining ? result.remaining + ' remaining.' : 'Campaign complete.'));
      } else if (action === 'approve') {
        notify('Campaign approved for ' + result.audience + ' consented prospects.');
      } else {
        notify('Campaign cancelled.');
      }
      await load();
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  async function openResults(campaign) {
    setBusy(true);
    try {
      setResults(await api('/api/office/growth/campaigns/' + campaign.id + '/results'));
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings(event) {
    event.preventDefault();
    if (!settingsForm) return;
    setBusy(true);
    try {
      const result = await api('/api/office/growth/settings', { method: 'PATCH', ...jsonBody(settingsForm) });
      setSettingsForm({ ...result.settings, target: { ...result.settings.target } });
      notify('Growth settings saved.');
      await load();
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  function toggleTarget(key, value) {
    setSettingsForm((current) => {
      if (!current) return current;
      const list = current.target[key] || [];
      const next = list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
      return { ...current, target: { ...current.target, [key]: next } };
    });
  }

  const stats = data.stats;

  return (
    <>
      <PageHeading
        eyebrow="GROWTH · CONSENT-FIRST"
        title="Growth & outreach"
        description="Qualify prospects with transparent scoring, record consent, and send approved email only to people who asked to hear from you."
        actions={data.canManage ? (
          <>
            <button className="office-button secondary" type="button" onClick={() => setImportOpen(true)}><Icon name="upload" size={14} />Import list</button>
            <button className="office-button primary" type="button" onClick={openCreate}><Icon name="plus" size={14} />Add prospect</button>
          </>
        ) : null}
      />

      <div className="office-stat-grid">
        <Stat label="Prospects" value={loading ? '—' : stats.total} hint="Companies and decision makers" icon="users" />
        <Stat label="Outreach-ready" value={loading ? '—' : stats.eligible} hint="Consent recorded and contactable" icon="check" tone={stats.eligible ? 'positive' : ''} />
        <Stat label="High fit" value={loading ? '—' : stats.highIntent} hint="Score of 70 or above" icon="trendUp" />
        <Stat label="Needs consent" value={loading ? '—' : stats.needsConsent} hint="Cannot be emailed yet" icon="shield" tone={stats.needsConsent ? 'attention' : ''} />
      </div>

      <p className="growth-policy">
        <Icon name="shield" size={14} />
        <span>This desk only uses records your team entered yourself. A public website check runs only when you request it and never collects email addresses. It does not scrape social networks, automate logged-in sessions, or accept purchased email lists. Marketing email requires recorded consent, a lawful basis, and a working unsubscribe link.</span>
      </p>

      <div className="growth-tabs">
        <div className="office-segmented" role="tablist" aria-label="Growth sections">
          <button type="button" className={tab === 'prospects' ? 'active' : ''} onClick={() => setTab('prospects')}>Prospects</button>
          <button type="button" className={tab === 'campaigns' ? 'active' : ''} onClick={() => setTab('campaigns')}>Campaigns</button>
          <button type="button" className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>Scoring & settings</button>
        </div>
      </div>

      {tab === 'prospects' ? (
        <>
          <form className="office-filter-bar" onSubmit={(event) => event.preventDefault()}>
            <label className="grow"><Icon name="search" size={15} /><input value={filters.q} onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} placeholder="Search company, contact, email, or region" aria-label="Search prospects" /></label>
            <label>Stage<select value={filters.stage} onChange={(event) => setFilters((current) => ({ ...current, stage: event.target.value }))}><option value="">All stages</option>{Object.entries(data.stages).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <label>Consent<select value={filters.consent} onChange={(event) => setFilters((current) => ({ ...current, consent: event.target.value }))}><option value="all">All records</option><option value="eligible">Outreach-ready</option><option value="blocked">Blocked</option><option value="suppressed">Do not contact</option></select></label>
            <label>Fit<select value={filters.band} onChange={(event) => setFilters((current) => ({ ...current, band: event.target.value }))}><option value="">Any score</option><option value="HIGH">High (70+)</option><option value="MEDIUM">Medium (45–69)</option><option value="LOW">Low (under 45)</option></select></label>
          </form>

          <Panel title="Prospect register" subtitle={filtered.length + ' shown · ' + data.prospects.length + ' tracked'}>
            <div className="office-table-wrap">
              <table className="office-table growth-table">
                <thead><tr><th>Company</th><th>Contact</th><th>Fit</th><th>Stage</th><th>Consent</th><th>Next action</th><th>Action</th></tr></thead>
                <tbody>
                  {filtered.map((prospect) => (
                    <tr key={prospect.id}>
                      <td>
                        <strong>{prospect.company}</strong>
                        <small>{[prospect.industry ? data.industries[prospect.industry] : '', prospect.location].filter(Boolean).join(' · ') || 'No sector or region recorded'}</small>
                      </td>
                      <td>
                        <strong>{prospect.contactName || '—'}</strong>
                        <small>{prospect.email || prospect.phone || 'No contact route'}</small>
                      </td>
                      <td><Fit prospect={prospect} /></td>
                      <td>
                        <StatusBadge value={prospect.stage} label={data.stages[prospect.stage]} />
                        {prospect.repliedAt ? <small className="growth-replied">Replied {formatDate(prospect.repliedAt)}</small> : null}
                      </td>
                      <td>
                        <StatusBadge value={prospect.consentStatus} label={data.consentStatuses[prospect.consentStatus]} />
                        {prospect.suppressed ? <small className="growth-suppressed">Do not contact</small> : null}
                      </td>
                      <td><small className="growth-next">{prospect.nextAction}</small></td>
                      <td><button className="office-button secondary small" type="button" onClick={() => openProspect(prospect)}>{data.canManage ? 'Open' : 'View'}</button></td>
                    </tr>
                  ))}
                  {!filtered.length ? <Empty colSpan={7}>{loading ? 'Loading prospects…' : 'No prospects match these filters. Add a company or import a list to start.'}</Empty> : null}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      ) : null}

      {tab === 'campaigns' ? (
        <>
          <div className="growth-campaign-head">
            <div>
              <h2>Email campaigns</h2>
              <p>Draft, approve as a second person, then send in controlled batches. The unsubscribe footer and header are added automatically.</p>
            </div>
            {data.canManage ? <button className="office-button primary" type="button" onClick={() => openCampaign(null)}><Icon name="plus" size={14} />New campaign</button> : null}
          </div>
          <div className="growth-campaign-grid">
            {data.campaigns.map((campaign) => (
              <article className="growth-campaign-card" key={campaign.id}>
                <div className="growth-campaign-top">
                  <div>
                    <h3>{campaign.name}</h3>
                    <p>{campaign.subject}</p>
                  </div>
                  <StatusBadge value={campaign.status} label={campaign.status.charAt(0) + campaign.status.slice(1).toLowerCase()} />
                </div>
                <dl className="growth-campaign-meta">
                  <div><dt>Audience</dt><dd>{campaign.segmentStage ? data.stages[campaign.segmentStage] : 'Any open stage'} · score {campaign.minScore}+</dd></div>
                  <div><dt>Delivery</dt><dd>{campaign.delivery.sent} sent · {campaign.delivery.replied} replied · {campaign.delivery.failed} failed · {campaign.delivery.queued} queued</dd></div>
                  <div><dt>Created</dt><dd>{formatDate(campaign.createdAt)} by {campaign.createdBy?.name || '—'}</dd></div>
                  {campaign.approvedAt ? <div><dt>Approved</dt><dd>{formatDate(campaign.approvedAt)} by {campaign.approvedBy?.name || '—'}</dd></div> : null}
                </dl>
                <div className="growth-campaign-actions">
                  {campaign.status === 'DRAFT' && data.canManage ? <button className="office-button secondary small" type="button" onClick={() => openCampaign(campaign)}>Edit draft</button> : null}
                  {campaign.status === 'DRAFT' && data.canSend ? <button className="office-button primary small" type="button" onClick={() => campaignAction(campaign, 'approve')} disabled={busy}>Approve</button> : null}
                  {(campaign.status === 'APPROVED' || campaign.status === 'SENDING') && data.canSend ? <button className="office-button primary small" type="button" onClick={() => campaignAction(campaign, 'send')} disabled={busy}>Send batch</button> : null}
                  {(campaign.status === 'DRAFT' || campaign.status === 'APPROVED') && (data.canManage || data.canSend) ? <button className="office-button secondary small" type="button" onClick={() => campaignAction(campaign, 'cancel')} disabled={busy}>Cancel</button> : null}
                  {campaign.delivery.sent + campaign.delivery.failed + campaign.delivery.skipped + campaign.delivery.queued > 0 ? <button className="office-button secondary small" type="button" onClick={() => openResults(campaign)} disabled={busy}>Results</button> : null}
                </div>
              </article>
            ))}
            {!data.campaigns.length ? <p className="office-muted">No campaigns yet. {data.canManage ? 'Create a draft to get started.' : ''}</p> : null}
          </div>
        </>
      ) : null}

      {tab === 'settings' ? (
        settingsForm ? (
          <form className="growth-settings" onSubmit={saveSettings}>
            <Panel title="Ideal customer profile" subtitle="Used by the explainable fit score. Website checks run only when you request them.">
              <div className="growth-settings-body">
                <div>
                  <p className="growth-settings-label">Target industries</p>
                  <div className="growth-checks">
                    {Object.entries(data.industries).map(([key, label]) => (
                      <label key={key}><input type="checkbox" checked={(settingsForm.target.industries || []).includes(key)} onChange={() => toggleTarget('industries', key)} disabled={!data.canManage} />{label}</label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="growth-settings-label">Target regions</p>
                  <div className="growth-checks">
                    {data.regions.map((region) => (
                      <label key={region}><input type="checkbox" checked={(settingsForm.target.regions || []).includes(region)} onChange={() => toggleTarget('regions', region)} disabled={!data.canManage} />{region}</label>
                    ))}
                  </div>
                </div>
                <div className="office-form-grid">
                  <Field label="Minimum score for outreach" hint="People below this score are excluded from sending">
                    <input type="number" min="0" max="100" value={settingsForm.target.minimumScore} onChange={(event) => setSettingsForm((current) => ({ ...current, target: { ...current.target, minimumScore: event.target.value } }))} disabled={!data.canManage} />
                  </Field>
                  <Field label="Recipients per send batch" hint="Between 1 and 100. Batches can be repeated after review.">
                    <input type="number" min="1" max="100" value={settingsForm.batchLimit} onChange={(event) => setSettingsForm((current) => ({ ...current, batchLimit: event.target.value }))} disabled={!data.canManage} />
                  </Field>
                  <Field label="Sender display name" hint="Optional. Falls back to the organization name.">
                    <input value={settingsForm.senderName} onChange={(event) => setSettingsForm((current) => ({ ...current, senderName: event.target.value }))} maxLength={120} disabled={!data.canManage} />
                  </Field>
                  <Field label="Reply-to address" hint="Replies and unsubscribe requests can be routed here">
                    <input type="email" value={settingsForm.replyTo} onChange={(event) => setSettingsForm((current) => ({ ...current, replyTo: event.target.value }))} maxLength={254} disabled={!data.canManage} />
                  </Field>
                  <Field label="Email footer" full hint="Shown with the unsubscribe link on every campaign">
                    <textarea rows={3} value={settingsForm.footer} onChange={(event) => setSettingsForm((current) => ({ ...current, footer: event.target.value }))} maxLength={600} disabled={!data.canManage} />
                  </Field>
                </div>
                {data.canManage ? <button className="office-button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button> : <p className="office-muted">You have view-only access to growth settings.</p>}
              </div>
            </Panel>
          </form>
        ) : null
      ) : null}

      {editor ? (
        <Modal
          title={editor.mode === 'create' ? 'Add prospect' : editor.item.company}
          eyebrow={editor.mode === 'create' ? 'PROSPECT' : (data.stages[editor.item.stage] || 'PROSPECT')}
          description={editor.mode === 'create' ? 'Record where the company came from. Consent is never assumed.' : editor.item.nextAction}
          onClose={() => (busy ? null : setEditor(null))}
          wide
        >
          {editor.mode === 'edit' && editor.item.repliedAt ? (
            <p className="growth-reply-note">
              <Icon name="mail" size={14} />
              <span><strong>Replied {formatDate(editor.item.repliedAt)}</strong>{editor.item.lastReplySummary ? ' · ' + editor.item.lastReplySummary : ''}. Automated campaigns skip this prospect — follow up personally.</span>
              {data.canManage ? <button className="office-button secondary small" type="button" onClick={clearReply} disabled={busy}>Clear reply</button> : null}
            </p>
          ) : null}
          <form className="office-form-grid growth-form" onSubmit={saveProspect}>
            <Field label="Company or organisation" full><input value={editor.form.company} onChange={(event) => setField('company', event.target.value)} maxLength={160} required disabled={!data.canManage} /></Field>
            <Field label="Contact name"><input value={editor.form.contactName} onChange={(event) => setField('contactName', event.target.value)} maxLength={120} disabled={!data.canManage} /></Field>
            <Field label="Job title"><input value={editor.form.jobTitle} onChange={(event) => setField('jobTitle', event.target.value)} maxLength={120} disabled={!data.canManage} /></Field>
            <Field label="Email"><input type="email" value={editor.form.email} onChange={(event) => setField('email', event.target.value)} maxLength={254} disabled={!data.canManage} /></Field>
            <Field label="Phone"><input value={editor.form.phone} onChange={(event) => setField('phone', event.target.value)} maxLength={40} disabled={!data.canManage} /></Field>
            <Field label="Website"><input value={editor.form.website} onChange={(event) => setField('website', event.target.value)} maxLength={300} placeholder="https://" disabled={!data.canManage} /></Field>
            <Field label="Region or city">
              <select value={editor.form.location} onChange={(event) => setField('location', event.target.value)} disabled={!data.canManage}>
                <option value="">Not recorded</option>
                {data.regions.map((region) => <option key={region} value={region}>{region}</option>)}
              </select>
            </Field>
            <Field label="Industry">
              <select value={editor.form.industry} onChange={(event) => setField('industry', event.target.value)} disabled={!data.canManage}>
                <option value="">Not recorded</option>
                {Object.entries(data.industries).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </Field>
            <Field label="Source">
              <select value={editor.form.source} onChange={(event) => setField('source', event.target.value)} disabled={!data.canManage}>
                {Object.entries(data.sources).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </Field>
            <Field label="Pipeline stage">
              <select value={editor.form.stage} onChange={(event) => setField('stage', event.target.value)} disabled={!data.canManage}>
                {Object.entries(data.stages).filter(([key]) => (key !== 'SUPPRESSED' || editor.form.stage === 'SUPPRESSED') && (key !== 'RESPONDED' || editor.form.stage === 'RESPONDED')).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </Field>
            <Field label="Owner">
              <select value={editor.form.ownerId} onChange={(event) => setField('ownerId', event.target.value)} disabled={!data.canManage}>
                <option value="">Unassigned</option>
                {data.members.map((member) => <option key={member.id} value={member.id}>{member.name}{member.jobTitle ? ' · ' + member.jobTitle : ''}</option>)}
              </select>
            </Field>

            <fieldset className="growth-consent-box">
              <legend>Consent & lawful basis</legend>
              <div className="office-form-grid">
                <Field label="Consent status">
                  <select value={editor.form.consentStatus} onChange={(event) => setField('consentStatus', event.target.value)} disabled={!data.canManage}>
                    {Object.entries(data.consentStatuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                </Field>
                {editor.form.consentStatus === 'GRANTED' ? (
                  <>
                    <Field label="Lawful basis">
                      <select value={editor.form.lawfulBasis} onChange={(event) => setField('lawfulBasis', event.target.value)} disabled={!data.canManage}>
                        <option value="">Choose one</option>
                        <option value="CONSENT">Consent</option>
                        <option value="LEGITIMATE_INTEREST">Legitimate interest</option>
                      </select>
                    </Field>
                    <Field label="Date captured"><input type="date" value={editor.form.consentDate} onChange={(event) => setField('consentDate', event.target.value)} disabled={!data.canManage} /></Field>
                    <Field label="How consent was captured" full hint="Record the form, email, or conversation and its date">
                      <textarea rows={2} value={editor.form.consentEvidence} onChange={(event) => setField('consentEvidence', event.target.value)} maxLength={2000} required disabled={!data.canManage} placeholder="e.g. Signed enquiry form dated 12 Oct 2026 requesting updates about new estates." />
                    </Field>
                  </>
                ) : null}
                {editor.form.consentStatus === 'WITHDRAWN' ? (
                  <Field label="Withdrawal note" full><input value={editor.form.suppressionReason} onChange={(event) => setField('suppressionReason', event.target.value)} maxLength={300} disabled={!data.canManage} placeholder="How and when the person opted out" /></Field>
                ) : null}
                {editor.mode === 'edit' && editor.item.suppressed ? (
                  <label className="growth-reopen">
                    <input type="checkbox" checked={editor.form.reopen} onChange={(event) => setField('reopen', event.target.checked)} disabled={!data.canManage || editor.form.consentStatus !== 'GRANTED'} />
                    Reopen outreach with this fresh consent
                  </label>
                ) : null}
              </div>
              <p className="growth-consent-note">Withdrawal or an unsubscribe link adds the record to the do-not-contact list. Transactional messages tied to an active agreement are handled separately.</p>
            </fieldset>

            {editor.mode === 'edit' ? (
              <div className="growth-site-check">
                <div>
                  <strong>Public website check</strong>
                  <small>{editor.item.website ? 'Uses the saved website to summarise the homepage. Email addresses are never collected.' : 'Add and save a website address to run this check.'}</small>
                </div>
                <button className="office-button secondary small" type="button" onClick={checkWebsite} disabled={!data.canManage || !editor.item.website || enrichment?.status === 'running'}>
                  {enrichment?.status === 'running' ? 'Checking…' : 'Check website'}
                </button>
                {enrichment?.status === 'done' ? (
                  <p className="growth-site-result">
                    <strong>{enrichment.result.profile.title || 'Homepage checked'}</strong>
                    {enrichment.result.profile.description || 'No description was published on the homepage.'}
                    <small>{[
                      enrichment.result.profile.industry ? data.industries[enrichment.result.profile.industry] : '',
                      enrichment.result.profile.hasContactPage ? 'Contact page found' : '',
                      enrichment.result.profile.social?.length ? 'Social profiles: ' + enrichment.result.profile.social.join(', ') : ''
                    ].filter(Boolean).join(' · ') || 'No additional signals found'}</small>
                  </p>
                ) : null}
                {enrichment?.status === 'error' ? <p className="growth-site-error">{enrichment.error}</p> : null}
              </div>
            ) : null}

            <Field label="Research notes" full hint="Why this company fits. Longer, specific notes improve the score.">
              <textarea rows={3} value={editor.form.researchNotes} onChange={(event) => setField('researchNotes', event.target.value)} maxLength={4000} disabled={!data.canManage} />
            </Field>
            <Field label="Internal notes" full><textarea rows={2} value={editor.form.notes} onChange={(event) => setField('notes', event.target.value)} maxLength={4000} disabled={!data.canManage} /></Field>

            {editor.mode === 'edit' ? (
              <div className="growth-breakdown">
                <div className="growth-breakdown-head">
                  <strong>Fit score {editor.item.score} · {editor.item.scoreBand}</strong>
                  <span>{editor.item.eligibility?.eligible ? 'Outreach-ready' : 'Not sendable yet'}</span>
                </div>
                <ul>
                  {(Array.isArray(editor.item.scoreReasons) ? editor.item.scoreReasons : []).map((reason) => (
                    <li key={reason.key}><span>{reason.label}</span><small>{reason.detail}</small><strong>{reason.points}/{reason.max}</strong></li>
                  ))}
                </ul>
                {!editor.item.eligibility?.eligible ? <p className="growth-blocked">{editor.item.eligibility?.reasons.join(' ')}</p> : null}
              </div>
            ) : null}

            <footer className="office-modal-actions">
              {editor.mode === 'edit' && data.canManage && !editor.item.suppressed ? <button className="office-button danger" type="button" onClick={markDoNotContact} disabled={busy}>Do not contact</button> : null}
              <button className="office-button secondary" type="button" onClick={() => setEditor(null)} disabled={busy}>Close</button>
              {data.canManage ? <button className="office-button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : editor.mode === 'create' ? 'Add prospect' : 'Save changes'}</button> : null}
            </footer>
          </form>

          {editor.mode === 'edit' ? (
            <div className="growth-timeline">
              <h3>Activity</h3>
              <form className="growth-activity-form" onSubmit={logActivity}>
                <select value={activity.type} onChange={(event) => setActivity((current) => ({ ...current, type: event.target.value }))} disabled={!data.canManage}>
                  <option value="CALL">Call</option>
                  <option value="EMAIL">Email</option>
                  <option value="MEETING">Meeting</option>
                  <option value="REPLY">Reply received</option>
                  <option value="NOTE">Note</option>
                </select>
                <input value={activity.summary} onChange={(event) => setActivity((current) => ({ ...current, summary: event.target.value }))} maxLength={200} required placeholder={activity.type === 'REPLY' ? 'What did they say?' : 'What happened?'} disabled={!data.canManage} />
                <button className="office-button secondary small" type="submit" disabled={busy || !data.canManage}>Record</button>
              </form>
              <ul className="growth-activity-list">
                {(editor.item.activities || []).map((entry) => (
                  <li key={entry.id}>
                    <strong>{entry.summary}</strong>
                    <small>{entry.type} · {formatDate(entry.createdAt)} · {entry.user?.name || 'System'}</small>
                    {entry.detail ? <p>{entry.detail}</p> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Modal>
      ) : null}

      {campaignEditor ? (
        <Modal
          title={campaignEditor.mode === 'create' ? 'New campaign' : campaignEditor.item.name}
          eyebrow="EMAIL CAMPAIGN"
          description="Draft the message, preview the consented audience, then approve and send in batches."
          onClose={() => (busy ? null : setCampaignEditor(null))}
          wide
        >
          <form className="office-form-grid growth-form" onSubmit={saveCampaign}>
            <Field label="Campaign name"><input value={campaignEditor.form.name} onChange={(event) => setCampaignField('name', event.target.value)} maxLength={140} required /></Field>
            <Field label="Subject line"><input value={campaignEditor.form.subject} onChange={(event) => setCampaignField('subject', event.target.value)} maxLength={180} required /></Field>
            <Field label="Preview text" full hint="Optional line shown by some email clients"><input value={campaignEditor.form.preview} onChange={(event) => setCampaignField('preview', event.target.value)} maxLength={300} /></Field>
            <Field label="Audience stage">
              <select value={campaignEditor.form.segmentStage} onChange={(event) => setCampaignField('segmentStage', event.target.value)}>
                <option value="">Any open stage</option>
                {Object.entries(data.stages).filter(([key]) => key !== 'SUPPRESSED' && key !== 'LOST').map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </Field>
            <Field label="Minimum fit score"><input type="number" min="0" max="100" value={campaignEditor.form.minScore} onChange={(event) => setCampaignField('minScore', event.target.value)} /></Field>
            <Field label="Message" full hint="Use {{company}} or {{contactName}} to personalise. The unsubscribe footer is appended automatically.">
              <textarea rows={8} value={campaignEditor.form.body} onChange={(event) => setCampaignField('body', event.target.value)} maxLength={8000} required />
            </Field>
            <div className="growth-audience">
              <button className="office-button secondary small" type="button" onClick={previewAudience} disabled={busy}>Preview audience</button>
              {audience ? (
                <div className="growth-audience-result">
                  <strong>{audience.count} consented prospects</strong>
                  {audience.sample?.length ? <small>{audience.sample.map((item) => item.company).join(' · ')}</small> : <small>No contacts match yet.</small>}
                </div>
              ) : null}
            </div>
            <footer className="office-modal-actions">
              <button className="office-button secondary" type="button" onClick={() => setCampaignEditor(null)} disabled={busy}>Cancel</button>
              <button className="office-button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : campaignEditor.mode === 'create' ? 'Save draft' : 'Save changes'}</button>
            </footer>
          </form>
        </Modal>
      ) : null}

      {results ? (
        <Modal title={results.campaign.name} eyebrow="CAMPAIGN RESULTS" description={results.campaign.subject} onClose={() => setResults(null)} wide>
          <div className="growth-results">
            <div className="growth-results-summary">
              <div><span>Recipients</span><strong>{results.delivery.total}</strong></div>
              <div><span>Delivered</span><strong>{results.delivery.sent}</strong></div>
              <div><span>Replied</span><strong>{results.delivery.replied}</strong></div>
              <div><span>Failed</span><strong>{results.delivery.failed}</strong></div>
              <div><span>Queued</span><strong>{results.delivery.queued}</strong></div>
            </div>
            <div className="office-table-wrap">
              <table className="office-table growth-results-table">
                <thead><tr><th>Recipient</th><th>Delivery</th><th>Sent</th><th>Reply</th></tr></thead>
                <tbody>
                  {results.recipients.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.name || row.prospect?.company || row.email}</strong>
                        <small>{row.email}</small>
                      </td>
                      <td>
                        <StatusBadge value={row.status} />
                        {row.error ? <small className="growth-result-error">{row.error}</small> : null}
                      </td>
                      <td><small>{row.sentAt ? formatDate(row.sentAt) : '—'}</small></td>
                      <td>
                        {row.prospect?.repliedAt ? (
                          <>
                            <strong className="growth-replied-inline">Replied {formatDate(row.prospect.repliedAt)}</strong>
                            {row.prospect.lastReplySummary ? <small>{row.prospect.lastReplySummary}</small> : null}
                          </>
                        ) : <small className="office-muted">No reply</small>}
                      </td>
                    </tr>
                  ))}
                  {!results.recipients.length ? <Empty colSpan={4}>No email has been sent from this campaign yet.</Empty> : null}
                </tbody>
              </table>
            </div>
            {results.truncated ? <p className="office-muted">Showing the first 200 recipients.</p> : null}
          </div>
        </Modal>
      ) : null}

      {importOpen ? (
        <Modal title="Import prospects" eyebrow="LIST IMPORT" description="Paste rows as CSV: company, contact, email, phone, region, industry, website, notes. Consent is never imported." onClose={() => (busy ? null : setImportOpen(false))} wide>
          <form className="growth-import" onSubmit={submitImport}>
            <textarea rows={10} value={importText} onChange={(event) => setImportText(event.target.value)} placeholder={'Company,Contact,Email,Phone,Region,Industry,Website,Notes\nAdom Estates,Kwame Mensah,kwame@adom.example,+233 20 000 0000,Greater Accra,REAL_ESTATE,https://adom.example,Expanding into gated communities'} />
            <p className="growth-consent-note">Imported records start with no consent and cannot receive email until someone records a lawful basis and evidence on the individual record.</p>
            <footer className="office-modal-actions">
              <button className="office-button secondary" type="button" onClick={() => setImportOpen(false)} disabled={busy}>Cancel</button>
              <button className="office-button primary" type="submit" disabled={busy}>{busy ? 'Importing…' : 'Import rows'}</button>
            </footer>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
