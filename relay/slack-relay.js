#!/usr/bin/env node
/* LandLedger notification relay — the only place Slack/email/WhatsApp secrets live.
 * The browser posts {event, text} here with a workspace key; this process fans
 * the message out to the channels configured in .env. No dependencies.
 *
 * Run: node slack-relay.js
 */
'use strict';

const fs = require('fs');
const http = require('http');
const net = require('net');
const path = require('path');
const tls = require('tls');
const crypto = require('crypto');

loadEnv(path.join(__dirname, '.env'));
loadEnv(path.join(__dirname, '..', '.env'));

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 8787);
const WORKSPACE_KEY = process.env.WORKSPACE_KEY || '';
const MAX_BODY = 16 * 1024;
const MAX_TEXT = 3000;
const SMTP_TIMEOUT = 15000;

const SLACK_WEBHOOK_URL = (process.env.SLACK_WEBHOOK_URL || '').trim();
const SLACK_BOT_TOKEN = (process.env.SLACK_BOT_TOKEN || '').trim();
const SLACK_CHANNEL = (process.env.SLACK_CHANNEL || '').trim();
const SLACK_API_BASE = (process.env.SLACK_API_BASE || 'https://slack.com/api').replace(/\/+$/, '');

const SMTP_HOST = (process.env.SMTP_HOST || '').trim();
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = /^(1|true|yes|on)$/i.test(String(process.env.SMTP_SECURE || '')) || Number(process.env.SMTP_PORT) === 465;
const SMTP_USER = (process.env.SMTP_USER || '').trim();
const SMTP_PASS = process.env.SMTP_PASS || '';
const EMAIL_FROM = (process.env.EMAIL_FROM || '').trim();
const EMAIL_TO = (process.env.EMAIL_TO || '').trim();

const TWILIO_ACCOUNT_SID = (process.env.TWILIO_ACCOUNT_SID || '').trim();
const TWILIO_AUTH_TOKEN = (process.env.TWILIO_AUTH_TOKEN || '').trim();
const TWILIO_WHATSAPP_FROM = (process.env.TWILIO_WHATSAPP_FROM || '').trim();
const WHATSAPP_TO = (process.env.WHATSAPP_TO || '').trim();
const TWILIO_CONTENT_SID = (process.env.TWILIO_CONTENT_SID || '').trim();
const TWILIO_API_BASE = (process.env.TWILIO_API_BASE || 'https://api.twilio.com').replace(/\/+$/, '');

const SLACK_ENABLED = Boolean(SLACK_WEBHOOK_URL || (SLACK_BOT_TOKEN && SLACK_BOT_TOKEN !== 'xoxb-your-bot-token' && SLACK_CHANNEL));
const EMAIL_ENABLED = Boolean(SMTP_HOST && EMAIL_FROM && SMTP_PORT);
const WHATSAPP_ENABLED = Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_WHATSAPP_FROM && WHATSAPP_TO);

const EVENT_LABELS = {
  lead: 'New lead',
  sale: 'New sale',
  payment: 'Payment received',
  expense: 'Expense recorded',
  reminder: 'Reminder sent',
  periodClose: 'Period closed',
  test: 'Test message'
};

class RelayError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/* Minimal KEY=VALUE parser; real environment variables win over the file. */
function loadEnv(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (err) {
    return;
  }
  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) return;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (value.length >= 2) {
      const quote = value[0];
      if ((quote === '"' || quote === "'") && value[value.length - 1] === quote) value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  });
}

function slackMode() {
  return SLACK_WEBHOOK_URL ? 'webhook' : 'bot';
}

function label(event) {
  return EVENT_LABELS[event] || String(event || 'Notification');
}

function normalizeAddress(value) {
  const match = /<([^>]+)>/.exec(value);
  return (match ? match[1] : value).trim();
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ''));
}

