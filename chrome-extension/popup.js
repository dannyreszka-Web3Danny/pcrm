// PCRM LinkedIn Clipper — popup script

const STORAGE_KEYS = { pcrmUrl: 'pcrm_clipper_url', apiKey: 'pcrm_clipper_key' };

const $ = id => document.getElementById(id);

function setStatus(msg, type) {
  const el = $('status');
  el.textContent = msg;
  el.className = type || 'info';
}

function fillCard(data) {
  $('disp-name').textContent    = data.name     || '—';
  $('disp-title').textContent   = data.headline || '—';
  $('disp-company').textContent = data.company  || '—';

  if (data.photoUrl) {
    const img = document.createElement('img');
    img.className = 'profile-photo';
    img.src = data.photoUrl;
    img.alt = data.name || '';
    img.onerror = () => { /* keep placeholder on broken URL */ };
    $('photo-wrap').innerHTML = '';
    $('photo-wrap').appendChild(img);
  }

  $('f-name').value    = data.name     || '';
  $('f-title').value   = data.headline || '';
  $('f-company').value = data.company  || '';
  $('f-location').value = data.location || '';
  $('f-linkedin').value = data.linkedinUrl || '';
}

async function loadSettings() {
  return new Promise(resolve => {
    chrome.storage.local.get([STORAGE_KEYS.pcrmUrl, STORAGE_KEYS.apiKey], items => {
      resolve({
        pcrmUrl: items[STORAGE_KEYS.pcrmUrl] || '',
        apiKey:  items[STORAGE_KEYS.apiKey]  || '',
      });
    });
  });
}

function saveSettings(pcrmUrl, apiKey) {
  chrome.storage.local.set({
    [STORAGE_KEYS.pcrmUrl]: pcrmUrl,
    [STORAGE_KEYS.apiKey]:  apiKey,
  });
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isLinkedIn = tab && tab.url && /linkedin\.com\/in\//i.test(tab.url);

  if (!isLinkedIn) {
    $('not-linkedin').style.display = 'block';
    return;
  }

  $('profile-section').style.display = 'block';
  setStatus('Reading profile…', 'info');

  const settings = await loadSettings();
  $('f-pcrm-url').value = settings.pcrmUrl;
  $('f-api-key').value  = settings.apiKey;

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PROFILE' });
    if (response && response.success && response.data) {
      fillCard(response.data);
      setStatus('Profile loaded. Edit fields then save.', 'info');
    } else {
      setStatus('Could not read profile — try refreshing the page.', 'err');
    }
  } catch {
    setStatus('Content script not ready — refresh the LinkedIn page.', 'err');
  }

  $('btn-save').addEventListener('click', onSave);
}

async function onSave() {
  const pcrmUrl = ($('f-pcrm-url').value || '').trim().replace(/\/$/, '');
  const apiKey  = ($('f-api-key').value || '').trim();
  const name    = ($('f-name').value || '').trim();
  const company = ($('f-company').value || '').trim();

  if (!pcrmUrl) { setStatus('Enter your PCRM URL.', 'err'); return; }
  if (!apiKey)  { setStatus('Enter your PCRM API key.', 'err'); return; }
  if (!name)    { setStatus('Name is required.', 'err'); return; }

  saveSettings(pcrmUrl, apiKey);

  $('btn-save').disabled = true;
  setStatus('Saving…', 'info');

  const payload = {
    name,
    title:       ($('f-title').value    || '').trim(),
    company,
    location:    ($('f-location').value || '').trim(),
    linkedinUrl: ($('f-linkedin').value || '').trim(),
    headline:    ($('f-title').value    || '').trim(),
    photoUrl:    '',  // photoUrl not sent for privacy; extension stores locally only
  };

  try {
    const res = await fetch(`${pcrmUrl}/api/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pcrm-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      setStatus('Error: ' + (json.error || res.status), 'err');
      $('btn-save').disabled = false;
      return;
    }

    setStatus('Saved to PCRM — email lookup started', 'ok');
  } catch (err) {
    setStatus('Network error: ' + err.message, 'err');
    $('btn-save').disabled = false;
  }
}

init();
