import { useEffect, useState } from 'react';
import { openFolderPicker, openFilePicker } from '../drive/picker';
import { createFountain, updateFountain, downloadFountain, ensureFolderByName } from '../drive/files';
import { loadDriveState, saveDriveState } from '../drive/state';

export default function DriveBar({ getDoc, setDoc, getDocName }: {
  getDoc: () => string;
  setDoc: (text: string) => void;
  getDocName: () => string;
}) {
  const [visible, setVisible] = useState(false);
  const [st, setSt] = useState(loadDriveState());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault(); setVisible(v => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function updateState(p: Partial<typeof st>) {
    const next = { ...st, ...p };
    setSt(next); saveDriveState(next);
  }

  async function chooseFolder() {
    const pick = await openFolderPicker();
    if (!pick) return;
    updateState({ folderId: pick.id, folderName: pick.name });
  }

  async function save() {
    const content = getDoc();
    if (!st.folderId) {
      const fid = await ensureFolderByName('Fountain Scripts');
      updateState({ folderId: fid, folderName: 'Fountain Scripts' });
    }
    if (st.fileId) {
      const ok = await updateFountain(st.fileId, content);
      if (!ok) alert('Save failed.');
    } else {
      const name = `${getDocName() || 'Untitled'}.fountain`;
      const { id, name: real } = await createFountain(name, content, st.folderId!);
      updateState({ fileId: id, fileName: real });
    }
  }

  async function saveAs() {
    if (!st.folderId) {
      const pick = await openFolderPicker();
      if (!pick) return;
      updateState({ folderId: pick.id, folderName: pick.name });
    }
    const name = prompt('File name', `${getDocName() || 'Untitled'}.fountain`);
    if (!name) return;
    const { id, name: real } = await createFountain(name, getDoc(), st.folderId!);
    updateState({ fileId: id, fileName: real });
  }

  async function loadFromDrive() {
    const pick = await openFilePicker();
    if (!pick) return;
    const txt = await downloadFountain(pick.id);
    setDoc(txt);
    updateState({ fileId: pick.id, fileName: pick.name });
  }

  if (!visible) return null;
  return (
    <div style={{ display: 'flex', gap: 8, padding: 8, border: '1px solid #ddd', borderRadius: 8, background: '#fafafa', marginBottom: 8 }}>
      <button onClick={chooseFolder}>Choose Folder…</button>
      <button onClick={save}>Save</button>
      <button onClick={saveAs}>Save As…</button>
      <button onClick={loadFromDrive}>Load…</button>
      <div style={{ marginLeft: 'auto', fontSize: 12, color: '#475569' }}>
        {st.folderName ? `Folder: ${st.folderName}` : 'No folder selected'} {st.fileName ? ` • File: ${st.fileName}` : ''}
      </div>
    </div>
  );
}
