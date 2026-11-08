'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  api, CATEGORY_LABELS, Field, formatDateTime, Icon, jsonBody, PageHeading,
  Panel, StatusBadge
} from './ui';

const GROUPS = [
  { key: 'organization', label: 'Organization', icon: 'building', permissions: ['settings.manage'] },
  { key: 'card', label: 'Visitor cards', icon: 'badge', permissions: ['settings.manage', 'cards.configure'] },
  { key: 'print', label: 'Printing', icon: 'print', permissions: ['settings.manage', 'cards.configure'] },
  { key: 'notifications', label: 'Email notifications', icon: 'bell', permissions: ['settings.manage', 'notifications.manage'] },
  { key: 'security', label: 'Visitor security', icon: 'shield', permissions: ['settings.manage'] }
];

const BRAND_PRESETS = [
  { label: 'Forest', value: '#125b38' },
  { label: 'Ocean', value: '#1f4e79' },
  { label: 'Charcoal', value: '#33413a' },
  { label: 'Gold', value: '#9a6b1f' },
  { label: 'Burgundy', value: '#7a2e2e' }
];

const COMMON_TIMEZONES = ['Africa/Accra', 'Africa/Lagos', 'Africa/Nairobi', 'Africa/Johannesburg', 'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Australia/Sydney', 'UTC'];

const TIMEZONES = (() => {
  try {
    return typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('timeZone')
      : COMMON_TIMEZONES;
  } catch {
    return COMMON_TIMEZONES;
  }
})();

