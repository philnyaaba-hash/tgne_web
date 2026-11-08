import { NextResponse } from 'next/server';
import { answerQuestion, assistantStatus } from '../../../lib/assistant';
import { currentUser, requireSameOrigin } from '../../../lib/office-auth';
import { prisma } from '../../../lib/prisma';
import { checkRateLimit } from '../../../lib/rate-limit.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'cache-control': 'no-store' };

export async function GET() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json(
      { authenticated: false, signInUrl: '/' },
      { headers: NO_STORE }
    );
  }
  return NextResponse.json(
    {
      authenticated: true,
      user: {
        name: user.name,
        jobTitle: user.jobTitle,
        roles: user.roles.map((role) => role.name)
      },
      ...assistantStatus(user)
    },
    { headers: NO_STORE }
  );
}

export async function POST(request) {
  if (!requireSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403, headers: NO_STORE });
  }

  const user = await currentUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Sign in to the workspace to query live data.', signInUrl: '/' },
      { status: 401, headers: NO_STORE }
    );
  }

  const limit = checkRateLimit('assistant:' + user.id, { limit: 30, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many questions. Try again in ' + limit.retryAfter + ' seconds.' },
      { status: 429, headers: { ...NO_STORE, 'retry-after': String(limit.retryAfter) } }
    );
  }

  const length = Number(request.headers.get('content-length') || 0);
  if (length > 4096) {
    return NextResponse.json({ error: 'That question is too long.' }, { status: 413, headers: NO_STORE });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400, headers: NO_STORE });
  }

  const question = typeof body?.question === 'string' ? body.question.trim().slice(0, 400) : '';
  if (question.length < 2) {
    return NextResponse.json({ error: 'Ask a question about the live office data.' }, { status: 400, headers: NO_STORE });
  }

  try {
    // Pass { adapter: createLlmAdapter(...) } here when an LLM is configured.
    const result = await answerQuestion({ question, user, db: prisma });
    return NextResponse.json(result, { headers: NO_STORE });
  } catch (error) {
    console.error('Assistant query failed:', error);
    return NextResponse.json(
      { error: 'Live data is temporarily unavailable. Please try again.' },
      { status: 503, headers: NO_STORE }
    );
  }
}
