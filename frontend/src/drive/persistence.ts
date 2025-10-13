import { saveDriveState } from './state'

// Centralized persistence entrypoint for drive state. Use this function
// everywhere instead of calling saveDriveState directly so we have a single
// place to control writes (debouncing, telemetry, guards, etc.).
export function persistDriveState(s: any) {
  try {
    // Future enhancements (debounce, batching) can go here.
    try {
      // Debug logging removed: persistDriveState about to save
    } catch (e) {}
    saveDriveState(s)
    try {
      // Debug logging removed: persistDriveState saved to localStorage
    } catch (e) {}
  } catch (err) {
    console.error('persistDriveState failed', err)
  }
}
