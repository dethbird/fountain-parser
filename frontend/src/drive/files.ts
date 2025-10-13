import { authedFetch } from './auth'

export async function listFountainFilesInFolder(folderId: string) {
  if (!folderId) return []
  // Query Drive for text/plain files with '.fountain' in the name inside folder
  const q = `'${folderId}' in parents and mimeType='text/plain' and name contains '.fountain' and trashed = false`
  const params = new URLSearchParams({ q, fields: 'files(id,name)', pageSize: '100' })
  const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`
  const res = await authedFetch(url)
  if (!res.ok) throw new Error(`Drive list failed: ${res.status}`)
  const data = await res.json()
  return (data.files || []).map((f: any) => ({ id: f.id, name: f.name }))
}

export async function listFilesInFolder(folderId: string) {
  if (!folderId) return []
  const q = `'${folderId}' in parents and trashed = false`
  const params = new URLSearchParams({ q, fields: 'files(id,name,mimeType,modifiedTime)', pageSize: '200' })
  const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`
  const res = await authedFetch(url)
  if (!res.ok) throw new Error(`Drive list failed: ${res.status}`)
  const data = await res.json()
  // Log the raw file objects so developers can inspect mimeType and other metadata
  try {
    console.log('Drive: files in folder', folderId, data.files)
  } catch (e) {}
  return (data.files || []).map((f: any) => ({ id: f.id, name: f.name, mimeType: f.mimeType, modifiedTime: f.modifiedTime }))
}

export async function getFileContent(fileId: string) {
  if (!fileId) throw new Error('fileId required')
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
  const res = await authedFetch(url)
  if (!res.ok) throw new Error(`Failed to fetch file content: ${res.status}`)
  return await res.text()
}

// Create a file in the given folder with the provided name and content.
export async function createFileInFolder(folderId: string, name: string, content: string) {
  if (!folderId) throw new Error('folderId required')
  const boundary = '-------fountainupload' + Date.now()
  const metadata = { name, parents: [folderId] }
  const multipartBody = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: text/plain\r\n\r\n${content}\r\n--${boundary}--`
  const url = `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime`;
  const res = await authedFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: multipartBody
  })
  if (!res.ok) throw new Error(`Failed to create file: ${res.status}`)
  return await res.json()
}

// Update an existing file's content (simple media upload). Returns metadata.
export async function updateFileContent(fileId: string, content: string) {
  if (!fileId) throw new Error('fileId required')
  const url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&fields=id,name,mimeType,modifiedTime`;
  const res = await authedFetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'text/plain' },
    body: content
  })
  // Sometimes the upload returns an empty body; fetch metadata if needed
  if (!res.ok) throw new Error(`Failed to update file content: ${res.status}`)
  try {
    return await res.json()
  } catch (e) {
    // Fallback: request file metadata
    const metaRes = await authedFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,modifiedTime`)
    if (!metaRes.ok) throw new Error(`Failed to fetch updated file metadata: ${metaRes.status}`)
    return await metaRes.json()
  }
}
