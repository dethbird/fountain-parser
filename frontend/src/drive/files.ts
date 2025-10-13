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
