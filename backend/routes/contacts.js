const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readLeads, writeLeads } = require('../dataStore');
const { enqueue } = require('../updateQueue');

const router = express.Router();

// POST /api/contacts
// Called by the PCRM LinkedIn Clipper Chrome extension.
// Finds or creates a lead by company name, adds the contact, and
// triggers a Hunter.io email-finder in the background when possible.
router.post('/', async (req, res) => {
  const { name, title, company, linkedinUrl, photoUrl, location, headline, hunterApiKey } = req.body;

  if (!name) return res.status(400).json({ success: false, error: 'name is required' });

  const requestId = uuidv4();

  try {
    // ── 1. Find or create lead by company name ──────────────────────────────
    const result = await enqueue(requestId, 'UPSERT_CONTACT', `name=${name}`, () => {
      const leads = readLeads();
      const companyLower = (company || '').toLowerCase().trim();

      let lead = companyLower
        ? leads.find(l => (l.company || '').toLowerCase().trim() === companyLower)
        : null;

      if (!lead) {
        lead = {
          id: uuidv4(),
          createdAt: new Date().toISOString(),
          status: 'active',
          company: company || '',
          industry: '',
          notes: '',
          website: '',
          leadType: 'prospect',
          pipeline: -1,
          pipelineHistory: [],
          contacts: [],
          blocker: null,
          blockerHistory: [],
          logEntries: [],
          scores: { decisionMaker: 5, engagement: 5, industryFit: 5, companySize: 5, budget: 5, painPoint: 5 },
          totalScore: 30,
          dealValue: 0,
          dealRoom: [],
          deals: [],
          accountData: { renewalDate: '', healthScore: 'happy', upsellStatus: 'none' },
          summary: { currentStatus: '', latestUpdate: '', goal: '', generatedAt: null },
          events: [],
        };
        leads.push(lead);
      }

      // ── 2. Add or update contact on lead ───────────────────────────────────
      const contacts = lead.contacts || [];
      let contact = linkedinUrl
        ? contacts.find(c => c.linkedin && c.linkedin === linkedinUrl)
        : null;

      if (contact) {
        // Update existing contact with any new fields
        if (name)       contact.name     = name;
        if (title)      contact.title    = title;
        if (location)   contact.location = location;
        if (photoUrl)   contact.photoUrl = photoUrl;
      } else {
        contact = {
          id: 'c_' + uuidv4(),
          name:        name || '',
          title:       title || headline || '',
          email:       '',
          phone:       '',
          linkedin:    linkedinUrl || '',
          location:    location || '',
          photoUrl:    photoUrl || '',
          notes:       '',
          lastContacted: '',
          optedOut:    false,
          optOutReason: '',
          relationships: [],
          createdAt:   new Date().toISOString(),
          source:      'linkedin_clipper',
        };
        contacts.push(contact);
      }

      lead.contacts  = contacts;
      lead.updatedAt = new Date().toISOString();

      writeLeads(leads);
      return { lead, contact };
    });

    const { lead, contact } = result;

    // ── 3. Background Hunter.io email-finder (best-effort) ──────────────────
    const effectiveHunterKey = hunterApiKey || process.env.HUNTER_API_KEY;
    if (effectiveHunterKey && company) {
      const domain = lead.website
        ? lead.website.replace(/^https?:\/\//, '').split('/')[0]
        : null;
      const nameParts = name.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName  = nameParts.slice(1).join(' ') || '';

      if (domain || company) {
        const lookupDomain = domain || company.toLowerCase().replace(/\s+/g, '') + '.com';
        const params = new URLSearchParams({
          domain:     lookupDomain,
          api_key:    effectiveHunterKey,
          first_name: firstName,
          last_name:  lastName,
        });

        fetch(`https://api.hunter.io/v2/email-finder?${params}`)
          .then(r => r.json())
          .then(data => {
            const email = data.data && data.data.email;
            if (!email) return;

            const leads = readLeads();
            const leadIdx = leads.findIndex(l => l.id === lead.id);
            if (leadIdx === -1) return;
            const ctIdx = leads[leadIdx].contacts.findIndex(c => c.id === contact.id);
            if (ctIdx === -1) return;

            leads[leadIdx].contacts[ctIdx].email = email;
            leads[leadIdx].contacts[ctIdx].emailConfidence = (data.data && data.data.score) || 0;
            leads[leadIdx].updatedAt = new Date().toISOString();
            writeLeads(leads);
          })
          .catch(() => { /* silent — enrichment is best-effort */ });
      }
    }

    return res.status(201).json({
      success:   true,
      leadId:    lead.id,
      contactId: contact.id,
      isNew:     !lead.updatedAt || lead.createdAt === lead.updatedAt,
    });
  } catch (err) {
    console.error('[contacts] error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
