# OutreachTab — Detailed Architecture

The most complex component. Structure:

```
OutreachTab
├── Left panel (200px)
│   ├── [Sequences | Compose] tabs → #FFE066 active
│   └── Sequences mode: sequence list (right-click → rename/delete)
│       Compose mode: lead selector + template shortcuts
│
└── Right panel
    ├── Sequences active:
    │   ├── Sequence header (name + meta pills)
    │   ├── [Overview | Prospects | Stats] inner tabs → #FFE066 active
    │   ├── Overview: vertical step timeline with delay badges
    │   │   └── Click step → accordion expands (stopPropagation on all buttons inside)
    │   ├── Prospects: enrolled contacts with dot progress
    │   │   ├── "Edit" button → right-click/long-press context menu
    │   │   │   └── Mark bounced / Opt-out / Remove from sequence
    │   │   └── Send now / Schedule per step
    │   └── Stats: per-step sent counts
    │
    └── Compose active:
        ├── Left: To / Subject / Body / Send / Schedule / Copy / Save template
        └── Right: Lead selector / Email type / Tone / AI Generate / Templates
```

## Sequences Data Structure

```js
// localStorage: pcrm_v9_sequences
{
  aiInstructions: "...",
  sequences: [
    {
      id: "seq_...",
      name: "Tier 1 — SaaS",
      steps: [
        {
          id: "s_...",
          name: "Cold Intro",
          channel: "email",    // "email" | "linkedin" | "call" | "sms"
          dayOffset: 0,        // days from sequence start
          subject: "{{company}} — a thought",
          body: "Hi {{first_name}}...",
          enabled: true
        }
      ],
      leadProgress: {
        "lead_id": {
          currentStep: 0,          // index into steps[]
          history: [{ stepIdx, sentAt, to }],
          sentCount: 0,
          replyCount: 0,
          bounced: false,
          optedOut: false,
          nextUnlockAt: null,      // ISO string when next step unlocks
          addedAt: "..."
        }
      }
    }
  ]
}
```

## Template Variables

```
{{first_name}}        — contact first name
{{company}}           — lead company
{{my_name}}           — BDM name (from ICP settings)
{{industry}}          — lead industry
{{value_proposition}} — from ICP pain points
{{market_insight}}    — placeholder
```

## Step Flow Logic

1. Add lead to sequence → `currentStep: 0`, no `nextUnlockAt`
2. Send step N → logs to history, sets `nextUnlockAt` based on step N+1 `dayOffset - step N dayOffset` (min 1 day)
3. After `nextUnlockAt` passes → step shows as "Ready"
4. Reminder added to ⚡ Action queue when step unlocks
5. Bounced / opted-out leads skip send UI
