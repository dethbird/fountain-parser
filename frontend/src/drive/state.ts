export type DriveState = {
  folderId?: string;
  folderName?: string;
  // The selected folder object from Google Picker (may include id, name, url, etc.)
  folder?: Record<string, unknown>;
  fileId?: string;
  fileName?: string;
};

const KEY = 'fountain:driveState';

export function loadDriveState(): DriveState {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}
export function saveDriveState(s: DriveState) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

// Remove the saved drive state from localStorage.
export function clearDriveState() {
  localStorage.removeItem(KEY);
}