function normalizePhone(value) {
  const raw = String(value || '').replace(/^whatsapp:/i, '').replace(/[^\d+]/g, '');
  if (!raw) return '';
  if (raw.startsWith('+')) return raw;
  if (raw.startsWith('00')) return '+' + raw.slice(2);
  return '+' + raw;
}

function maskPhone(value) {
  const phone = normalizePhone(value);
  if (phone.length <= 7) return phone || '(not set)';
  return phone.slice(0, 4) + '****' + phone.slice(-3);
}

/* ---------------- Slack ---------------- */
async function deliverSlack(text) {
  if (SLACK_WEBHOOK_URL) {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!response.ok) throw new RelayError(502, 'Slack webhook responded with ' + response.status + '.');
    return;
  }
  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL) throw new RelayError(500, 'Relay is missing SLACK_BOT_TOKEN or SLACK_CHANNEL.');
  const response = await fetch(SLACK_API_BASE + '/chat.postMessage', {
    method: 'POST',
    headers: {
      'content-type': 'application/json; charset=utf-8',
      authorization: 'Bearer ' + SLACK_BOT_TOKEN
    },
    body: JSON.stringify({
      channel: SLACK_CHANNEL,
      text,
      unfurl_links: false,
      unfurl_media: false
    })
  });
  let body = null;
  try {
    body = await response.json();
  } catch (err) {
    body = null;
  }
  if (!response.ok || !body || body.ok !== true) {
    const reason = body && body.error ? ' (' + body.error + ')' : '';
    throw new RelayError(502, 'Slack rejected the message' + reason + '.');
  }
}

