/* LandLedger — team notifications posted through a relay endpoint
 * The relay keeps the Slack webhook secret server-side; this module stores
 * the relay URL and workspace key in this browser only, never in backups.
 */
'use strict';

const Notify = (function () {
  const CONFIG_KEY = 'landledger.slack.v1';
  const QUEUE_KEY = 'landledger.slackQueue.v1';
  const MAX_QUEUE = 40;

  const EVENTS = [
    ['lead', 'New lead'],
    ['sale', 'New sale'],
    ['payment', 'Payment received'],
    ['expense', 'Expense recorded'],
    ['reminder', 'Reminder sent'],
    ['periodClose', 'Period closed']
  ];

  function defaults() {
    return {
      enabled: false,
      endpoint: '',
      key: '',
      events: { lead: true, sale: true, payment: true, expense: false, reminder: false, periodClose: true }
    };
  }

  function readConfig() {
    try {
      const raw = JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null');
      if (!raw || typeof raw !== 'object') return defaults();
      const base = defaults();
      return {
        enabled: raw.enabled === true,
        endpoint: typeof raw.endpoint === 'string' ? raw.endpoint : '',
        key: typeof raw.key === 'string' ? raw.key : '',
        events: Object.assign({}, base.events, raw.events && typeof raw.events === 'object' ? raw.events : {})
      };
    } catch (err) {
      return defaults();
    }
  }

  function saveConfig(next) {
    try {
      const config = Object.assign(defaults(), next || {});
      config.events = Object.assign(defaults().events, next && next.events ? next.events : {});
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
      return true;
    } catch (err) {
      return false;
    }
  }

  function ready(config) {
    const cfg = config || readConfig();
    if (!cfg.enabled) return false;
    if (!/^https?:\/\//i.test(cfg.endpoint)) return false;
    return Boolean(cfg.key);
  }

  function readQueue() {
    try {
      const raw = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      return Array.isArray(raw) ? raw.filter((item) => item && typeof item.text === 'string') : [];
    } catch (err) {
      return [];
    }
  }

  function writeQueue(items) {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-MAX_QUEUE)));
    } catch (err) {
      /* A full quota must never break the save that triggered the alert. */
    }
  }

  function pending() {
    return readQueue().length;
  }

  function post(config, payload) {
    const body = { event: payload.event, text: payload.text, at: payload.at };
    if (payload.subject) body.subject = payload.subject;
    if (payload.email) body.email = payload.email;
    return fetch(config.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-workspace-key': config.key },
      body: JSON.stringify(body)
    }).then((response) => {
      return response.json().catch(() => null).then((result) => {
        if (!response.ok) {
          throw new Error(result && result.error ? result.error : 'Relay responded with ' + response.status + '.');
        }
        return result || { ok: true };
      });
    });
  }

  function orgName() {
    try {
      if (typeof data !== 'undefined' && data && data.settings && data.settings.orgName) return data.settings.orgName;
    } catch (err) {
      /* The name is cosmetic; fall back below. */
    }
    return 'LandLedger';
  }

  function orgEmail() {
    try {
      if (typeof data !== 'undefined' && data && data.settings && data.settings.email) return String(data.settings.email).trim();
    } catch (err) {
      /* The email is optional; the relay can have its own recipient. */
    }
    return '';
  }

  function label(event) {
    if (event === 'test') return 'Test message';
    const found = EVENTS.find(([value]) => value === event);
    return found ? found[1] : event;
  }

  function message(name, text) {
    const org = orgName();
    return {
      event: name,
      subject: org + ' · ' + label(name),
      text: (org + ' · ' + String(text || '')).slice(0, 3000),
      email: orgEmail(),
      at: new Date().toISOString()
    };
  }

  function event(name, text) {
    const config = readConfig();
    if (!ready(config) || !config.events[name]) return Promise.resolve('skipped');
    const payload = message(name, text);
    return post(config, payload)
      .then(() => 'sent')
      .catch(() => {
        writeQueue(readQueue().concat(payload));
        return 'queued';
      });
  }

  function flush() {
    const config = readConfig();
    if (!ready(config)) return Promise.resolve(0);
    const items = readQueue();
    if (!items.length) return Promise.resolve(0);
    writeQueue([]);
    const failed = [];
    return items.reduce((chain, item) => chain.then(() => post(config, item).catch(() => {
      failed.push(item);
    })), Promise.resolve()).then(() => {
      if (failed.length) writeQueue(readQueue().concat(failed));
      return items.length - failed.length;
    });
  }

  function test() {
    const config = readConfig();
    if (!ready(config)) return Promise.reject(new Error('Add a relay endpoint and workspace key, then enable alerts.'));
    return post(config, message('test', 'Test message from LandLedger'));
  }

  window.addEventListener('online', () => { flush(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(flush, 1200));
  else setTimeout(flush, 1200);

  return { EVENTS, defaults, readConfig, saveConfig, ready, pending, event, flush, test, label, orgName };
})();

window.Notify = Notify;