export default function SettingsPanel({ user, notify, fail }) {
  const [settings, setSettings] = useState(null);
  const [meta, setMeta] = useState({});
  const [group, setGroup] = useState('organization');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const groups = GROUPS.filter((item) => item.permissions.some((permission) => user.permissions.includes(permission)));

  const load = useCallback(async () => {
    try {
      const data = await api('/api/office/settings');
      setSettings(data.settings);
      setMeta(data);
    } catch (reason) {
      fail(reason.message);
    } finally {
      setLoading(false);
    }
  }, [fail]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (groups.length && !groups.some((item) => item.key === group)) setGroup(groups[0].key);
  }, [groups, group]);

  async function save(payload) {
    setBusy(true);
    try {
      await api('/api/office/settings', { method: 'PATCH', ...jsonBody({ group, value: payload }) });
      notify(settingsLabel(group) + ' settings saved.');
      await load();
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="office-muted">Loading settings…</p>;
  if (!settings) return <p className="office-muted">Settings are unavailable for your account.</p>;

  return (
    <>
      <PageHeading eyebrow="SYSTEM CONFIGURATION" title="Settings" description="Organization identity, visitor card design, printing, email notifications, and visitor security policy." />

      <div className="office-settings-layout">
        <nav className="office-settings-nav">
          {groups.map((item) => (
            <button key={item.key} type="button" className={group === item.key ? 'active' : ''} onClick={() => setGroup(item.key)}>
              <Icon name={item.icon} size={16} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="office-settings-body">
          {group === 'organization' && settings.organization ? <OrganizationSettings value={settings.organization} busy={busy} onSave={save} /> : null}
          {group === 'card' && settings.card ? <CardSettings value={settings.card} busy={busy} onSave={save} /> : null}
          {group === 'print' && settings.print ? <PrintSettings value={settings.print} busy={busy} onSave={save} /> : null}
          {group === 'notifications' && settings.notifications ? <NotificationSettings value={settings.notifications} meta={meta} busy={busy} onSave={save} notify={notify} fail={fail} /> : null}
          {group === 'security' && settings.security ? <SecuritySettings value={settings.security} busy={busy} onSave={save} /> : null}
          {!settings[group] ? <Panel title="Restricted settings"><p className="office-muted">Your role cannot view this settings group.</p></Panel> : null}
        </div>
      </div>
    </>
  );
}

function settingsLabel(group) {
  return GROUPS.find((item) => item.key === group)?.label || 'Settings';
}

function FormActions({ busy, label }) {
  return <footer className="office-modal-actions"><button className="office-button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save ' + label}</button></footer>;
}

function organizationForm(value) {
  return {
    name: value.name || '',
    legalName: value.legalName || '',
    email: value.email || '',
    phone: value.phone || '',
    website: value.website || '',
    timezone: value.timezone || 'Africa/Accra',
    logoLetter: value.logoLetter || '',
    brandColor: value.brandColor || '#125b38',
    address: value.address || ''
  };
}

function withScheme(raw) {
  const text = String(raw || '').trim();
  if (!text) return '';
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : 'https://' + text;
}

function isWebUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function isTimeZone(value) {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function localTimeLabel(zone) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: zone,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date());
  } catch {
    return 'Invalid timezone';
  }
}

function OrganizationSettings({ value, busy, onSave }) {
  const [form, setForm] = useState(() => organizationForm(value));
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setForm(organizationForm(value));
    setError('');
    setDirty(false);
  }, [value]);

  function update(key, next) {
    setForm((current) => ({ ...current, [key]: next }));
    setDirty(true);
    setError('');
  }

  function reset() {
    setForm(organizationForm(value));
    setError('');
    setDirty(false);
  }

  function submit(event) {
    event.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const website = withScheme(form.website);
    const timezone = form.timezone.trim();
    const logoLetter = form.logoLetter.trim().toUpperCase();
    const brandColor = form.brandColor.trim();
    if (!name) return setError('Enter the organization display name.');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Enter a valid organization email address.');
    if (website && !isWebUrl(website)) return setError('Enter a valid website address, for example https://asanteland.com.');
    if (!isTimeZone(timezone)) return setError('Choose a valid timezone, for example Africa/Accra.');
    if (!/^[\p{L}\p{N}]{1,2}$/u.test(logoLetter)) return setError('The logo mark must be one or two letters or numbers.');
    if (!/^#[0-9a-fA-F]{6}$/.test(brandColor)) return setError('Choose a six-digit brand color such as #125b38.');
    onSave({ ...form, name, email, website, timezone, logoLetter, brandColor });
  }

  const mark = (form.logoLetter || form.name.trim().charAt(0) || 'A').toUpperCase();
  const website = withScheme(form.website);
  const websiteValid = website && isWebUrl(website);
  const pickerColor = /^#[0-9a-fA-F]{6}$/.test(form.brandColor) ? form.brandColor : '#125b38';
  const localTime = localTimeLabel(form.timezone);

  return (
    <div className="office-identity-layout">
      <form className="office-identity-form" onSubmit={submit}>
        <Panel title="Organization identity" subtitle="Used on visitor cards, printed badges, and portal branding.">
          <div className="office-form-grid">
            <Field label="Display name" hint="Shown in the portal header and on visitor cards.">
              <input value={form.name} onChange={(event) => update('name', event.target.value)} required maxLength={120} autoComplete="organization" />
            </Field>
            <Field label="Legal name" hint="Printed in email footers and receipts.">
              <input value={form.legalName} onChange={(event) => update('legalName', event.target.value)} maxLength={150} autoComplete="organization" />
            </Field>
            <Field label="Email">
              <input value={form.email} onChange={(event) => update('email', event.target.value)} type="email" maxLength={254} autoComplete="email" />
            </Field>
            <Field label="Phone">
              <input value={form.phone} onChange={(event) => update('phone', event.target.value)} type="tel" maxLength={40} autoComplete="tel" />
            </Field>
            <Field label="Website" hint="If you leave out the scheme, https:// is added when you save.">
              <input value={form.website} onChange={(event) => update('website', event.target.value)} onBlur={() => update('website', withScheme(form.website))} maxLength={200} placeholder="https://asanteland.com" inputMode="url" autoComplete="url" />
            </Field>
            <Field label="Timezone" hint="IANA zone used for printed cards and audit timestamps.">
              <input value={form.timezone} onChange={(event) => update('timezone', event.target.value)} list="office-timezones" maxLength={80} placeholder="Africa/Accra" autoComplete="off" spellCheck={false} />
            </Field>
            <Field label="Logo mark" hint="One or two letters or numbers shown in the brand badge.">
              <input value={form.logoLetter} onChange={(event) => update('logoLetter', event.target.value.toUpperCase().replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2))} maxLength={2} placeholder={mark} />
            </Field>
            <Field label="Brand color" hint="Applied to the portal accent and visitor cards.">
              <div className="office-color-field">
                <input type="color" value={pickerColor} onChange={(event) => update('brandColor', event.target.value)} aria-label="Pick brand color" />
                <input value={form.brandColor} onChange={(event) => update('brandColor', event.target.value)} maxLength={7} aria-label="Brand color hex value" spellCheck={false} />
              </div>
              <div className="office-color-swatches">
                {BRAND_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    style={{ background: preset.value }}
                    onClick={() => update('brandColor', preset.value)}
                    aria-label={'Use ' + preset.label + ' brand color'}
                    aria-pressed={form.brandColor.toLowerCase() === preset.value}
                  />
                ))}
              </div>
            </Field>
            <Field label="Address" hint="Street, city, and country. Printed on badges and email footers." full>
              <textarea value={form.address} onChange={(event) => update('address', event.target.value)} rows={3} maxLength={300} />
            </Field>
          </div>
          <datalist id="office-timezones">
            {TIMEZONES.map((zone) => <option key={zone} value={zone} />)}
          </datalist>
        </Panel>
        {error ? <p className="office-error" role="alert">{error}</p> : null}
        <footer className="office-modal-actions">
          <button className="office-button secondary" type="button" onClick={reset} disabled={busy || !dirty}>Reset</button>
          <button className="office-button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save organization'}</button>
        </footer>
      </form>

      <aside className="office-identity-preview" aria-label="Organization identity preview">
        <div className="office-identity-preview-head">
          <strong>Live preview</strong>
          <span>Brand</span>
        </div>
        <div className="office-brand-preview" style={{ '--brand': form.brandColor }}>
          <div className="office-brand-row">
            <div className="office-brand-mark" aria-hidden="true">{mark}</div>
            <div className="office-brand-copy">
              <strong>{form.name || 'Organization name'}</strong>
              <span>{form.legalName || 'Legal name not set'}</span>
            </div>
          </div>
          <dl className="office-brand-details">
            <div><dt>Email</dt><dd>{form.email || '—'}</dd></div>
            <div><dt>Phone</dt><dd>{form.phone || '—'}</dd></div>
            <div><dt>Website</dt><dd>{websiteValid ? <a href={website} target="_blank" rel="noreferrer">{website.replace(/^https?:\/\//i, '')}</a> : form.website || '—'}</dd></div>
            <div><dt>Address</dt><dd>{form.address || '—'}</dd></div>
            <div><dt>Timezone</dt><dd>{form.timezone || '—'}</dd></div>
            <div><dt>Local time</dt><dd>{localTime}</dd></div>
          </dl>
        </div>
        <p className="office-identity-note">This identity appears on visitor cards, printed badges, and portal branding. Changes show here before you save.</p>
      </aside>
    </div>
  );
}

function CardSettings({ value, busy, onSave }) {
  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave({
      templateName: form.get('templateName'),
      headerText: form.get('headerText'),
      footerText: form.get('footerText'),
      instructions: form.get('instructions'),
      accessZones: form.get('accessZones'),
      showPhoto: form.get('showPhoto') === 'on',
      showHost: form.get('showHost') === 'on',
      showQr: form.get('showQr') === 'on',
      accentColor: form.get('accentColor'),
      paperSize: form.get('paperSize'),
      autoPrint: form.get('autoPrint') === 'on'
    });
  }
  return (
    <form onSubmit={submit}>
      <Panel title="Visitor card template" subtitle="Controls the temporary visitor badge issued at check-in.">
        <div className="office-form-grid">
          <Field label="Template name"><input name="templateName" defaultValue={value.templateName} maxLength={120} /></Field>
          <Field label="Header text"><input name="headerText" defaultValue={value.headerText} maxLength={60} /></Field>
          <Field label="Accent color"><input name="accentColor" type="color" defaultValue={value.accentColor} /></Field>
          <Field label="Card size">
            <select name="paperSize" defaultValue={value.paperSize}>
              <option value="CR80">CR80 · standard ID card</option>
              <option value="A6">A6 · half A4</option>
              <option value="A4">A4 · full page</option>
            </select>
          </Field>
          <Field label="Access zones" full hint="Printed on the card under ACCESS."><input name="accessZones" defaultValue={value.accessZones} maxLength={300} /></Field>
          <Field label="Instructions" full><textarea name="instructions" defaultValue={value.instructions} rows={2} maxLength={300} /></Field>
          <Field label="Footer notice" full><textarea name="footerText" defaultValue={value.footerText} rows={2} maxLength={300} /></Field>
        </div>
        <div className="office-toggle-grid">
          <label className="office-check-option"><input name="showPhoto" type="checkbox" defaultChecked={value.showPhoto} /> Show visitor photo</label>
          <label className="office-check-option"><input name="showHost" type="checkbox" defaultChecked={value.showHost} /> Show host and department</label>
          <label className="office-check-option"><input name="showQr" type="checkbox" defaultChecked={value.showQr} /> Print access QR code</label>
          <label className="office-check-option"><input name="autoPrint" type="checkbox" defaultChecked={value.autoPrint} /> Open print dialog after issuing a card</label>
        </div>
      </Panel>
      <FormActions busy={busy} label="card template" />
    </form>
  );
}

