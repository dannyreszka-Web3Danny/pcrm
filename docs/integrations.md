# Integrations

## Google (Gmail + Calendar)

```js
// Auth flow
startGoogleAuth()           // opens OAuth popup
sendViaGmail(gToken, to, subject, body)  // sends email via Gmail API
```

State: `gToken` (OAuth token), `gUser` (profile: `{email, name, picture}`)

**Internal vs External email detection:**
- Checks if recipient email matches `internalTeam[]` member
- Falls back to domain comparison with BDM's Gmail domain
- Shows `INT` or `EXT` badge on compose To field

## Claude AI

Direct browser fetch to Anthropic API:

```js
fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true"
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }]
  })
})
```

API key stored in `pcrm_v9_apikey` localStorage. Used for: AI pitch generation, sequence step content, quick compose draft, daily briefing, reply classification, smart next action.

## Mobile Layout

- `isMobile` = `window.innerWidth <= 768`
- OutreachTab: drill-down navigation (list → sequence → back)
- All inputs use `fontSize: 16` on mobile to prevent iOS zoom
- Viewport: `maximum-scale=1.0, user-scalable=no` set in meta tag
