import { authedFetch } from './auth';

export async function ensureFolderByName(name: string): Promise<string> {
  const q = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${name}' and trashed=false`);
  const r = await authedFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`);
  const data = await r.json();
  if (data.files?.length) return data.files[0].id;

  const res = await authedFetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder' }),
  });
  const created = await res.json();
  return created.id;
}

export async function createFountain(name: string, content: string, parentFolderId: string) {
  const metadata = {
    name: name.endsWith('.fountain') ? name : `${name}.fountain`,
    mimeType: 'text/plain',
    parents: [parentFolderId],
    appProperties: { kind: 'fountain', version: '1' },
  };
  const boundary = 'foo' + Math.random().toString(16).slice(2);
  const body =
    `--${boundary}
Content-Type: application/json; charset=UTF-8

` +
    JSON.stringify(metadata) + `
` +
    `--${boundary}
Content-Type: text/plain; charset=UTF-8

` +
    content + `
--${boundary}--`;

  const res = await authedFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name', {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body
  });
  return res.json(); // {id, name}
}

export async function updateFountain(fileId: string, content: string) {
  const res = await authedFetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'text/plain; charset=UTF-8' },
    body: content
  });
  return res.ok;
}

export async function downloadFountain(fileId: string): Promise<string> {
  const r = await authedFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
  return r.text();
}
