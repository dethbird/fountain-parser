let accessToken = '';

function waitForGoogle(): Promise<void> {
  return new Promise((res) => {
    if ((window as any).google) return res();
    const t = setInterval(() => {
      if ((window as any).google) { clearInterval(t); res(); }
    }, 50);
  });
}

export async function getAccessToken(): Promise<string> {
  if (accessToken) return accessToken;
  await waitForGoogle();
  const google = (window as any).google;
  const client = google.accounts.oauth2.initTokenClient({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    scope: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.metadata.readonly'
    ].join(' '),
    callback: (resp: any) => { accessToken = resp.access_token; },
  });
  return new Promise<string>((resolve, reject) => {
    client.callback = (resp: any) => {
      if (resp.error) reject(resp);
      else { accessToken = resp.access_token; resolve(accessToken); }
    };
    client.requestAccessToken({ prompt: '' });
  });
}

export async function authedFetch(input: RequestInfo, init: RequestInit = {}) {
  const token = await getAccessToken();
  const res = await fetch(input, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    accessToken = '';
    return authedFetch(input, init);
  }
  return res;
}
