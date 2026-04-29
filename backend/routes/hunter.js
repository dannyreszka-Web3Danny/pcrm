const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
  const { type, domain, firstName, lastName, requestId, hunterApiKey, plan } = req.body;
  if (!requestId) return res.status(400).json({ success: false, error: 'requestId is required' });
  if (!domain) return res.status(400).json({ success: false, error: 'domain is required' });
  if (!hunterApiKey) return res.status(400).json({ success: false, error: 'hunterApiKey is required' });

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

    // Default: domain-search. Free → limit=10, Pro/Enterprise → limit=100.
    const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${encodeURIComponent(hunterApiKey)}&limit=${domainLimit}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.errors && data.errors.length > 0) {
      return res.status(400).json({ success: false, error: data.errors[0].details || 'Hunter.io error' });
    }

    const hunterData = data.data || {};
    const emails = hunterData.emails || [];
    const contacts = emails.slice(0, domainLimit).map(e => ({
      firstName: e.first_name || '',
      lastName: e.last_name || '',
      email: e.value || '',
      position: e.position || '',
      confidence: e.confidence || 0,
      status: e.type || 'unverified',
    }));

    // Pattern + confidence: additive fields. Hunter returns a `pattern` string like
    // "{first}.{last}" when it has detected a deterministic format; we estimate
    // confidence as the mean of the per-email confidences observed.
    const pattern = hunterData.pattern || null;
    let patternConfidence = 0;
    if (pattern && emails.length > 0) {
      const sum = emails.reduce((s, e) => s + (typeof e.confidence === 'number' ? e.confidence : 0), 0);
      patternConfidence = Math.round(sum / emails.length);
    }

    res.json({ success: true, data: contacts, pattern, patternConfidence });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
