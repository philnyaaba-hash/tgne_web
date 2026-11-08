import { SignJWT, jwtVerify } from 'jose';

function qrKey() {
  const secret = process.env.AUTH_SECRET || '';
  if (new TextEncoder().encode(secret).length < 32) throw new Error('AUTH_SECRET must contain at least 32 bytes.');
  return new TextEncoder().encode(secret);
}

export async function createVisitorQrToken(visit) {
  const now = new Date();
  const expiry = visit.expectedCheckout || new Date(now.getTime() + 8 * 60 * 60 * 1000);
  if (expiry <= now) throw new Error('Visitor access period has expired.');
  return new SignJWT({ purpose: 'visitor-access', version: visit.qrVersion })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(visit.id)
    .setAudience('landledger-visitor-access')
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiry.getTime() / 1000))
    .sign(qrKey());
}

export async function verifyVisitorQrToken(token) {
  const { payload } = await jwtVerify(token, qrKey(), {
    algorithms: ['HS256'],
    audience: 'landledger-visitor-access'
  });
  if (payload.purpose !== 'visitor-access' || typeof payload.sub !== 'string' || typeof payload.version !== 'number') {
    throw new Error('Invalid visitor access credential.');
  }
  return { visitId: payload.sub, version: payload.version };
}
