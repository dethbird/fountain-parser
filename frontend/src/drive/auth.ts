let accessToken = '';

function waitForGoogle(): Promise<void> {
  return new Promise((res) => {
    if ((window as any).google) return res();
    const t = setInterval(() => {
      if ((window as any).google) { clearInterval(t); res(); }
    }, 50);
  });
}

export async function getAccessToken(opts?: { prompt?: '' | 'consent' }): Promise<string> {
  // If we already have a token and caller didn't ask to force consent, reuse it.
  if (accessToken && !(opts && opts.prompt === 'consent')) return accessToken;
  await waitForGoogle();
  const google = (window as any).google;
  const env = (import.meta as any).env || {};
  const client = google.accounts.oauth2.initTokenClient({
    client_id: env.VITE_GOOGLE_CLIENT_ID,
    scope: [
      // Include readonly drive scope so we can fetch file contents (alt=media)
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.metadata.readonly'
    ].join(' '),
    callback: (resp: any) => { accessToken = resp.access_token; },
  });
  return new Promise<string>((resolve, reject) => {
    client.callback = (resp: any) => {
      if (resp && resp.error) return reject(resp);
      accessToken = resp && resp.access_token ? resp.access_token : accessToken;
      resolve(accessToken);
    };
    // If caller asked to force consent, include the prompt so user reconsents to any new scopes
    const prompt = opts && opts.prompt === 'consent' ? 'consent' : '';
    try {
      client.requestAccessToken({ prompt });
    } catch (err) {
      reject(err);
    }
  });
}

export async function authedFetch(input: RequestInfo, init: RequestInit = {}, _retry = false) {
  const token = await getAccessToken();
  const res = await fetch(input, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` },
  });
  // Helpful debug for Drive permission issues: log status and a short preview
  if (!res.ok) {
    try {
      const clone = res.clone();
      const text = await clone.text().catch(() => '<could not read body>');
      console.debug('authedFetch non-OK response', { url: (input as any)?.toString?.() || input, status: res.status, bodyPreview: text.slice(0, 200) });
    } catch (e) {
      console.debug('authedFetch: failed to read non-OK response body', e);
    }
  }
  // If unauthorized, clear token and retry once
  if (res.status === 401) {
    accessToken = '';
    return authedFetch(input, init, _retry);
  }
  // If forbidden, attempt a single re-consent flow to request broader scopes and retry once.
  if (res.status === 403 && !_retry) {
    try {
      console.debug('authedFetch: 403 received, attempting re-consent and retry');
      accessToken = '';
      await getAccessToken({ prompt: 'consent' });
      return authedFetch(input, init, true);
    } catch (e) {
      console.debug('authedFetch: re-consent attempt failed', e);
      // fallthrough to return the original 403 response
    }
  }
  return res;
}
