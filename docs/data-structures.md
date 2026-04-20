# Data Structures

## Lead Object

```js
{
  id: "lead_...",
  company: "Acme Corp",
  industry: "SaaS",
  notes: "",
  website: "",
  createdAt: "ISO",
  leadType: "prospect",  // "prospect"|"partner"|"internal" — PLACEHOLDER, default "prospect"
  pipeline: 0,           // index into PIPE array, or PIPE_NONE (-1)
  pipelineHistory: [{ stage, timestamp }],
  contacts: [
    {
      id: "c_...",
      name: "Sarah Chen",
      title: "VP Sales",
      email: "sarah@acme.com",
      phone: "",
      linkedin: "",
      notes: "",
      lastContacted: "",
      optedOut: false,
      optOutReason: "",
      relationships: []  // PLACEHOLDER — [{ contactId, leadId, type, notes }] type: "reports_to"|"influences"|"blocks"|"collaborates"
    }
  ],
  blocker: null,           // or { text, createdAt }
  blockerHistory: [],
  logEntries: [
    {
      id: "log_...",
      timestamp: "ISO",
      category: "email",   // "email"|"call"|"note"|"meeting_notes"|...
      categoryLabel: "Email",
      content: "..."
    }
  ],
  scores: {
    decisionMaker: 5,    // 1-10
    engagement: 5,
    industryFit: 5,
    companySize: 5,
    budget: 5,
    painPoint: 5
  },
  totalScore: 50,
  dealValue: 0,
  dealRoom: [],
  deals: [],  // PLACEHOLDER — [{ id, name, stage, contacts: [], notes }] for multi-deal support
  accountData: {
    renewalDate: "",
    healthScore: "happy",
    upsellStatus: "none",
  },
  summary: { currentStatus: "", latestUpdate: "", goal: "", generatedAt: null }
}
```

## Pipeline Stages

```js
const PIPE = [
  { label: "Signal",    code: "SIG", clr: "#48DBFB" },
  { label: "Echo",      code: "ECH", clr: "#0BE881" },
  { label: "Locked",    code: "LCK", clr: "#FFE066" },
  { label: "Proposal",  code: "PRO", clr: "#FF9F43" },
  { label: "Closed",    code: "CLO", clr: "#888888" },
];
const PIPE_NONE = -1;
```
