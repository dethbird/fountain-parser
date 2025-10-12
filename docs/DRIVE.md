# Google Drive Integration (Client-only)

This app can save/load `.fountain` files directly to your Google Drive using client-side OAuth (GIS) and the Google Picker.
No backend or server tokens are required; everything happens in the browser.

## Setup

1. Create a Google Cloud project.
2. Enable **Google Drive API** and **Google Picker API**.
3. Create an **OAuth Client ID** (Web application).
4. Add your site origin(s) to Authorized JavaScript origins.
5. Create an **API key** for Picker and restrict it to your domain.
6. In `frontend/.env` (or your env system), set:
   ```env
   VITE_GOOGLE_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
   VITE_GOOGLE_API_KEY=AIzaSy...your_api_key...
   VITE_GCP_PROJECT_NUMBER=123456789012
   ```

## Usage

- Press **Ctrl+G** to toggle the Google Drive toolbar.
- **Choose Folder…** lets you pick a Drive folder (stored locally).
- **Save** updates the current Drive file (or creates one if none).
- **Save As…** prompts for a new name and writes to the chosen folder.
- **Load…** opens the Google Picker to select a `.fountain` file and replaces the editor contents.

Scope requested: `drive.file` (least-privilege; access only to files your app created or the user selects via Picker).
