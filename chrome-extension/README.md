# PCRM LinkedIn Clipper

Chrome extension that saves LinkedIn profile data to PCRM with one click.

## Install (Developer Mode)

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `chrome-extension` folder from this repository
5. The extension icon will appear in your toolbar

## Usage

1. Navigate to any LinkedIn profile: `https://www.linkedin.com/in/someone`
2. Click the PCRM Clipper icon in the toolbar
3. The popup shows the extracted name, title, and company
4. Enter your **PCRM URL** (e.g. `http://localhost:3000`) and **API Key** — these are saved for future clips
5. Edit any fields if needed, then click **Save to PCRM**
6. The contact is added to the matching lead (matched by company name) or a new lead is created
7. Hunter.io email lookup starts automatically in the background

## Requirements

- PCRM backend must be running and reachable from your browser
- You need your PCRM API key (the `PCRM_API_SECRET` value from the backend `.env`)

## How it works

| File | Role |
|------|------|
| `manifest.json` | Chrome Manifest v3 — declares permissions and content script |
| `content.js` | Runs on `linkedin.com/in/*` — scrapes name, headline, company, location, photo, URL |
| `popup.html` | Extension popup UI |
| `popup.js` | Sends message to content script, saves settings, POSTs to `/api/contacts` |

The backend endpoint `POST /api/contacts` (in `backend/routes/contacts.js`):
- Finds an existing lead by company name (case-insensitive) or creates a new one at Stage −1 (Unstarted)
- Adds or updates the contact on that lead
- Triggers a Hunter.io email-finder in the background if `HUNTER_API_KEY` is set in the backend `.env`, or if a `hunterApiKey` is passed in the request body
