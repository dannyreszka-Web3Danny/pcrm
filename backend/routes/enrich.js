const express = require('express');
const router = express.Router();

// POST /api/enrich/apollo
// Body: { domain, firstName, lastName, apolloKey }
router.post('/apollo', async (req, res) => {
  const { domain, firstName, lastName, apolloKey } = req.body;
  if (!apolloKey) return res.status(400).json({ success: false, error: 'apolloKey is required' });
  if (!domain && !firstName && !lastName) return res.status(400).json({ success: false, error: 'domain or name is required' });

  try {
    const payload = { api_key: apolloKey };
    if (firstName) payload.first_name = firstName;
    if (lastName) payload.last_name = lastName;
    if (domain) payload.organization_domains = [domain];

    const response = await fetch('https://api.apollo.io/v1/people/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ success: false, error: data.error || 'Apollo API error' });
    }

    const person = data.person;
    if (!person) {
      return res.json({ success: false, error: 'No person found' });
    }

    const org = (person.employment_history && person.employment_history[0]) || {};
    return res.json({
      success: true,
      data: {
        email: person.email || null,
        name: [person.first_name, person.last_name].filter(Boolean).join(' ') || null,
        title: person.title || null,
        company: person.organization_name || org.organization_name || null,
        linkedin_url: person.linkedin_url || null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/enrich/hunter
// Body: { type, domain, firstName, lastName, hunterApiKey }
router.post('/hunter', async (req, res) => {
  const { type, domain, firstName, lastName, hunterApiKey } = req.body;
  if (!hunterApiKey) return res.status(400).json({ success: false, error: 'hunterApiKey is required' });
  if (!domain) return res.status(400).json({ success: false, error: 'domain is required' });

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

    // domain-search
    const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${encodeURIComponent(hunterApiKey)}&limit=10`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.errors && data.errors.length > 0) {
      return res.status(400).json({ success: false, error: data.errors[0].details || 'Hunter.io error' });
    }

    const contacts = (data.data?.emails || []).slice(0, 10).map(e => ({
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
// Body: { domain, firstName, lastName, clayKey }
router.post('/clay', async (req, res) => {
  const { domain, firstName, lastName, clayKey } = req.body;
  if (!clayKey) return res.status(400).json({ success: false, error: 'clayKey is required' });
  if (!domain && !firstName && !lastName) return res.status(400).json({ success: false, error: 'domain or name is required' });

  try {
    const payload = {};
    if (domain) payload.domain = domain;
    if (firstName) payload.first_name = firstName;
    if (lastName) payload.last_name = lastName;

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
