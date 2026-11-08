'use client';

import { useEffect } from 'react';

export const CATEGORY_LABELS = {
  BUSINESS: 'Business visitor',
  CLIENT: 'Client / customer',
  CONTRACTOR: 'Contractor',
  SUPPLIER: 'Supplier',
  JOB_APPLICANT: 'Job applicant',
  GOVERNMENT: 'Government official',
  DELIVERY: 'Delivery personnel',
  INTERVIEW: 'Interview candidate',
  GUEST: 'Guest',
  OTHER: 'Other'
};

export const STATUS_LABELS = {
  EXPECTED: 'Expected',
  AWAITING_APPROVAL: 'Awaiting approval',
  CHECKED_IN: 'Checked in',
  CHECKED_OUT: 'Checked out',
  OVERDUE: 'Overdue',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
  DENIED: 'Denied'
};

export const REPORT_STATUS_LABELS = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected'
};

export const TASK_STATUS_LABELS = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected'
};

export async function api(path, options) {
  const response = await fetch(path, options);
  const contentType = response.headers.get('content-type') || '';
  const result = contentType.includes('json') ? await response.json().catch(() => ({})) : {};
  if (!response.ok) {
    const error = new Error(result.error || 'The request could not be completed.');
    error.status = response.status;
    throw error;
  }
  return result;
}

export function jsonBody(value) {
  return { headers: { 'content-type': 'application/json' }, body: JSON.stringify(value) };
}

export function parseDateValue(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(value + 'T12:00:00')
    : new Date(value);
}

export function formatDate(value, options) {
  if (!value) return '—';
  return parseDateValue(value).toLocaleDateString([], options || { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export function toLocalInput(value) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function money(value, currency = 'GHS') {
  return new Intl.NumberFormat([], { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value || 0));
}

export function initials(name) {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function csvCell(value) {
  let text = String(value == null ? '' : value);
  if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

export function downloadCsv(fileName, headers, rows) {
  const text = '\uFEFF' + [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function downloadApiFile(path, fallbackName) {
  const response = await fetch(path);
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || 'The export could not be generated.');
  }
  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="([^"]+)"/);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = match?.[1] || fallbackName;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function readImageFile(file, maxDimension = 720) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('Choose an image first.'));
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return reject(new Error('Choose a JPEG, PNG, or WebP image.'));
    if (file.size > 8 * 1024 * 1024) return reject(new Error('The image must be smaller than 8 MB.'));
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('The selected image could not be read.'));
    };
    image.src = url;
  });
}

export function readFileBase64(file, maxBytes = 4 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('Choose a file first.'));
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
      return reject(new Error('Choose a PDF, JPEG, PNG, or WebP file.'));
    }
    if (file.size > maxBytes) return reject(new Error('The file must be ' + Math.round(maxBytes / 1024 / 1024) + ' MB or smaller.'));
    const reader = new FileReader();
    reader.onload = () => resolve({ fileName: file.name, mimeType: file.type, data: String(reader.result).split(',')[1] });
    reader.onerror = () => reject(new Error('The selected file could not be read.'));
    reader.readAsDataURL(file);
  });
}

