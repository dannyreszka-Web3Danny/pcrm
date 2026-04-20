# Session History

## 2026-04-17 — OutreachTab step editor UX + lock screen fixes

- **`openStep` raw template** (`tab_outreach.js`): removed `stepDrafts` auto-load entirely; editor always shows raw `{{variables}}` template, never pre-filled with prospect data
- **`previewCts`** (`tab_outreach.js`): new variable = all enrolled non-bounced contacts (replaces `stpCts` which only showed contacts at the current step position); used by preview selector and `pc3` lookup
- **Prospect selector** (`tab_outreach.js`): gated to `stepView==="edit"` only — hidden in preview tab
- **Action buttons moved** (`tab_outreach.js`): Generate Draft / Save / Copy / Use Template row moved to sit directly under the Tone row (edit mode only) — removes need to scroll past body editor
- **EMAIL BODY | Format** (`tab_outreach.js`): Format is plain text same size/style as label, separated by `|`, hidden by default (`showFormatBar` init `false`), no button box
- **"Draft saved" banner** (`tab_outreach.js`): fires on explicit Save click only — was incorrectly firing on AI generate
- **AI generate closing strip** (`tab_outreach.js`): always strips name/company below "Best regards," regardless of whether a signature is configured
- **APP PASSWORD confirm field removed** (`comp_panels.js`): Settings only asks Current + New password — Confirm field removed
- **Lock screen `autoComplete="off"`** (`app.js`): suppresses browser password manager / biometric popup on the 24h unlock screen
- **Deal Room + doc row sizing** (`tab_other.js`, `comp_core.js`): buttons and labels increased to legible sizes (from earlier in session)
- **Commit**: `1cef8ea`

## 2026-04-12 — Briefing / Today / EOD / Banner unification
- **Architecture audit**: diagnosed that DailyBriefing had its own private `scoreL()` scoring engine separate from `computeUrgency()` — unified both to use single source of truth
- **DailyBriefing** (full rewrite, `comp_ai.js`): removed scoreL, top5, AI Plan, ⚡ Action (broken — ContactQueue removed), stats grid, pipeline coverage, ignore list, wins, UP NEXT. Now 4 sections only: (1) Yesterday's Top 3 from EOD, (2) OVERDUE reminder tasks, (3) Today's key meetings (from reminders with meeting/call/demo keywords, pulls goal from lead.nextStep + last log), (4) STARTING WITH — company + primary action from `urgencyData.exec.now`. "Let's go →" now navigates directly to Today tab (`onNavigate("execution")`). Overdue items always clickable: linked lead → opens Pipeline tab; no link → opens Log tab.
- **EOD Summary** (`comp_ai.js`): removed Pipeline Health block (value/coverage/gap), "Going Cold" section, "Highest Priority Contacts" sub-list, `topForTomorrow` variable. Kept: day stats grid, Tomorrow's Agenda (overdue carry-over + due tomorrow), Top 3 for tomorrow, AI Debrief, download report.
- **EOD AI Generate** (`comp_ai.js`): simplified prompt to generate Top 3 priority actions only (removed WHAT WENT WELL / WATCH OUT filler). Fixed broken `txt.split("\<line-continuation>")` bug (was splitting every character). Fixed Top 3 extraction to work without "TOMORROW TOP 3" header — now extracts any `^\d+\.` lines directly. Top 3 saves to `pcrm_top3_tomorrow` → feeds next morning's Briefing.
- **ReminderBanner** (`comp_core.js`): tasks now only show truly past-due (not due-within-24h). Removed blockers >3 days section (Today tab handles). Keeps: overdue tasks, scheduled emails, stale docs.
- **app.js**: passes `urgencyData={urgencyData}` to DailyBriefing so it uses the same priority queue as Today tab.
- **NowCard stage label** (`comp_features.js`): "STAGE" label changed from `#FECA57` (yellow) to `C.muted` so stage label + value read as one unit.
- **Pass sizes**: Pass 1 ~289KB / Pass 2 ~349KB (both OK)

