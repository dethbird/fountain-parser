import { getAccessToken } from './auth';

type PickerResult = { action: string; docs?: Array<{ id: string; name: string; mimeType: string }> };

function waitForGapi(timeout = 3000): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).gapi) return resolve();
    const start = Date.now();
    const t = setInterval(() => {
      if ((window as any).gapi) { clearInterval(t); return resolve(); }
      if (Date.now() - start > timeout) { clearInterval(t); return reject(new Error('gapi did not load')); }
    }, 50);
  });
}

function loadPicker(): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      await waitForGapi();
    } catch (err) {
      return reject(new Error('Google API library (gapi) not loaded. Ensure https://apis.google.com/js/api.js is included.'));
    }
    try {
      (window as any).gapi.load('picker', () => {
        // additional guard: ensure google.picker namespace exists
        if (!(window as any).google || !(window as any).google.picker) {
          return reject(new Error('Google Picker API not available on window.google.picker. Make sure the Picker API is enabled in Google Cloud Console.'));
        }
        resolve();
      });
    } catch (e) {
      reject(e);
    }
  });
}

export async function openFolderPicker(): Promise<{ id: string; name?: string } | null> {
  await loadPicker();
  const oauthToken = await getAccessToken();
  const googleNS = (window as any).google;

  const view = new googleNS.picker.DocsView()
    .setIncludeFolders(true)
    .setSelectFolderEnabled(true)
    .setMimeTypes('application/vnd.google-apps.folder');

  return new Promise((resolve) => {
    const env = (import.meta as any).env || {};
    const picker = new googleNS.picker.PickerBuilder()
      .setAppId(env.VITE_GCP_PROJECT_NUMBER)
      .setDeveloperKey(env.VITE_GOOGLE_API_KEY)
      .setOAuthToken(oauthToken)
      .addView(view)
      .setTitle('Choose a Drive Folder')
      .setCallback((data: PickerResult) => {
        if (data.action === googleNS.picker.Action.PICKED && data.docs?.length) {
          // Log the selected folder for debugging/visibility
          console.log('Google Picker selected folder:', data.docs[0]);
          try {
            const save = { folder: data.docs[0], folderId: data.docs[0].id, folderName: data.docs[0].name };
            localStorage.setItem('fountain:driveState', JSON.stringify(save));
            console.log('Picker: saved fountain:driveState =', localStorage.getItem('fountain:driveState'));
          } catch (e) {
            console.warn('Picker: could not write to localStorage', e);
          }
          resolve({ id: data.docs[0].id, name: data.docs[0].name });
        } else resolve(null);
      })
      .build();
    picker.setVisible(true);
  });
}

export async function openFilePicker(): Promise<{ id: string; name: string } | null> {
  await loadPicker();
  const oauthToken = await getAccessToken();
  const googleNS = (window as any).google;

  const view = new googleNS.picker.DocsView(googleNS.picker.ViewId.DOCS)
    .setIncludeFolders(false)
    .setSelectFolderEnabled(false)
    .setMimeTypes('text/plain');

  return new Promise((resolve) => {
    const env = (import.meta as any).env || {};
    const picker = new googleNS.picker.PickerBuilder()
      .setAppId(env.VITE_GCP_PROJECT_NUMBER)
      .setDeveloperKey(env.VITE_GOOGLE_API_KEY)
      .setOAuthToken(oauthToken)
      .addView(view)
      .setTitle('Open Fountain file')
      .setCallback((data: PickerResult) => {
        if (data.action === googleNS.picker.Action.PICKED && data.docs?.length) {
          const d = data.docs[0];
          resolve({ id: d.id, name: d.name });
        } else resolve(null);
      })
      .build();
    picker.setVisible(true);
  });
}