function PrintSettings({ value, busy, onSave }) {
  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave({
      autoPrint: form.get('autoPrint') === 'on',
      cardWidthMm: form.get('cardWidthMm'),
      cardHeightMm: form.get('cardHeightMm'),
      printerName: form.get('printerName'),
      copies: form.get('copies')
    });
  }
  return (
    <form onSubmit={submit}>
      <Panel title="Printing" subtitle="Physical dimensions and default print behaviour for visitor cards.">
        <div className="office-form-grid">
          <Field label="Card width (mm)"><input name="cardWidthMm" type="number" min="40" max="210" defaultValue={value.cardWidthMm} /></Field>
          <Field label="Card height (mm)"><input name="cardHeightMm" type="number" min="30" max="297" defaultValue={value.cardHeightMm} /></Field>
          <Field label="Default printer" hint="Browsers may still ask you to confirm the printer."><input name="printerName" defaultValue={value.printerName || ''} maxLength={120} placeholder="Reception card printer" /></Field>
          <Field label="Copies"><input name="copies" type="number" min="1" max="10" defaultValue={value.copies} /></Field>
        </div>
        <label className="office-check-option"><input name="autoPrint" type="checkbox" defaultChecked={value.autoPrint} /> Automatically open the print dialog</label>
        <p className="office-hint-line">The printable card honours browser print settings. Choose CR80 card stock for standard ID badges.</p>
      </Panel>
      <FormActions busy={busy} label="print settings" />
    </form>
  );
}

