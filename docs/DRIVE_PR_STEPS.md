# PR steps (manual)

1. Create a branch:
   ```bash
   git checkout -b feat/drive-integration
   ```

2. Copy files into the repo:
   - `frontend/src/drive/{auth.ts, picker.ts, files.ts, state.ts}`
   - `frontend/src/components/DriveBar.tsx`
   - `frontend/.env.example` (append Google vars)
   - `docs/DRIVE.md`

3. Add the following scripts to your `frontend/index.html` inside `<head>`:
   ```html
   <!-- Google Identity Services & Picker -->
   <script src="https://accounts.google.com/gsi/client" async defer></script>
   <script src="https://apis.google.com/js/api.js" async defer></script>
   ```

4. Wire the toolbar in your app (example):
   ```tsx
   import DriveBar from './components/DriveBar';
   // ...
   <DriveBar
     getDoc={() => viewRef.current!.state.doc.toString()}
     setDoc={(t) => replaceWholeDoc(t)}
     getDocName={() => currentDocName}
   />
   ```

5. Set env vars (see `.env.example`).

6. Commit:
   ```bash
   git add .
   git commit -m "feat(drive): client-only Google Drive save/load with Ctrl+G toolbar"
   git push -u origin feat/drive-integration
   ```

7. Open a PR on GitHub.
