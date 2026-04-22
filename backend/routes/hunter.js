const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
  const { type, domain, firstName, lastName, requestId, hunterApiKey } = req.body;
  if (!requestId) return res.status(400).json({ success: false, error: 'requestId is required' });
  if (!domain) return res.status(400).json({ success: false, error: 'domain is required' });
  if (!hunterApiKey) return res.status(400).json({ success: false, error: 'hunterApiKey is required' });

  try {
    if (type === 'email-finder') {
      if (!firstName && !lastName) {
        return res.status(400).json({ success: false, error: 'firstName or lastName required for email-finder' });
      }
      const params = new URLSearchParams({ domain, api_key: hunterApiKey });
      if (firstName) params.set('first_name', firstName);
      if (lastName) params.set('last_name', lastName);
      const url = `https://api.hunter.io/v2/email-finder?${params}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.errors && data.errors.length > 0) {
        return res.status(400).json({ success: false, error: data.errors[0].details || 'Hunter.io error' });
      }

      const d = data.data || {};
      if (!d.email) {
        return res.json({ success: false, error: 'No email found' });
      }

      return res.json({
        success: true,
        data: {
          email: d.email,
          status: d.status || 'unverified',
          confidence: d.score || 0,
        },
      });
    }

    // Default: domain-search
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

module.exports = router;