## 2026-04-03 — Phase 0: File Split + Feature Planning
- **Architecture**: Split 5 files → 10 files with 2-pass Babel loader. Old limit: 1.7KB headroom. New: 307KB/191KB headroom per pass.
- **New files**: `comp_core.js` (ScoreBadge→DealRoom), `comp_panels.js` (CompanyPanel+LeadForm+ExportPanel+GlobalMicPanel), `comp_ai.js` (ReplyClassifier→DailyBriefing), `comp_features.js` (empty placeholder + window.__C export), `tab_leads.js`, `tab_outreach.js`, `tab_other.js`, `app.js`
- **Loader**: `index.html` now has 2-pass: Pass1 = comp_* (~192KB), Pass2 = tab_*+app (~308KB). `comp_features.js` last line sets `window.__C={all 23 components}`. Pass2 starts with inject `var ScoreBadge=window.__C.ScoreBadge,...`
- **`components.js`**: Kept on disk (archive), no longer loaded by index.html
- **Planned features** (not yet built): Step 5 (nextStep field on lead, NextStepPanel in CompanyPanel), Step 1 (ReActivationPanel — auto in ContactQueue for stuck deals, threshold by stage), Step 2 (HotLeadPanel — auto-trigger on log entry save), Step 4 (enhanced DailyBriefing prompt with BLOCKERS/TOP5/FOLLOWUP structure). All go in `comp_features.js`. Step 3 (AI Close Probability) deferred to roadmap.
- **Commit**: `74bc7e8`

## 2026-04-02 — Features: Lock Fields, EOD/EOW Reports, Copy-on-click
- **Feature 1 — Lock toggles**: Per-field `🔒`/`🔓` button in CompanyPanel summary edit mode; AI skips locked fields on generate; lock state saved to `lead.summary.lockedFields`; display mode shows lock icon + copy indicator
- **Feature 2 — EOD/EOW Reports**: `buildPCRMReport()` global added to `services.js`; EODSummary gets PDF + email buttons in footer; ExportPanel gets `📈 Reports` tab; both delegate to the shared global function
- **Feature 3 — Copy-on-click**: DealRoomTab PAIN/STATUS/BLOCKER/NOTES fields click-to-copy with `⎘`/`Copied ✓` flash; CompanyPanel display fields same
- Combined Babel input: **~498KB** (1.7KB headroom) after extracting report logic to services.js

## 2026-03-28 — Modular Refactoring
- Extracted `styles.css` (1.2KB), `constants.js` (24KB), `services.js` (5KB), `components.js` (204KB)
- Changed loader from `var code` single-string to `window.__pcrmComp + mainCode` two-part concat
- Fixed `fetch()` approach (broke on file://) → now uses `<script src>` global variable pattern
- Combined Babel input: **~468KB** (was 498KB, now 31KB under limit)

## Previous — OutreachTab Rebuild
- Rebuilt OutreachTab to match Outreach.io UI patterns (left panel sequences/compose, right panel overview/prospects/stats)
- Colour audit: all green → white except positive states; active tabs → `#FFE066`
- Right-click context menu on sequences (rename / delete)
- "Edit" button per enrolled contact → context menu (Mark bounced / Opt-out / Remove)
- stopPropagation on step editor buttons (fixes mobile accordion collapse)
- Compose tab: email type picker, tone selector, AI generate, Send / Schedule / Copy / Save template
- Internal vs External email badge on To field; Gmail send + schedule working

## Earlier Sessions
- Dynamic scoring system with recency, momentum, engagement
- Contact Today Queue (⚡ Action), Reply Classifier, Smart Next Action, Meeting Prep Card
- Daily Briefing (☀) and EOD Summary (🌙)
- Google OAuth (●G button), Backup dot (●B)
- Gmail/Calendar integration, Pomodoro timer
- NLP date parser for reminders ("remind me next Monday at 3pm")
