import { Resend } from 'resend';
import { prisma } from './prisma';
import { getSettings } from './settings';
import { escapeHtml, isEmail, VISIT_CATEGORY_LABELS } from './validation';

let client;

function emailClient() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export function appUrl() {
  return (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export async function deliverEmail({ to, subject, html, text, template, entityType, entityId, actorId, headers }) {
  const recipient = String(to || '').trim();
  if (!isEmail(recipient)) {
    return { skipped: true, reason: 'A valid recipient email address is required.' };
  }
  const resend = emailClient();
  const from = process.env.EMAIL_FROM;
  if (!resend || !from) {
    try {
      await prisma.notification.create({
        data: {
          channel: 'EMAIL',
          status: 'SKIPPED',
          recipient,
          subject,
          template,
          entityType,
          entityId,
          actorId,
          error: 'RESEND_API_KEY or EMAIL_FROM is not configured.'
        }
      });
    } catch {}
    return { skipped: true, reason: 'Email delivery is not configured.' };
  }
  try {
    const result = await resend.emails.send({
      from,
      to: recipient,
      subject,
      html,
      text,
      replyTo: process.env.EMAIL_REPLY_TO || undefined,
      ...(headers && Object.keys(headers).length ? { headers } : {})
    });
    if (result.error) throw new Error(result.error.message || 'Resend rejected the message.');
    await prisma.notification.create({
      data: {
        channel: 'EMAIL',
        status: 'SENT',
        recipient,
        subject,
        template,
        entityType,
        entityId,
        actorId
      }
    });
    return { sent: true, id: result.data?.id };
  } catch (error) {
    try {
      await prisma.notification.create({
        data: {
          channel: 'EMAIL',
          status: 'FAILED',
          recipient,
          subject,
          template,
          entityType,
          entityId,
          actorId,
          error: String(error.message || error).slice(0, 500)
        }
      });
    } catch {}
    return { sent: false, error: error.message || 'Email delivery failed.' };
  }
}

function brand(settings) {
  return settings.organization;
}

function wrap(org, title, bodyLines, footer) {
  const color = org.brandColor || '#125b38';
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f3f6f3;font-family:Segoe UI,Arial,sans-serif;color:#1a2920">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6f3;padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #e1e9e3;border-radius:16px;overflow:hidden">
        <tr><td style="background:${color};padding:20px 26px;color:#fff">
          <div style="font-size:11px;letter-spacing:.14em;font-weight:700">${escapeHtml(org.name)}</div>
          <div style="margin-top:8px;font-size:23px;font-weight:700;letter-spacing:-.02em">${escapeHtml(title)}</div>
        </td></tr>
        <tr><td style="padding:24px 26px;font-size:14px;line-height:1.65;color:#36483d">
          ${bodyLines.map((line) => `<p style="margin:0 0 12px">${line}</p>`).join('')}
          <div style="margin-top:22px;padding-top:16px;border-top:1px solid #e7ede9;color:#7b8980;font-size:11px;line-height:1.6">${footer || 'This message was sent automatically by the office management system.'}</div>
        </td></tr>
      </table>
      <p style="max-width:560px;margin:14px auto 0;color:#8a968e;font-size:10px">${escapeHtml(org.legalName || org.name)}${org.address ? ' · ' + escapeHtml(org.address) : ''}${org.phone ? ' · ' + escapeHtml(org.phone) : ''}</p>
    </td></tr>
  </table>
</body></html>`;
}

function visitDetails(visit) {
  const lines = [
    `<strong>${escapeHtml(visit.visitor.fullName)}</strong>${visit.visitor.organization ? ' · ' + escapeHtml(visit.visitor.organization) : ''}`,
    `Reference: <strong>${escapeHtml(visit.visitCode)}</strong>`,
    `Category: ${escapeHtml(VISIT_CATEGORY_LABELS[visit.category] || visit.category)}`,
    `Purpose: ${escapeHtml(visit.purpose)}`,
    visit.host ? `Host: ${escapeHtml(visit.host.name)}` : '',
    visit.department ? `Department: ${escapeHtml(visit.department.name)}` : '',
    visit.expectedArrival ? `Expected arrival: <strong>${new Date(visit.expectedArrival).toLocaleString()}</strong>` : '',
    visit.expectedCheckout ? `Expected departure: ${new Date(visit.expectedCheckout).toLocaleString()}` : ''
  ];
  return lines.filter(Boolean);
}

async function sendPair({ settings, to, subject, title, lines, template, visit, actorId }) {
  const org = brand(settings);
  if (!settings.notifications.emailEnabled || !to) return { skipped: true };
  return deliverEmail({
    to,
    subject,
    html: wrap(org, title, lines, settings.card.footerText),
    text: lines.map((line) => line.replace(/<[^>]+>/g, '')).join('\n'),
    template,
    entityType: 'Visit',
    entityId: visit.id,
    actorId
  });
}

export async function notifyVisitorEvent(event, visit, actorId) {
  let settings;
  try {
    settings = await getSettings();
  } catch {
    return { skipped: true };
  }
  const rules = settings.notifications;
  if (!rules.emailEnabled) return { skipped: true };
  const org = brand(settings);
  const details = visitDetails(visit);
  const results = [];
  const portal = appUrl() + '/dashboard#/office-visitors';

  if (event === 'registered') {
    if (rules.notifyHostOnRegister && visit.host?.email) {
      results.push(await sendPair({
        settings,
        to: visit.host.email,
        subject: `Visitor registered: ${visit.visitor.fullName}`,
        title: 'A visitor is expected',
        lines: [
          `Hello ${escapeHtml(visit.host.name)}, a visitor has been registered to see you${visit.expectedArrival ? ' on ' + new Date(visit.expectedArrival).toLocaleString() : ''}.`,
          ...details,
          `Open the office portal to review the appointment: <a href="${portal}" style="color:${org.brandColor}">${portal}</a>`
        ],
        template: 'visitor.registered.host',
        visit,
        actorId
      }));
    }
    if (rules.notifyVisitorOnRegister && visit.visitor.email) {
      results.push(await sendPair({
        settings,
        to: visit.visitor.email,
        subject: `Appointment confirmation · ${visit.visitCode}`,
        title: 'Your visit is registered',
        lines: [
          `Hello ${escapeHtml(visit.visitor.fullName)}, your visit to ${escapeHtml(org.name)} has been registered.`,
          ...details,
          'Please bring a valid form of identification and quote your reference at reception. Report to reception on arrival.'
        ],
        template: 'visitor.registered.visitor',
        visit,
        actorId
      }));
    }
  }

  if (event === 'awaiting_approval') {
    const to = rules.opsEmail || rules.fallbackRecipient;
    if (rules.notifyOpsOnApprovalRequired && to) {
      results.push(await sendPair({
        settings,
        to,
        subject: `Approval required: ${visit.visitor.fullName}`,
        title: 'Visitor visit needs approval',
        lines: [...details, 'Sign in to approve or deny this visit.'],
        template: 'visitor.awaiting_approval',
        visit,
        actorId
      }));
    }
  }

  if (event === 'approved' || event === 'denied') {
    if (rules.notifyVisitorOnDecision) {
      if (visit.visitor.email) {
        results.push(await sendPair({
          settings,
          to: visit.visitor.email,
          subject: `Visit ${event === 'approved' ? 'approved' : 'not approved'} · ${visit.visitCode}`,
          title: event === 'approved' ? 'Your visit was approved' : 'Your visit was not approved',
          lines: [
            `Hello ${escapeHtml(visit.visitor.fullName)},`,
            event === 'approved'
              ? 'Your visit has been approved. Please report to reception with valid identification.'
              : 'We are unable to approve this visit. Please contact your host or reception for more information.',
            ...details
          ],
          template: 'visitor.decision.visitor',
          visit,
          actorId
        }));
      }
    }
    if (visit.host?.email) {
      results.push(await sendPair({
        settings,
        to: visit.host.email,
        subject: `Visitor ${event}: ${visit.visitor.fullName}`,
        title: event === 'approved' ? 'Visit approved' : 'Visit denied',
        lines: [...details],
        template: 'visitor.decision.host',
        visit,
        actorId
      }));
    }
  }

  if (event === 'checked_in' && rules.notifyHostOnCheckIn && visit.host?.email) {
    results.push(await sendPair({
      settings,
      to: visit.host.email,
      subject: `Your visitor has arrived: ${visit.visitor.fullName}`,
      title: 'Your visitor has arrived',
      lines: [
        `Hello ${escapeHtml(visit.host.name)}, ${escapeHtml(visit.visitor.fullName)} has checked in at reception.`,
        ...details,
        visit.meetingRoom ? `Meeting room: ${escapeHtml(visit.meetingRoom.name)}` : ''
      ],
      template: 'visitor.checked_in.host',
      visit,
      actorId
    }));
  }

  if (event === 'checked_out' && rules.notifyVisitorOnCheckOut && visit.visitor.email) {
    results.push(await sendPair({
      settings,
      to: visit.visitor.email,
      subject: `Visit complete · ${visit.visitCode}`,
      title: 'Thank you for visiting',
      lines: [
        `Hello ${escapeHtml(visit.visitor.fullName)}, your visit to ${escapeHtml(org.name)} has been checked out${visit.checkedOutAt ? ' at ' + new Date(visit.checkedOutAt).toLocaleString() : ''}.`,
        visit.cardReturned === false ? 'Our records show that the temporary visitor card was not returned. Please contact reception.' : 'Thank you for returning your temporary visitor card.'
      ],
      template: 'visitor.checked_out.visitor',
      visit,
      actorId
    }));
  }

  return { results };
}

export async function sendTestEmail(to, actorId) {
  const settings = await getSettings();
  const org = brand(settings);
  return deliverEmail({
    to,
    subject: `Notification test · ${org.name}`,
    html: wrap(org, 'Email notifications are working', [
      'This is a test message from the office management system.',
      `Sent to <strong>${escapeHtml(to)}</strong> at ${new Date().toLocaleString()}.`,
      'Visitor registration, approval, arrival, and check-out alerts will use this channel when enabled.'
    ], settings.card.footerText),
    text: 'This is a test message from the office management system.',
    template: 'system.test',
    entityType: 'System',
    entityId: null,
    actorId
  });
}

export async function sendSlackInviteEmail({ to, name, inviteUrl, actorId, userId }) {
  const settings = await getSettings();
  const org = brand(settings);
  return deliverEmail({
    to,
    subject: `Your invitation to ${org.name} on Slack`,
    html: wrap(org, 'Join the team on Slack', [
      `Hello ${escapeHtml(name)}, you have been invited to join <strong>${escapeHtml(org.name)}</strong> on Slack for internal team communication.`,
      `Use the private link below to create your account: <a href="${escapeHtml(inviteUrl)}" style="color:${org.brandColor};font-weight:600">Create your Slack account</a>`,
      'If you already have a Slack account for this workspace, sign in with it instead. If you were not expecting this invitation, you can ignore this email.'
    ], settings.card.footerText),
    text: `Hello ${name}, join ${org.name} on Slack: ${inviteUrl}`,
    template: 'staff.slack_invite',
    entityType: 'User',
    entityId: userId,
    actorId
  });
}

export async function hostWasNotified(visitId) {
  await prisma.visit.updateMany({ where: { id: visitId, hostNotifiedAt: null }, data: { hostNotifiedAt: new Date() } });
}
