import React, { useEffect, useState } from 'react';
import { openFolderPicker } from '../drive/picker';
import { loadDriveState, saveDriveState, clearDriveState } from '../drive/state';

export default function DriveBar({ getDoc, setDoc, getDocName, open, gdriveOn }: {
  getDoc?: () => string;
  setDoc?: (text: string) => void;
  getDocName?: () => string | null;
  open?: boolean;
  gdriveOn?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [driveState, setDriveState] = useState(() => loadDriveState());

  // If a folder was persisted previously, show the DriveBar so the user can
  // see and clear the selection without needing the keyboard shortcut.
  useEffect(() => {
    if (driveState && driveState.folderName) setVisible(true);
  }, [driveState && driveState.folderName]);

  useEffect(() => {
    // detect touch devices
    const touch = ('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
    setIsTouch(!!touch);
  }, []);

  // If parent provides `open`, reflect it in local visibility so the parent
  // can control DriveBar visibility (e.g., when toggling modes via Ctrl+G).
  useEffect(() => {
    if (typeof open === 'boolean') setVisible(open);
  }, [open]);

  // Listen for folderSelected events dispatched by the picker so DriveBar
  // can persist the selection. This decouples the picker implementation
  // from DriveBar and works across contexts.
  useEffect(() => {
    const onFolderSelected = (e: Event) => {
      try {
        // @ts-ignore - event detail typed as any
        const detail = (e as CustomEvent).detail as any;
        if (detail && detail.id) {
          const next = { ...loadDriveState(), folderId: detail.id, folderName: detail.name, folder: detail };
          setDriveState(next);
          saveDriveState(next);
          console.log('DriveBar: persisted folder from event', next);
        }
      } catch (err) {
        console.error('DriveBar: error handling folderSelected event', err);
      }
    };
    window.addEventListener('fountain:drive:folderSelected', onFolderSelected as EventListener);
    return () => window.removeEventListener('fountain:drive:folderSelected', onFolderSelected as EventListener);
  }, []);

  // Basic button handlers (placeholders for later integration)
  async function chooseFolder() {
    try {
  const pick = await openFolderPicker();
  if (!pick) return;
  // Do not directly persist here. The picker dispatches a
  // 'fountain:drive:folderSelected' event which DriveBar listens to and
  // persists centrally. We still update local state immediately for UX.
  const next = { ...driveState, folderId: pick.id, folderName: pick.name, folder: pick };
  setDriveState(next);
    } catch (err) {
      console.error('Folder pick failed', err);
      alert('Could not open folder picker. Check console for details.');
    }
  }
  function save() { alert('Save — not implemented yet'); }
  function saveAs() { alert('Save As — not implemented yet'); }
  function loadFromDrive() { alert('Load — not implemented yet'); }

  // Helper boolean: whether a folder is currently selected/persisted
  const hasFolder = !!(driveState && (driveState.folderId || driveState.folderName));

  // Floating touch button to open the Drive bar on mobile
  const fab = (
    <button
      onClick={() => setVisible(v => !v)}
      aria-label="Open Drive toolbar"
      style={{
        position: 'fixed',
        right: 12,
        bottom: 12,
        zIndex: 1200,
        borderRadius: 9999,
        width: 48,
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#2563eb',
        color: 'white',
        border: 'none',
        boxShadow: '0 6px 12px rgba(0,0,0,0.12)',
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }}>⇪</span>
    </button>
  );

  if (!visible && !isTouch) return null;

  return (
    <>
      {isTouch ? fab : null}
      {visible && (
        <div style={{ display: 'flex', gap: 8, padding: 8, border: '1px solid #ddd', borderRadius: 8, background: '#fafafa', marginBottom: 8, alignItems: 'center' }}>
          {/* Left: primary actions depend on mode */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="toolbar-btn" onClick={chooseFolder}><i className="fas fa-folder-open" aria-hidden="true"></i> Choose Folder</button>
            {!gdriveOn ? (
              /* Local mode */
              <>
                <button
                  className="toolbar-btn"
                  onClick={save}
                  disabled={!hasFolder}
                  aria-disabled={!hasFolder}
                  style={!hasFolder ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                ><i className="fas fa-save" aria-hidden="true"></i> Save</button>
                <button
                  className="toolbar-btn"
                  onClick={saveAs}
                  disabled={!hasFolder}
                  aria-disabled={!hasFolder}
                  style={!hasFolder ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                ><i className="fas fa-file-export" aria-hidden="true"></i> Save As</button>
                <button className="toolbar-btn" onClick={() => alert('Copy — not implemented yet')}><i className="fas fa-copy" aria-hidden="true"></i> Copy</button>
                <button className="toolbar-btn" onClick={() => alert('Paste — not implemented yet')}><i className="fas fa-paste" aria-hidden="true"></i> Paste</button>
              </>
            ) : (
              /* GDrive mode */
              <>
                <button className="toolbar-btn" onClick={() => alert('GDrive: Save — not implemented yet')} disabled={!hasFolder} aria-disabled={!hasFolder} style={!hasFolder ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}><i className="fab fa-google-drive" aria-hidden="true"></i> GDrive Save</button>
                <button className="toolbar-btn" onClick={() => alert('GDrive: Save As — not implemented yet')} disabled={!hasFolder} aria-disabled={!hasFolder} style={!hasFolder ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}><i className="fas fa-file-export" aria-hidden="true"></i> GDrive Save As</button>
                <button className="toolbar-btn" onClick={() => alert('GDrive: Load — not implemented yet')} disabled={!hasFolder} aria-disabled={!hasFolder} style={!hasFolder ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}><i className="fas fa-download" aria-hidden="true"></i> GDrive Load</button>
                
              </>
            )}
          </div>

          {/* Right: shared actions and folder info */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="toolbar-btn" onClick={() => { if (setDoc) setDoc(''); }} title="Clear editor contents"><i className="fas fa-trash" aria-hidden="true"></i> Clear Editor</button>
            <div style={{ fontSize: 12, color: '#475569' }}>
              {driveState.folderName ? (
                <span>
                  <strong>Folder:</strong> {driveState.folderName} {' '}
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      // Clear persisted drive state and local UI state
                      try {
                        clearDriveState();
                        const next = { ...driveState, folderId: undefined, folderName: undefined, folder: undefined };
                        setDriveState(next);
                        // Notify other components that drive selection was cleared
                        window.dispatchEvent(new CustomEvent('fountain:drive:cleared'));
                        console.log('DriveBar: cleared drive state');
                      } catch (err) {
                        console.error('DriveBar: failed to clear drive state', err);
                      }
                    }}
                    style={{ marginLeft: 8, color: '#6b7280', textDecoration: 'underline', cursor: 'pointer', fontSize: 12 }}
                  >
                    Clear
                  </a>
                </span>
              ) : 'No folder selected'}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
