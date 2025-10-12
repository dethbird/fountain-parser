// Picker helpers
import { getAccessToken } from './auth';

type PickerResult = { action: string; docs?: Array<{ id: string; name: string; mimeType: string }> };

function loadPicker(): Promise<void> {
  return new Promise((resolve) => {
    (window as any).gapi.load('picker', () => resolve());
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
    const picker = new googleNS.picker.PickerBuilder()
      .setAppId(import.meta.env.VITE_GCP_PROJECT_NUMBER)
      .setDeveloperKey(import.meta.env.VITE_GOOGLE_API_KEY)
      .setOAuthToken(oauthToken)
      .addView(view)
      .setTitle('Choose a Drive Folder')
      .setCallback((data: PickerResult) => {
        if (data.action === googleNS.picker.Action.PICKED && data.docs?.length) {
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
    const picker = new googleNS.picker.PickerBuilder()
      .setAppId(import.meta.env.VITE_GCP_PROJECT_NUMBER)
      .setDeveloperKey(import.meta.env.VITE_GOOGLE_API_KEY)
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
