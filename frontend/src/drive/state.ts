export type DriveState = {
  folderId?: string;
  folderName?: string;
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