function NotificationSettings({ value, meta, busy, onSave, notify, fail }) {
  const [testTo, setTestTo] = useState('');
  const [result, setResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [log, setLog] = useState([]);
  const [logStatus, setLogStatus] = useState('');

  const canLog = meta.canManageNotifications;

  const loadLog = useCallback(async () => {
    if (!canLog) return;
    try {
      const data = await api('/api/office/notifications' + (logStatus ? '?status=' + logStatus : ''));
      setLog(data.notifications);
    } catch (reason) {
      fail(reason.message);
    }
  }, [canLog, logStatus, fail]);

  useEffect(() => { loadLog(); }, [loadLog]);

  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave({
      emailEnabled: form.get('emailEnabled') === 'on',
      notifyHostOnRegister: form.get('notifyHostOnRegister') === 'on',
      notifyVisitorOnRegister: form.get('notifyVisitorOnRegister') === 'on',
      notifyOpsOnApprovalRequired: form.get('notifyOpsOnApprovalRequired') === 'on',
      notifyVisitorOnDecision: form.get('notifyVisitorOnDecision') === 'on',
      notifyHostOnCheckIn: form.get('notifyHostOnCheckIn') === 'on',
      notifyVisitorOnCheckOut: form.get('notifyVisitorOnCheckOut') === 'on',
      opsEmail: form.get('opsEmail'),
      replyTo: form.get('replyTo'),
      fallbackRecipient: form.get('fallbackRecipient')
    });
  }

  async function sendTest(event) {
    event.preventDefault();
    setTesting(true);
    setResult(null);
    try {
      const data = await api('/api/office/notifications', { method: 'POST', ...jsonBody({ to: testTo || undefined }) });
      setResult({ ok: true, message: 'Test email sent to ' + data.to + '.' });
      notify('Test email sent.');
      loadLog();
    } catch (reason) {
      const message = reason.status === 503
        ? 'Email is not configured on this deployment. Add RESEND_API_KEY and EMAIL_FROM to the environment, then retry.'
        : reason.message;
      setResult({ ok: false, message });
      fail(message);
      loadLog();
    } finally {
      setTesting(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <Panel title="Email notifications" subtitle="Resend-powered visitor and host notifications. Delivery is logged for every attempt.">
        <div className="office-email-status">
          <div>
            <span className="office-eyebrow">TRANSPORT</span>
            <strong>{meta.emailConfigured ? 'Resend API connected' : 'Resend API not configured'}</strong>
            <small>{meta.emailConfigured ? 'Emails will be delivered through Resend.' : 'Set RESEND_API_KEY and EMAIL_FROM to enable delivery. Notifications are logged as SKIPPED until then.'}</small>
          </div>
          <StatusBadge value={meta.emailConfigured ? 'ACTIVE' : 'PENDING'} label={meta.emailConfigured ? 'Ready' : 'Not configured'} />
        </div>

        <div className="office-toggle-grid two">
          <label className="office-check-option"><input name="emailEnabled" type="checkbox" defaultChecked={value.emailEnabled} /> Enable email notifications</label>
          <label className="office-check-option"><input name="notifyHostOnRegister" type="checkbox" defaultChecked={value.notifyHostOnRegister} /> Notify host when a visitor pre-registers</label>
          <label className="office-check-option"><input name="notifyVisitorOnRegister" type="checkbox" defaultChecked={value.notifyVisitorOnRegister} /> Confirm registration to the visitor</label>
          <label className="office-check-option"><input name="notifyOpsOnApprovalRequired" type="checkbox" defaultChecked={value.notifyOpsOnApprovalRequired} /> Alert operations when approval is required</label>
          <label className="office-check-option"><input name="notifyVisitorOnDecision" type="checkbox" defaultChecked={value.notifyVisitorOnDecision} /> Notify visitor of approval or denial</label>
          <label className="office-check-option"><input name="notifyHostOnCheckIn" type="checkbox" defaultChecked={value.notifyHostOnCheckIn} /> Notify host when the visitor checks in</label>
          <label className="office-check-option"><input name="notifyVisitorOnCheckOut" type="checkbox" defaultChecked={value.notifyVisitorOnCheckOut} /> Send check-out confirmation</label>
        </div>

        <div className="office-form-grid">
          <Field label="Operations inbox" hint="Receives approval alerts when no host or fallback is set."><input name="opsEmail" type="email" defaultValue={value.opsEmail || ''} maxLength={254} /></Field>
          <Field label="Reply-to address"><input name="replyTo" type="email" defaultValue={value.replyTo || ''} maxLength={254} /></Field>
          <Field label="Fallback recipient" hint="Used when a host has no email address." full><input name="fallbackRecipient" type="email" defaultValue={value.fallbackRecipient || ''} maxLength={254} /></Field>
        </div>
      </Panel>

      <FormActions busy={busy} label="notification settings" />

      {canLog ? (
        <>
          <Panel title="Send a test email" subtitle="Verify the Resend integration with a real message.">
            <div className="office-inline-form">
              <input type="email" value={testTo} onChange={(event) => setTestTo(event.target.value)} placeholder="recipient@example.com (defaults to your inbox)" maxLength={254} aria-label="Test recipient" />
              <button className="office-button secondary" type="button" onClick={sendTest} disabled={testing}>{testing ? 'Sending…' : 'Send test email'}</button>
            </div>
            {result ? <div className={result.ok ? 'office-alert success' : 'office-alert error'} role="status">{result.message}</div> : null}
            <p className="office-hint-line">The API key is read from the server environment only. It is never stored in settings or sent to the browser.</p>
          </Panel>

          <Panel
            title="Delivery log"
            subtitle="Sent, failed, and skipped notification attempts."
            action={<select value={logStatus} onChange={(event) => setLogStatus(event.target.value)} aria-label="Filter delivery log"><option value="">All statuses</option><option value="SENT">Sent</option><option value="FAILED">Failed</option><option value="SKIPPED">Skipped</option></select>}
          >
            <div className="office-table-wrap">
              <table className="office-table">
                <thead><tr><th>Time</th><th>Recipient</th><th>Subject</th><th>Template</th><th>Status</th><th>Detail</th></tr></thead>
                <tbody>
                  {log.map((item) => (
                    <tr key={item.id}>
                      <td>{formatDateTime(item.createdAt)}</td>
                      <td>{item.recipient}</td>
                      <td><strong>{item.subject}</strong></td>
                      <td>{item.template}</td>
                      <td><StatusBadge value={item.status} /></td>
                      <td className="office-audit-meta">{item.error || '—'}</td>
                    </tr>
                  ))}
                  {!log.length ? <tr><td colSpan={6} className="office-empty">No notifications logged yet.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      ) : null}
    </form>
  );
}

function SecuritySettings({ value, busy, onSave }) {
  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave({
      defaultVisitMinutes: form.get('defaultVisitMinutes'),
      qrFallbackHours: form.get('qrFallbackHours'),
      requireApprovalForCategories: form.getAll('requireApprovalForCategories'),
      photoRequired: form.get('photoRequired') === 'on',
      consentVersion: form.get('consentVersion'),
      allowWalkIns: form.get('allowWalkIns') === 'on'
    });
  }
  return (
    <form onSubmit={submit}>
      <Panel title="Visitor security policy" subtitle="Default timings, approval rules, and identity requirements.">
        <div className="office-form-grid">
          <Field label="Default visit duration (minutes)"><input name="defaultVisitMinutes" type="number" min="15" max="20160" defaultValue={value.defaultVisitMinutes} /></Field>
          <Field label="QR fallback validity (hours)" hint="Used when a visit has no expected check-out."><input name="qrFallbackHours" type="number" min="1" max="72" defaultValue={value.qrFallbackHours} /></Field>
          <Field label="Consent version"><input name="consentVersion" defaultValue={value.consentVersion} maxLength={40} /></Field>
        </div>
        <div className="office-toggle-grid">
          <label className="office-check-option"><input name="photoRequired" type="checkbox" defaultChecked={value.photoRequired} /> Require a visitor photo for registration</label>
          <label className="office-check-option"><input name="allowWalkIns" type="checkbox" defaultChecked={value.allowWalkIns} /> Allow walk-in registration</label>
        </div>
        <fieldset className="office-role-picker">
          <legend>Categories requiring approval <small>These visits cannot be checked in until an approver decides.</small></legend>
          <div className="office-role-picker-grid compact">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <label key={key} className={value.requireApprovalForCategories.includes(key) ? 'selected' : ''}>
                <input type="checkbox" name="requireApprovalForCategories" value={key} defaultChecked={value.requireApprovalForCategories.includes(key)} />
                <span><strong>{label}</strong></span>
              </label>
            ))}
          </div>
        </fieldset>
      </Panel>
      <FormActions busy={busy} label="security policy" />
    </form>
  );
}
