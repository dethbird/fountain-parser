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
  const params = new URLSearchParams({ q, fields: 'files(id,name,mimeType)', pageSize: '200' })
  const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`
  const res = await authedFetch(url)
  if (!res.ok) throw new Error(`Drive list failed: ${res.status}`)
  const data = await res.json()
  return (data.files || []).map((f: any) => ({ id: f.id, name: f.name, mimeType: f.mimeType }))
}
