/**
 * ╔════════════════════════════════════════════╗
 * ║  Jacaranda Garden Restaurant — script.js   ║
 * ║  WhatsApp · Google Sheets · Nav · Scroll   ║
 * ╚════════════════════════════════════════════╝
 *
 * SETUP INSTRUCTIONS:
 * 1. Deploy a Google Apps Script Web App from your Google Sheet.
 * 2. Replace GOOGLE_SCRIPT_URL below with your deployment URL.
 * 3. Replace WHATSAPP_NUMBER with the restaurant's WhatsApp number.
 */

/* ──── Configuration ──── */
const CONFIG = {
  GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
  WHATSAPP_NUMBER:   '254700000000',   // No leading + or spaces
  RESTAURANT_NAME:   'Jacaranda Garden Restaurant',
};

/* ═════════════════════════════════════
   1. WHATSAPP INTEGRATION
   ═════════════════════════════════════
   Reads form fields and builds a pre-filled
   wa.me link with a friendly reservation message.
   ═════════════════════════════════════ */

/**
 * Builds a WhatsApp deep-link with reservation details.
 * @param {Object} data - { name, phone, date, time, guests, note }
 * @returns {string} Full wa.me URL
 */
function buildWhatsAppLink(data) {
  const { name, date, time, guests, note } = data;

  // Format the date for human readability
  const formattedDate = date
    ? new Date(date + 'T00:00:00').toLocaleDateString('en-KE', {
        weekday: 'long',
        year:    'numeric',
        month:   'long',
        day:     'numeric',
      })
    : 'Date TBD';

  // Format time to 12-hour clock
  const formattedTime = time
    ? formatTo12Hr(time)
    : 'Time TBD';

  // Build the message body
  const lines = [
    `Hello ${CONFIG.RESTAURANT_NAME}! 👋`,
    ``,
    `I would like to make a reservation:`,
    ``,
    `👤 *Name:* ${name || 'Not provided'}`,
    `📅 *Date:* ${formattedDate}`,
    `🕐 *Time:* ${formattedTime}`,
    `👥 *Guests:* ${guests || 'Not specified'}`,
    note ? `📝 *Special request:* ${note}` : null,
    ``,
    `Please confirm my table. Thank you!`,
  ]
  .filter(line => line !== null)
  .join('\n');

  const encoded = encodeURIComponent(lines);
  return `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encoded}`;
}

/**
 * Converts "HH:MM" 24-hr string to "H:MM AM/PM".
 * @param {string} time24 - e.g. "14:30"
 * @returns {string} e.g. "2:30 PM"
 */
function formatTo12Hr(time24) {
  const [hourStr, minuteStr] = time24.split(':');
  let hour   = parseInt(hourStr, 10);
  const mins = minuteStr || '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${mins} ${ampm}`;
}

/**
 * Gathers form values and opens WhatsApp in a new tab.
 */
function openWhatsApp() {
  const data = getFormData();

  if (!data.name.trim()) {
    showStatus('Please enter your name before opening WhatsApp.', 'error');
    document.getElementById('guestName').focus();
    return;
  }

  const link = buildWhatsAppLink(data);
  window.open(link, '_blank', 'noopener,noreferrer');
}

/* ═════════════════════════════════════
   2. GOOGLE SHEETS SUBMISSION
   ═════════════════════════════════════
   POSTs form data to a Google Apps Script
   Web App which appends a row to a Sheet.

   Google Apps Script template (doPost):
   ────────────────────────────────────
   function doPost(e) {
     var sheet = SpreadsheetApp.getActiveSpreadsheet()
                               .getSheetByName('Reservations');
     var data  = JSON.parse(e.postData.contents);
     sheet.appendRow([
       new Date(),
       data.name,
       data.phone,
       data.date,
       data.time,
       data.guests,
       data.note,
       'Pending'
     ]);
     return ContentService
       .createTextOutput(JSON.stringify({ result: 'success' }))
       .setMimeType(ContentService.MimeType.JSON);
   }
   ────────────────────────────────────
   ═════════════════════════════════════ */

/**
 * Sends reservation data to Google Sheets via Apps Script Web App.
 * @param {Object} data - Reservation fields
 * @returns {Promise<{ok: boolean, message: string}>}
 */
async function submitToGoogleSheets(data) {
  const payload = {
    name:      data.name,
    phone:     data.phone,
    date:      data.date,
    time:      data.time,
    guests:    data.guests,
    note:      data.note,
    source:    'Website Form',
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      // Google Apps Script requires no-cors when called cross-origin
      mode:    'no-cors',
    });

    // no-cors responses are opaque — we assume success if no error thrown
    return { ok: true, message: 'Reservation submitted successfully!' };

  } catch (error) {
    console.error('[Jacaranda] Google Sheets submission error:', error);
    return { ok: false, message: 'Could not save reservation. Please try WhatsApp.' };
  }
}

/* ═════════════════════════════════════
   3. FORM HANDLING
   ═════════════════════════════════════ */

/**
 * Reads and returns all form field values.
 * @returns {Object}
 */
