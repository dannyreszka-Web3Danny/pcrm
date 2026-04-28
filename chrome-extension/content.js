// PCRM LinkedIn Clipper — content script
// Extracts profile data from the active LinkedIn /in/ page and responds to popup queries.

function getText(selector, root) {
  const el = (root || document).querySelector(selector);
  return el ? el.innerText.trim() : '';
}

function extractProfile() {
  const name = getText('h1.text-heading-xlarge') ||
               getText('.pv-text-details__left-panel h1') ||
               getText('h1');

  // Headline sits directly below the name in the top card
  const headline = getText('.text-body-medium.break-words') ||
                   getText('.pv-text-details__left-panel .text-body-medium');

  // Location line
  const location = getText('.text-body-small.inline.t-black--light.break-words') ||
                   getText('.pv-text-details__left-panel span.t-black--light');

  // Current company: first experience entry title (position · company)
  let company = '';
  const expItems = document.querySelectorAll(
    '#experience ~ .pvs-list__outer-container .pvs-list__item--line-separated'
  );
  if (expItems && expItems.length > 0) {
    // The first span with t-bold inside the first experience item is the company name
    const companyEl = expItems[0].querySelector('.t-14.t-normal');
    if (companyEl) company = companyEl.innerText.split('·')[0].trim();
  }
  // Fallback: try subtitle inside the top card (shows "Title at Company")
  if (!company) {
    const subtitle = getText('.pv-text-details__left-panel .text-body-medium.break-words');
    if (subtitle && subtitle.includes(' at ')) {
      company = subtitle.split(' at ')[1].trim();
    }
  }

  // About section text
  const about = getText('#about ~ .pvs-list__outer-container .pvs-list__item .t-14 span[aria-hidden="true"]') ||
                getText('.pv-about-section .pv-about__summary-text');

  // Profile photo
  let photoUrl = '';
  const photoEl = document.querySelector('.pv-top-card-profile-picture__image--show') ||
                  document.querySelector('img.profile-photo-edit__preview') ||
                  document.querySelector('.pv-top-card__photo img') ||
                  document.querySelector('button.pv-top-card-profile-picture img');
  if (photoEl) photoUrl = photoEl.src || '';

  const linkedinUrl = window.location.href.split('?')[0].replace(/\/$/, '');

  return { name, headline, company, location, about, photoUrl, linkedinUrl };
}

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.type === 'GET_PROFILE') {
    sendResponse({ success: true, data: extractProfile() });
  }
  return true;
});
