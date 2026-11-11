// Session constants shared by the Node handlers and the Edge middleware.
// This module must stay free of Node-only and database imports.

export const SESSION_COOKIE = 'landledger.office.session';
export const SESSION_TTL_SECONDS = 60 * 60 * 8;
export const SESSION_PURPOSE = 'office-session';

// Development-only key used when neither a database nor AUTH_SECRET exists.
// It is never accepted when NODE_ENV is production or DATABASE_URL is set.
export const DEMO_FALLBACK_SECRET = 'landledger-local-demo-secret-development-only';

export function isLocalDemoMode(env = process.env) {
  return env.NODE_ENV !== 'production' && !env.DATABASE_URL;
}

// Both the app and the middleware must derive the key the same way, otherwise
// tokens issued by one side are silently rejected by the other.
export function resolveSessionSecret(env = process.env) {
  const secret = env.AUTH_SECRET || (isLocalDemoMode(env) ? DEMO_FALLBACK_SECRET : '');
  if (new TextEncoder().encode(secret).length < 32) {
    throw new Error('AUTH_SECRET must contain at least 32 bytes.');
  }
  return new TextEncoder().encode(secret);
}
