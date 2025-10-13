import { saveDriveState } from './state'

// Centralized persistence entrypoint for drive state. Use this function
// everywhere instead of calling saveDriveState directly so we have a single
// place to control writes (debouncing, telemetry, guards, etc.).
export function persistDriveState(s: any) {
  try {
    // Future enhancements (debounce, batching) can go here.
    try {
      // Log what we're about to save for troubleshooting persistence issues.
      console.debug('persistDriveState: about to save', s)
    } catch (e) {}
    saveDriveState(s)
    try {
      // Read back and log the stored value to confirm the write succeeded.
      const KEY = 'fountain:driveState'
      const after = localStorage.getItem(KEY)
      console.debug('persistDriveState: saved to localStorage', { key: KEY, valuePreview: after && after.slice ? after.slice(0, 1000) : after })
    } catch (e) {}
  } catch (err) {
    console.error('persistDriveState failed', err)
  }
}
