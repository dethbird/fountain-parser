import React, { useEffect, useState } from 'react';
import { openFolderPicker } from '../drive/picker';
import { loadDriveState, saveDriveState } from '../drive/state';

export default function DriveBar({ getDoc, setDoc, getDocName }: {
  getDoc?: () => string;
  setDoc?: (text: string) => void;
  getDocName?: () => string | null;
}) {
  const [visible, setVisible] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [driveState, setDriveState] = useState(() => loadDriveState());

  useEffect(() => {
    // detect touch devices
    const touch = ('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
    setIsTouch(!!touch);

    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setVisible(v => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
  const next = { ...driveState, folderId: pick.id, folderName: pick.name, folder: pick };
  setDriveState(next);
  saveDriveState(next);
  console.log('DriveBar: saved fountain:driveState =', localStorage.getItem('fountain:driveState'));
    } catch (err) {
      console.error('Folder pick failed', err);
      alert('Could not open folder picker. Check console for details.');
    }
  }
  function save() { alert('Save — not implemented yet'); }
  function saveAs() { alert('Save As — not implemented yet'); }
  function loadFromDrive() { alert('Load — not implemented yet'); }

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
          <button className="toolbar-btn" onClick={chooseFolder}><i className="fas fa-folder-open" aria-hidden="true"></i> Choose Folder</button>
          <button className="toolbar-btn" onClick={save}><i className="fas fa-save" aria-hidden="true"></i> Save</button>
          <button className="toolbar-btn" onClick={saveAs}><i className="fas fa-file-export" aria-hidden="true"></i> Save As</button>
          <button className="toolbar-btn" onClick={loadFromDrive}><i className="fas fa-download" aria-hidden="true"></i> Load</button>
          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#475569' }}>
            {driveState.folderName ? `Folder: ${driveState.folderName}` : 'No folder selected'}
          </div>
        </div>
      )}
    </>
  );
}
