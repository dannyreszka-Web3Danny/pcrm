const express = require('express');
const router = express.Router();

// POST /api/enrich/apollo
// Body: { domain, apolloKey, plan }
// plan === 'pro' | 'enterprise' → /v1/mixed_people/search with email reveal.
// plan === 'free' (default)     → /v1/organizations/enrich (no email).
router.post('/apollo', async (req, res) => {
  const { domain, apolloKey, plan } = req.body;
  if (!apolloKey) return res.status(400).json({ success: false, error: 'apolloKey is required' });
  if (!domain) return res.status(400).json({ success: false, error: 'domain is required' });

  const isPaid = plan === 'pro' || plan === 'enterprise';

  try {
    if (isPaid) {
      const response = await fetch('https://api.apollo.io/v1/mixed_people/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', 'X-Api-Key': apolloKey },
        body: JSON.stringify({
          q_organization_domains: [domain],
          page: 1,
          per_page: 5,
          reveal_personal_emails: true,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({ success: false, error: data.error || 'Apollo API error' });
      }

      const person = (data.people && data.people[0]) || null;
      if (!person) return res.json({ success: false, error: 'No person found' });

      const org = person.organization || (person.employment_history && person.employment_history[0]) || {};
      return res.json({
        success: true,
        data: {
          email: person.email || null,
          name: [person.first_name, person.last_name].filter(Boolean).join(' ') || null,
          title: person.title || null,
          company: person.organization_name || org.organization_name || org.name || null,
          domain: org.primary_domain || domain,
          industry: org.industry || null,
          employees: org.estimated_num_employees || null,
          linkedin_url: person.linkedin_url || null,
          website: org.website_url || null,
        },
      });
    }

    const response = await fetch('https://api.apollo.io/v1/organizations/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', 'X-Api-Key': apolloKey },
      body: JSON.stringify({ domain }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ success: false, error: data.error || 'Apollo API error' });
    }

    const org = data.organization || null;
    if (!org) {
      return res.json({ success: false, error: 'No organization found' });
    }

    return res.json({
      success: true,
      data: {
        email: null,
        name: null,
        title: null,
        company: org.name || null,
        domain: org.primary_domain || domain,
        industry: org.industry || null,
        employees: org.estimated_num_employees || null,
        linkedin_url: org.linkedin_url || null,
        website: org.website_url || null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/enrich/hunter
// Body: { type, domain, firstName, lastName, hunterApiKey, plan }
// plan === 'pro' | 'enterprise' → bulk domain-search with limit=100.
// plan === 'free' (default)     → domain-search with limit=10.
router.post('/hunter', async (req, res) => {
  const { type, domain, firstName, lastName, hunterApiKey, plan } = req.body;
  if (!hunterApiKey) return res.status(400).json({ success: false, error: 'hunterApiKey is required' });
  if (!domain) return res.status(400).json({ success: false, error: 'domain is required' });

  const isPaid = plan === 'pro' || plan === 'enterprise';
  const domainLimit = isPaid ? 100 : 10;

  try {
    if (type === 'email-finder') {
      if (!firstName && !lastName) {
        return res.status(400).json({ success: false, error: 'firstName or lastName required for email-finder' });
      }
      const params = new URLSearchParams({ domain, api_key: hunterApiKey });
      if (firstName) params.set('first_name', firstName);
      if (lastName) params.set('last_name', lastName);
      const response = await fetch(`https://api.hunter.io/v2/email-finder?${params}`);
      const data = await response.json();

      if (data.errors && data.errors.length > 0) {
        return res.status(400).json({ success: false, error: data.errors[0].details || 'Hunter.io error' });
      }

      const d = data.data || {};
      if (!d.email) return res.json({ success: false, error: 'No email found' });

      return res.json({
        success: true,
        email: d.email,
        data: { email: d.email, status: d.status || 'unverified', confidence: d.score || 0 },
      });
    }

    const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${encodeURIComponent(hunterApiKey)}&limit=${domainLimit}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.errors && data.errors.length > 0) {
      return res.status(400).json({ success: false, error: data.errors[0].details || 'Hunter.io error' });
    }

    const contacts = (data.data?.emails || []).slice(0, domainLimit).map(e => ({
      firstName: e.first_name || '',
      lastName: e.last_name || '',
      email: e.value || '',
      position: e.position || '',
      confidence: e.confidence || 0,
      status: e.type || 'unverified',
    }));

    res.json({ success: true, data: contacts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/enrich/clay
// Body: { domain, firstName, lastName, clayKey, plan }
// plan === 'pro' | 'enterprise' → request the full enrichment waterfall.
// plan === 'free' (default)     → basic people-search.
router.post('/clay', async (req, res) => {
  const { domain, firstName, lastName, clayKey, plan } = req.body;
  if (!clayKey) return res.status(400).json({ success: false, error: 'clayKey is required' });
  if (!domain && !firstName && !lastName) return res.status(400).json({ success: false, error: 'domain or name is required' });

  const isPaid = plan === 'pro' || plan === 'enterprise';

  try {
    const payload = {};
    if (domain) payload.domain = domain;
    if (firstName) payload.first_name = firstName;
    if (lastName) payload.last_name = lastName;
    if (isPaid) {
      payload.mode = 'full';
      payload.waterfall = true;
    }

    const response = await fetch('https://api.clay.com/v1/sources/people-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + clayKey },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return res.status(response.status).json({ success: false, error: 'Clay API error' });
    }

    const data = await response.json();
    const person = (data.data && data.data[0]) || data;
    if (!person || (!person.email && !person.first_name)) {
      return res.json({ success: false, error: 'No person found' });
    }

    return res.json({
      success: true,
      data: {
        email: person.email || null,
        name: (person.first_name && person.last_name)
          ? person.first_name + ' ' + person.last_name
          : (person.first_name || person.last_name || null),
        title: person.title || null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
