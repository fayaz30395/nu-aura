import {NextRequest, NextResponse} from 'next/server';

/**
 * DEV-ONLY proxy that forwards dev-login to the backend and rebinds the
 * Set-Cookie headers under the frontend origin (localhost:3000). Without
 * this proxy, the backend's httpOnly access_token cookie is scoped to
 * :8080 and Next.js middleware on :3000 can't see it.
 *
 * Do NOT ship this to production. It is guarded by NODE_ENV and the
 * backend endpoint itself only exists under Spring's `dev` profile.
 */
const BACKEND = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1$/, '') || 'http://localhost:8080';

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({error: 'dev-login disabled in production'}, {status: 404});
  }

  try {
    const body = await request.text();

    const primer = await fetch(`${BACKEND}/api/v1/auth/me`, {method: 'GET', cache: 'no-store'});
    const rawSetCookie = primer.headers.get('set-cookie') || '';
    const xsrfMatch = rawSetCookie.match(/XSRF-TOKEN=([^;]+)/);
    const xsrf = xsrfMatch ? xsrfMatch[1] : '';

    const resp = await fetch(`${BACKEND}/api/v1/auth/dev-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': xsrf,
        Cookie: `XSRF-TOKEN=${xsrf}`,
      },
      body,
      cache: 'no-store',
    });

    const respBody = await resp.text();
    const out = new NextResponse(respBody, {
      status: resp.status,
      headers: {'Content-Type': resp.headers.get('Content-Type') ?? 'application/json'},
    });

    const joined = resp.headers.get('set-cookie') || '';
    if (joined) {
      const cookies = joined.split(/,(?=\s*[A-Za-z0-9_-]+=)/);
      for (const c of cookies) out.headers.append('Set-Cookie', c.trim());
    }
    return out;
  } catch (err) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    return NextResponse.json({error: 'proxy failure', detail: msg}, {status: 500});
  }
}
