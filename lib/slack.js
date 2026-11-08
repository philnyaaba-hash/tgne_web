export function slackInviteUrl() {
  const raw = (process.env.SLACK_INVITE_URL || '').trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}
