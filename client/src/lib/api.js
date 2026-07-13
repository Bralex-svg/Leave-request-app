const BASE = '/api';

async function attemptFetch(path, options) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    ...options
  });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;
  return { res, isJson, data };
}

// GET requests are always safe to retry. Writes (POST/PATCH) only retry when the
// caller explicitly opts in (e.g. login, where retrying has no harmful side effect) —
// this avoids ever silently double-submitting things like a leave request or approval.
async function request(path, options = {}, { retryOnce = false } = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const safeToRetry = retryOnce || method === 'GET';

  let outcome;
  try {
    outcome = await attemptFetch(path, options);
  } catch {
    if (!safeToRetry) throw new Error('Could not reach the server. Check your connection and try again.');
    try {
      outcome = await new Promise((resolve) => setTimeout(resolve, 350)).then(() => attemptFetch(path, options));
    } catch {
      throw new Error('Could not reach the server. Check your connection and try again.');
    }
  }

  // A non-JSON 5xx means the dev proxy (or an in-between hop) failed before our API
  // ever saw the request — most commonly the backend mid-restart from a hot reload —
  // rather than a real application error, which always comes back as JSON from us.
  if (!outcome.res.ok && !outcome.isJson && outcome.res.status >= 500 && safeToRetry) {
    const retried = await new Promise((resolve) => setTimeout(resolve, 350))
      .then(() => attemptFetch(path, options))
      .catch(() => null);
    if (retried) outcome = retried;
  }

  const { res, data } = outcome;
  if (!res.ok) {
    const err = new Error(data?.error || `The server returned an unexpected error (${res.status}).`);
    if (data && typeof data === 'object') Object.assign(err, data);
    throw err;
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body, opts) => request(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }, opts),
  patch: (path, body, opts) => request(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }, opts)
};