/* ---------------- Email (SMTP, no dependencies) ---------------- */
function attachReader(socket) {
  let buffer = '';
  let replyLines = [];
  const queue = [];
  const waiting = [];
  let ended = false;
  let socketError = null;

  socket.setEncoding('utf8');
  socket.on('data', (chunk) => {
    buffer += chunk;
    let index;
    while ((index = buffer.indexOf('\n')) !== -1) {
      let line = buffer.slice(0, index);
      buffer = buffer.slice(index + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      replyLines.push(line);
      if (/^\d{3}(?: |$)/.test(line)) {
        queue.push({ code: Number(line.slice(0, 3)), lines: replyLines });
        replyLines = [];
        drain();
      }
    }
  });
  socket.on('end', () => { ended = true; drain(); });
  socket.on('close', () => { ended = true; drain(); });
  socket.on('error', (err) => { socketError = err; drain(); });

  function drain() {
    while (waiting.length) {
      if (queue.length) { waiting.shift().resolve(queue.shift()); continue; }
      if (socketError) { waiting.shift().reject(socketError); continue; }
      if (ended) { waiting.shift().reject(new Error('SMTP connection closed.')); continue; }
      break;
    }
  }

  return {
    next() {
      if (queue.length) return Promise.resolve(queue.shift());
      if (socketError) return Promise.reject(socketError);
      if (ended) return Promise.reject(new Error('SMTP connection closed.'));
      return new Promise((resolve, reject) => { waiting.push({ resolve, reject }); });
    }
  };
}

function connectSmtp() {
  return new Promise((resolve, reject) => {
    const socket = SMTP_SECURE
      ? tls.connect({ host: SMTP_HOST, port: SMTP_PORT, servername: SMTP_HOST })
      : net.connect({ host: SMTP_HOST, port: SMTP_PORT });
    const readyEvent = SMTP_SECURE ? 'secureConnect' : 'connect';
    const onError = (err) => { socket.destroy(); reject(err); };
    socket.once('error', onError);
    socket.setTimeout(SMTP_TIMEOUT, () => socket.destroy(new Error('SMTP timed out.')));
    socket.once(readyEvent, () => {
      socket.removeListener('error', onError);
      resolve(socket);
    });
  });
}

async function smtpCommand(socket, reader, line, expected) {
  socket.write(line + '\r\n');
  const reply = await reader.next();
  if (!expected.includes(reply.code)) {
    const verb = line.split(' ')[0];
    throw new RelayError(502, 'SMTP rejected ' + verb + ' (code ' + reply.code + ').');
  }
  return reply;
}

function encodeSubject(value) {
  const clean = String(value || 'Notification').replace(/[\r\n]+/g, ' ').slice(0, 150);
  const encoded = Buffer.from(clean, 'utf8').toString('base64');
  const chunks = encoded.match(/.{1,60}/g) || [''];
  return chunks.map((chunk) => '=?UTF-8?B?' + chunk + '?=').join('\r\n ');
}

function buildMessage(from, to, subject, text) {
  const body = Buffer.from(text, 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n');
  return [
    'From: ' + from,
    'To: ' + to,
    'Subject: ' + encodeSubject(subject),
    'Date: ' + new Date().toUTCString(),
    'Message-ID: <' + crypto.randomUUID() + '@landledger.local>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    body
  ].join('\r\n');
}

async function deliverEmail(to, subject, text) {
  if (!isEmail(to)) throw new RelayError(500, 'No email recipient is configured.');
  const from = EMAIL_FROM || SMTP_USER;
  const envelopeFrom = normalizeAddress(from);
  let socket = await connectSmtp();
  try {
    let reader = attachReader(socket);
    let reply = await reader.next();
    if (reply.code !== 220) throw new RelayError(502, 'SMTP server did not greet.');

    const ehlo = await smtpCommand(socket, reader, 'EHLO landledger.local', [250]);
    const offersStartTls = /STARTTLS/i.test(ehlo.lines.join('\n'));
    if (!SMTP_SECURE && offersStartTls) {
      await smtpCommand(socket, reader, 'STARTTLS', [220]);
      socket.setTimeout(0);
      const upgraded = tls.connect({ socket, servername: SMTP_HOST });
      await new Promise((resolve, reject) => {
        upgraded.once('secureConnect', resolve);
        upgraded.once('error', reject);
      });
      upgraded.setTimeout(SMTP_TIMEOUT, () => upgraded.destroy(new Error('SMTP timed out.')));
      socket = upgraded;
      reader = attachReader(socket);
      await smtpCommand(socket, reader, 'EHLO landledger.local', [250]);
    } else if (!SMTP_SECURE && SMTP_USER && !/^(127\.0\.0\.1|localhost|::1)$/i.test(SMTP_HOST)) {
      throw new RelayError(502, 'SMTP server does not offer STARTTLS; refusing to send credentials in plain text.');
    }

    if (SMTP_USER) {
      await smtpCommand(socket, reader, 'AUTH LOGIN', [334]);
      await smtpCommand(socket, reader, Buffer.from(SMTP_USER, 'utf8').toString('base64'), [334]);
      await smtpCommand(socket, reader, Buffer.from(SMTP_PASS, 'utf8').toString('base64'), [235]);
    }

    await smtpCommand(socket, reader, 'MAIL FROM:<' + envelopeFrom + '>', [250]);
    await smtpCommand(socket, reader, 'RCPT TO:<' + normalizeAddress(to) + '>', [250, 251]);
    await smtpCommand(socket, reader, 'DATA', [354]);
    socket.write(buildMessage(from, to, subject, text) + '\r\n.\r\n');
    reply = await reader.next();
    if (reply.code !== 250) throw new RelayError(502, 'SMTP rejected the message (code ' + reply.code + ').');
    try { socket.write('QUIT\r\n'); } catch (err) { /* The message is already accepted. */ }
  } finally {
    socket.destroy();
  }
}

/* ---------------- WhatsApp (Twilio) ---------------- */
async function deliverWhatsApp(text) {
  const from = 'whatsapp:' + normalizePhone(TWILIO_WHATSAPP_FROM);
  const to = 'whatsapp:' + normalizePhone(WHATSAPP_TO);
  if (to === 'whatsapp:') throw new RelayError(500, 'Relay is missing WHATSAPP_TO.');
  const url = TWILIO_API_BASE + '/2010-04-01/Accounts/' + encodeURIComponent(TWILIO_ACCOUNT_SID) + '/Messages.json';
  const auth = Buffer.from(TWILIO_ACCOUNT_SID + ':' + TWILIO_AUTH_TOKEN, 'utf8').toString('base64');
  const form = new URLSearchParams({ From: from, To: to });
  if (TWILIO_CONTENT_SID) {
    // Business-initiated WhatsApp messages need an approved template with one variable.
    form.set('ContentSid', TWILIO_CONTENT_SID);
    form.set('ContentVariables', JSON.stringify({ 1: text }));
  } else {
    form.set('Body', text);
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: 'Basic ' + auth,
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: form.toString()
  });
  let body = null;
  try {
    body = await response.json();
  } catch (err) {
    body = null;
  }
  if (!response.ok) {
    const reason = body && (body.message || body.code) ? ' (' + (body.message || body.code) + ')' : '';
    throw new RelayError(502, 'WhatsApp delivery failed' + reason + '.');
  }
  if (body && (body.status === 'failed' || body.status === 'undelivered')) {
    throw new RelayError(502, 'WhatsApp delivery ' + body.status + '.');
  }
}

/* ---------------- Fan-out ---------------- */
function subjectFor(payload) {
  const raw = payload.subject || label(payload.event);
  return String(raw).replace(/[\r\n]+/g, ' ').slice(0, 150);
}

async function fanOut(payload) {
  const text = String(payload.text || '').trim().slice(0, MAX_TEXT);
  if (!text) throw new RelayError(400, 'Message text is required.');
  const subject = subjectFor(payload);
  const jobs = [];

  if (SLACK_ENABLED) jobs.push({ name: 'slack', run: () => deliverSlack(text) });
  if (EMAIL_ENABLED) {
    const to = EMAIL_TO || String(payload.email || '').trim();
    if (isEmail(to)) jobs.push({ name: 'email', run: () => deliverEmail(to, subject, text) });
    else console.warn(new Date().toISOString() + ' email skipped: no recipient on the message or EMAIL_TO.');
  }
  if (WHATSAPP_ENABLED) jobs.push({ name: 'whatsapp', run: () => deliverWhatsApp(text) });

  if (!jobs.length) throw new RelayError(500, 'No delivery channel is configured. Fill in .env.');

  const deliveries = {};
  await Promise.all(jobs.map(async (job) => {
    try {
      await job.run();
      deliveries[job.name] = 'sent';
    } catch (err) {
      deliveries[job.name] = 'failed';
      console.error(new Date().toISOString() + ' ' + job.name + ' failed: ' + (err && err.message ? err.message : 'Unknown error'));
    }
  }));

  const failed = Object.keys(deliveries).filter((name) => deliveries[name] !== 'sent');
  return { deliveries, failed };
}

function keyMatches(given) {
  if (!WORKSPACE_KEY) return false;
  const presented = Buffer.from(String(given || ''), 'utf8');
  const expected = Buffer.from(WORKSPACE_KEY, 'utf8');
  if (presented.length !== expected.length) return false;
  return crypto.timingSafeEqual(presented, expected);
}

function corsHeaders(origin) {
  return {
    'access-control-allow-origin': origin || '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, x-workspace-key',
    'access-control-max-age': '600',
    vary: 'origin'
  };
}

function send(res, status, body, origin) {
  const payload = JSON.stringify(body);
  res.writeHead(status, Object.assign({
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store'
  }, corsHeaders(origin)));
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let tooLarge = false;
    const chunks = [];
    req.on('data', (chunk) => {
      if (tooLarge) return;
      size += chunk.length;
      if (size > MAX_BODY) {
        tooLarge = true;
        chunks.length = 0;
        reject(new RelayError(413, 'Payload too large.'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!tooLarge) resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

const server = http.createServer((req, res) => {
  const origin = req.headers.origin || '*';

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(origin));
    res.end();
    return;
  }

  const pathname = (req.url || '').split('?')[0];

  if (req.method === 'GET' && pathname === '/health') {
    send(res, 200, {
      ok: true,
      relay: 'notifications',
      channels: { slack: SLACK_ENABLED, email: EMAIL_ENABLED, whatsapp: WHATSAPP_ENABLED },
      slackMode: SLACK_ENABLED ? slackMode() : null
    }, origin);
    return;
  }

  if (req.method !== 'POST' || pathname !== '/notify') {
    send(res, 404, { ok: false, error: 'Not found.' }, origin);
    return;
  }

  readBody(req)
    .then((raw) => {
      if (!keyMatches(req.headers['x-workspace-key'])) throw new RelayError(401, 'Invalid workspace key.');
      let payload;
      try {
        payload = JSON.parse(raw || '{}');
      } catch (err) {
        throw new RelayError(400, 'Body must be JSON.');
      }
      if (!payload || typeof payload !== 'object') throw new RelayError(400, 'Body must be a JSON object.');
      const event = typeof payload.event === 'string' ? payload.event : 'message';
      return fanOut(payload).then((result) => {
        const status = result.failed.length === 0 ? 200 : (result.failed.length === Object.keys(result.deliveries).length ? 502 : 207);
        // Log the event name only — message text carries buyer names and amounts.
        console.log(new Date().toISOString() + ' ' + event + ' -> ' + JSON.stringify(result.deliveries));
        if (status === 502) {
          throw new RelayError(502, 'No channel delivered "' + event + '".');
        }
        send(res, status, { ok: true, partial: status === 207, deliveries: result.deliveries }, origin);
      });
    })
    .catch((err) => {
      const status = err instanceof RelayError ? err.status : 500;
      console.error(new Date().toISOString() + ' ' + status + ' ' + (err && err.message ? err.message : 'Unknown error'));
      if (!res.headersSent) send(res, status, { ok: false, error: err && err.message ? err.message : 'Relay error.' }, origin);
      else res.end();
    });
});

function checkConfig() {
  if (!WORKSPACE_KEY) {
    console.error('Set WORKSPACE_KEY in .env (or the environment) before starting the relay.');
    process.exit(1);
  }
  if (WORKSPACE_KEY === 'change-me-to-a-long-random-string') {
    console.warn('WARN: WORKSPACE_KEY is still the placeholder — anyone who guesses it can post.');
  }
  if (SLACK_ENABLED) {
    if (!SLACK_WEBHOOK_URL && SLACK_BOT_TOKEN === 'xoxb-your-bot-token') console.warn('WARN: SLACK_BOT_TOKEN is still the placeholder.');
    console.log('Slack: enabled (' + slackMode() + ')');
  } else {
    console.log('Slack: off — set SLACK_WEBHOOK_URL or SLACK_BOT_TOKEN + SLACK_CHANNEL in .env.');
  }
  if (EMAIL_ENABLED) {
    console.log('Email: enabled' + (EMAIL_TO ? '' : ' (recipient comes from your business email in Settings)'));
    if (!SMTP_USER) console.log('Email: no SMTP_USER set, sending without authentication');
  } else {
    console.log('Email: off — set SMTP_HOST, SMTP_PORT, EMAIL_FROM (and SMTP_USER/SMTP_PASS if required).');
  }
  if (WHATSAPP_ENABLED) {
    console.log('WhatsApp: enabled via Twilio -> ' + maskPhone(WHATSAPP_TO));
  } else {
    console.log('WhatsApp: off — set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM and WHATSAPP_TO.');
  }
  if (!SLACK_ENABLED && !EMAIL_ENABLED && !WHATSAPP_ENABLED) {
    console.warn('WARN: no alert channel is configured yet.');
  }
}

checkConfig();
server.listen(PORT, HOST, () => {
  console.log('LandLedger notification relay listening on http://' + HOST + ':' + PORT + '/notify');
});