export function Icon({ name, size = 18 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.6" /><rect x="14" y="3" width="7" height="7" rx="1.6" /><rect x="3" y="14" width="7" height="7" rx="1.6" /><rect x="14" y="14" width="7" height="7" rx="1.6" /></>,
    badge: <><rect x="4" y="3" width="16" height="18" rx="3" /><circle cx="12" cy="9" r="2.4" /><path d="M8.5 16.2c.6-1.6 1.9-2.4 3.5-2.4s2.9.8 3.5 2.4" /></>,
    scan: <><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" /><path d="M4 12h16" /></>,
    users: <><circle cx="9" cy="8" r="3.2" /><path d="M3.2 20a5.8 5.8 0 0 1 11.6 0M16 5.2a3 3 0 0 1 0 5.6M17.4 14.4A5 5 0 0 1 21 19.2" /></>,
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" /></>,
    shield: <><path d="M12 3 5 6v5.3c0 4.2 2.8 7.6 7 9.7 4.2-2.1 7-5.5 7-9.7V6l-7-3Z" /><path d="M9.3 11.8 11.4 14l3.6-4" /></>,
    money: <><rect x="3" y="6" width="18" height="12" rx="2.4" /><circle cx="12" cy="12" r="2.6" /><path d="M6.5 9.5h.01M17.5 14.5h.01" /></>,
    map: <><path d="m3 6.5 5.5-2 7 2 5.5-2v13l-5.5 2-7-2-5.5 2v-13Z" /><path d="M8.5 4.5v13M15.5 6.5v13" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.9a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.14.37.4.68.73.88" /></>,
    report: <><path d="M6 3h9l4 4v14H6V3Z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>,
    audit: <><path d="M4 4h16v16H4z" /><path d="m8 9 1.5 1.5L12 8M8 15h8M14.5 10.5H17" /></>,
    building: <><path d="M4 21V4h10v17M14 9h6v12M7.5 8h3M7.5 12h3M7.5 16h3M17 13h.01M17 17h.01" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 4.5 4.5" /></>,
    print: <><path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="7" y="14" width="10" height="7" rx="1" /></>,
    download: <><path d="M12 3v12M7.5 10.5 12 15l4.5-4.5M4 20h16" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    check: <path d="m5 12.5 4.5 4.5L19 7" />,
    camera: <><path d="M4 8h3l1.5-2h7L17 8h3v11H4V8Z" /><circle cx="12" cy="13" r="3.2" /></>,
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    logout: <><path d="M10 4H5v16h5M15 8l4 4-4 4M9 12h10" /></>,
    bell: <><path d="M18 9a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
    edit: <><path d="M4 20h4l11-11-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></>,
    user: <><circle cx="12" cy="8" r="3.6" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6.3 8.5A7 7 0 0 1 19 12M18 15.5A7 7 0 0 1 5 12" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    upload: <><path d="M12 16V4M7.5 8.5 12 4l4.5 4.5M4 20h16" /></>,
    alert: <><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 9v5M12 17h.01" /></>
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.grid}</svg>;
}

export function StatusBadge({ value, label }) {
  const key = String(value || '').toLowerCase().replaceAll('_', '-');
  const fallback = String(value || '').replaceAll('_', ' ').toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
  return <span className={'office-status ' + key}>{label || STATUS_LABELS[value] || fallback}</span>;
}

export function Avatar({ src, name, size = 38 }) {
  return src
    ? <img className="office-avatar" src={src} alt="" width={size} height={size} style={{ width: size, height: size }} />
    : <span className="office-avatar placeholder" style={{ width: size, height: size }}>{initials(name)}</span>;
}

export function Modal({ title, eyebrow, description, onClose, children, className = '', wide = false }) {
  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose?.();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="office-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>
      <section className={'office-modal ' + (wide ? 'office-modal-wide ' : '') + className} role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <div>
            {eyebrow ? <p className="office-eyebrow">{eyebrow}</p> : null}
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button type="button" aria-label="Close" onClick={onClose}><Icon name="close" size={16} /></button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function Field({ label, hint, full, children }) {
  return (
    <label className={full ? 'office-field-full' : ''}>
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

export function Empty({ children, colSpan = 8 }) {
  return <tr><td className="office-empty" colSpan={colSpan}>{children}</td></tr>;
}

export function Panel({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={'office-panel ' + className}>
      {title ? <div className="office-panel-heading"><div><h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div>{action}</div> : null}
      {children}
    </section>
  );
}

export function PageHeading({ eyebrow, title, description, actions }) {
  return (
    <div className="office-page-heading">
      <div>
        {eyebrow ? <p className="office-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="office-heading-actions">{actions}</div> : null}
    </div>
  );
}

export function Stat({ label, value, hint, tone, icon }) {
  return (
    <article className={'office-stat-card ' + (tone || '')}>
      <div className="office-stat-top"><span>{label}</span>{icon ? <span className="office-stat-icon"><Icon name={icon} size={15} /></span> : null}</div>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </article>
  );
}

export function Bars({ data, labelKey = 'date', valueKey = 'count', empty = 'No activity in this period.' }) {
  const max = Math.max(1, ...data.map((item) => Number(item[valueKey]) || 0));
  return data.length ? (
    <div className="office-bars">
      {data.map((item) => (
        <div className="office-bar-row" key={item[labelKey]}>
          <span className="office-bar-label">{item[labelKey]}</span>
          <span className="office-bar-track"><i style={{ width: Math.max(3, (Number(item[valueKey]) / max) * 100) + '%' }} /></span>
          <strong>{item[valueKey]}</strong>
        </div>
      ))}
    </div>
  ) : <p className="office-muted">{empty}</p>;
}