function getFormData() {
  return {
    name:   document.getElementById('guestName')?.value.trim()    || '',
    phone:  document.getElementById('guestPhone')?.value.trim()   || '',
    date:   document.getElementById('reserveDate')?.value         || '',
    time:   document.getElementById('reserveTime')?.value         || '',
    guests: document.getElementById('guestCount')?.value          || '',
    note:   document.getElementById('specialRequest')?.value.trim() || '',
  };
}

/**
 * Basic client-side validation.
 * @param {Object} data
 * @returns {{ valid: boolean, message: string }}
 */
function validateForm(data) {
  if (!data.name)   return { valid: false, message: 'Please enter your name.' };
  if (!data.phone)  return { valid: false, message: 'Please enter your WhatsApp number.' };
  if (!data.date)   return { valid: false, message: 'Please pick a date.' };
  if (!data.time)   return { valid: false, message: 'Please pick a time.' };
  if (!data.guests) return { valid: false, message: 'Please select number of guests.' };
  return { valid: true, message: '' };
}

/**
 * Shows a status message below the form.
 * @param {string}  message
 * @param {'success'|'error'} type
 */
function showStatus(message, type) {
  const el = document.getElementById('formStatus');
  if (!el) return;
  el.textContent = message;
  el.className   = `form-status ${type}`;
  el.classList.remove('hidden');

  // Auto-hide after 6 seconds
  setTimeout(() => el.classList.add('hidden'), 6000);
}

/**
 * Sets the submit button to a loading or default state.
 * @param {boolean} loading
 */
function setSubmitLoading(loading) {
  const btn     = document.getElementById('submitBtn');
  const text    = document.getElementById('submitText');
  const spinner = document.getElementById('submitSpinner');
  if (!btn) return;

  btn.disabled = loading;
  btn.style.opacity = loading ? '0.7' : '1';
  text.textContent  = loading ? 'Submitting…' : 'Confirm Reservation';
  spinner?.classList.toggle('hidden', !loading);
}

/**
 * Main form submit handler.
 * Validates → submits to Sheets → shows feedback → optionally opens WhatsApp.
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  const data       = getFormData();
  const validation = validateForm(data);

  if (!validation.valid) {
    showStatus(validation.message, 'error');
    return;
  }

  setSubmitLoading(true);

  const result = await submitToGoogleSheets(data);

  setSubmitLoading(false);

  if (result.ok) {
    showStatus(
      `✅ Thank you, ${data.name}! Your reservation request is saved. We'll confirm on WhatsApp shortly.`,
      'success'
    );
    e.target.reset();
  } else {
    showStatus(result.message, 'error');
  }
}

/* ═════════════════════════════════════
   4. MOBILE NAVIGATION TOGGLE
   ═════════════════════════════════════ */
function initNavigation() {
  const toggle       = document.getElementById('menuToggle');
  const mobileMenu   = document.getElementById('mobileMenu');
  const hamburger    = document.getElementById('hamburger-icon');
  const closeIcon    = document.getElementById('close-icon');
  const mobileLinks  = document.querySelectorAll('.mobile-nav-link');
  const navbar       = document.getElementById('navbar');

  if (!toggle || !mobileMenu) return;

  // Toggle open/close
  toggle.addEventListener('click', () => {
    const isOpen = !mobileMenu.classList.contains('hidden');

    mobileMenu.classList.toggle('hidden', isOpen);
    hamburger?.classList.toggle('hidden', !isOpen);
    closeIcon?.classList.toggle('hidden', isOpen);
  });

  // Close on link click
  mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.add('hidden');
      hamburger?.classList.remove('hidden');
      closeIcon?.classList.add('hidden');
    });
  });

  // Navbar scroll style
  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY > 60;
    navbar.classList.toggle('scrolled', scrolled);
  }, { passive: true });
}

/* ═════════════════════════════════════
   5. SMOOTH SCROLLING
   ═════════════════════════════════════ */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;

      const target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();

      const navbarHeight = document.getElementById('navbar')?.offsetHeight || 72;
      const top = target.getBoundingClientRect().top + window.scrollY - navbarHeight;

      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}

/* ═════════════════════════════════════
   6. SCROLL REVEAL (IntersectionObserver)
   ═════════════════════════════════════ */
function initScrollReveal() {
  const elements = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right');

  if (!('IntersectionObserver' in window)) {
    // Fallback: show all immediately
    elements.forEach(el => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  elements.forEach(el => observer.observe(el));
}

/* ═════════════════════════════════════
   7. SET MIN DATE (today) ON DATE FIELD
   ═════════════════════════════════════ */
function initDateField() {
  const dateInput = document.getElementById('reserveDate');
  if (!dateInput) return;

  const today = new Date().toISOString().split('T')[0];
  dateInput.setAttribute('min', today);
}

/* ═════════════════════════════════════
   8. INITIALISE EVERYTHING ON DOM READY
   ═════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Navigation
  initNavigation();

  // Smooth scrolling
  initSmoothScroll();

  // Reveal animations
  initScrollReveal();

  // Date field min
  initDateField();

  // Form submission (Google Sheets)
  const form = document.getElementById('reservationForm');
  form?.addEventListener('submit', handleFormSubmit);

  // WhatsApp button
  const waBtn = document.getElementById('whatsappBtn');
  waBtn?.addEventListener('click', openWhatsApp);
});
