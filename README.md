# AudioCPD — Audiology CPD Records

A professional, offline-capable web application for audiologists to log, manage, and export Continuing Professional Development (CPD) records.

## Features

- **Dashboard** with stats (total entries, hours, type breakdown)
- **CPD Entry Form** with full validation
- **localStorage** persistence — no backend needed
- **Search & Filter** across all records
- **PDF Export** — single entry or full portfolio
- **Dark mode** toggle
- **Duplicate entries** for recurring CPD
- **Tagging** system for custom categorisation
- **Mobile-responsive** design

## Files

```
cpd-app/
├── index.html    ← Main HTML structure
├── style.css     ← All styles (variables, dark mode, responsive)
├── app.js        ← All JavaScript logic
└── README.md     ← This file
```

## Running Locally

1. Download or clone these three files into a folder.
2. Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari).
3. No build step or server required — it works from the filesystem directly.

> **Tip:** If you want live-reload while editing, run:
> ```bash
> npx serve .
> ```
> or use the VS Code **Live Server** extension.

## Deploying to GitHub Pages

### Option A — via GitHub Web UI (easiest)

1. Create a new **public** GitHub repository (e.g. `audiology-cpd`).
2. Upload `index.html`, `style.css`, and `app.js` to the repo root.
3. Go to **Settings → Pages**.
4. Under *Source*, select **Deploy from a branch → main → / (root)**.
5. Click **Save**. Your site will be live at:
   ```
   https://<your-username>.github.io/<repo-name>/
   ```

### Option B — via Git CLI

```bash
git init
git add index.html style.css app.js README.md
git commit -m "Initial commit: AudioCPD app"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

Then enable Pages in the repository settings as described above.

### Option C — GitHub CLI

```bash
gh repo create audiology-cpd --public --source=. --push
# Then enable Pages via Settings → Pages
```

## Data Storage

All CPD entries are stored in the browser's `localStorage` under the key `audiocpd_entries`. Data persists across browser sessions on the same device.

To **back up** your data: open the browser DevTools Console and run:
```js
copy(localStorage.getItem('audiocpd_entries'))
```
Then paste into a `.json` file for safekeeping.

To **restore** data: paste your JSON back in the Console:
```js
localStorage.setItem('audiocpd_entries', '<paste JSON here>')
```

## PDF Export

Uses [jsPDF](https://github.com/parallax/jsPDF) loaded from CDN. Works offline once the page has been loaded once (browser caches the script).

- **Single export**: Click the download icon on any record card, or use the button in the entry modal.
- **Portfolio export**: Click *Export All PDF* in Records view or Dashboard.

## Browser Support

Chrome 90+, Firefox 88+, Edge 90+, Safari 14+. Requires JavaScript enabled.

## Customisation

- **Colours**: Edit CSS variables at the top of `style.css` under `:root`.
- **CPD types**: Add/remove `<option>` elements in the `#f-type` select in `index.html`.
- **Logo / branding**: Replace the SVG in `.logo-icon` in `index.html`.
