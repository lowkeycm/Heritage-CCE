// Heritage repair estimate app (the QR code app at estimate.heritagecce.com).
// Steps: about you, vehicle (VIN scan or typed, looked up with NHTSA), damage areas, photos,
// timing and insurance, review. Progress is saved through the estimate edge function in the
// Heritage Collision lead database, so a customer can start on a computer, scan a QR code and
// finish on a phone. Submitting creates a lead: company vehicle = commercial, personal = retail.
(() => {
  'use strict';
  const API = 'https://zxzzmrkyctbgxlgjritv.supabase.co/functions/v1/estimate';
  const STORE = 'heritage-estimate-token';
  const ZXING = '/vendor/zxing/zxing-library-0.23.0.min.js';
  const PHONE = '(610) 707-8600';
  const STEPS = [['you', 'About you'], ['vehicle', 'Vehicle'], ['damage', 'Damage'], ['photos', 'Photos'], ['finish', 'Timing and insurance'], ['review', 'Review']];
  const AREAS = {
    front: 'Front', 'driver-front': 'Driver side front', 'driver-rear': 'Driver side rear', rear: 'Rear',
    'passenger-rear': 'Passenger side rear', 'passenger-front': 'Passenger side front', roof: 'Roof', undercarriage: 'Undercarriage',
  };
  // Walk-around order: start at the driver front corner and go around the vehicle.
  const CORNERS = [
    { slot: 'corner-driver-front', title: 'Driver side front', tip: 'Stand about 6 feet from the corner. Get the bumper, headlight and front wheel.', spot: [12, 18] },
    { slot: 'corner-driver-rear', title: 'Driver side rear', tip: 'Include the rear wheel, taillight and bumper.', spot: [12, 242] },
    { slot: 'corner-passenger-rear', title: 'Passenger side rear', tip: 'Get the side and the back of the vehicle.', spot: [128, 242] },
    { slot: 'corner-passenger-front', title: 'Passenger side front', tip: 'Get the side and the front of the vehicle.', spot: [128, 18] },
  ];
  const DAMAGE = [
    { slot: 'damage-closeup', title: 'Close-up, straight on', tip: 'Face the damage and fill the frame with it.' },
    { slot: 'damage-angle', title: 'Close-up, at an angle', tip: 'Step to one side so the light shows dents and creases.' },
    { slot: 'damage-context', title: 'From about 5 feet away', tip: 'Show the damage and the panels around it.' },
  ];
  const EXTRA_SLOTS = [1, 2, 3, 4, 5, 6].map((n) => `extra-${n}`);
  const REQUIRED = [...CORNERS, ...DAMAGE].map((p) => p.slot);
  const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

  const state = {
    token: null, step: 'intro', form: {}, photos: {}, errors: {}, notice: null,
    resumable: false, handoff: false, handoffInfo: null, reference: null, submitting: false,
    vinNote: null, vinSuggestion: null, desktop: matchMedia('(hover: hover) and (pointer: fine)').matches,
  };
  const $ = (id) => document.getElementById(id);

  // Builds DOM nodes; customer text never becomes markup.
  function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = !!v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat(Infinity)) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
    return el;
  }
  const store = {
    get: () => { try { return localStorage.getItem(STORE); } catch { return null; } },
    set: (t) => { try { t ? localStorage.setItem(STORE, t) : localStorage.removeItem(STORE); } catch {} },
  };

  // ---------- server ----------
  async function api(action, body = {}) {
    const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, token: state.token, ...body }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || 'Something went wrong. Please try again.'), data);
    return data;
  }
  async function ensureSession() {
    if (state.token) return;
    const data = await api('start', { form: state.form, company_website: $('hp-field')?.value || '' });
    state.token = data.token;
    store.set(data.token);
  }
  let saveTimer = 0;
  function saveSoon(delay = 1000) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, delay);
  }
  // Saves go out one at a time so a slow earlier save cannot land after a newer one.
  let saving = Promise.resolve();
  function saveNow() {
    clearTimeout(saveTimer);
    // While the QR code is showing, the phone owns the estimate; this screen's copy is stale.
    if (!state.token || state.handoff) return saving;
    // The intro and done screens are not places to resume; the server keeps the last real step.
    const step = STEPS.some(([s]) => s === state.step) ? state.step : undefined;
    saving = saving.then(async () => {
      try {
        const data = await api('save', { step, form: state.form });
        if (data.submitted) finished(data.reference);
      } catch (e) {
        if (e.gone) reset('This estimate is no longer available. Please start again.');
      }
    });
    return saving;
  }

  // ---------- navigation ----------
  function go(step) {
    if (state.handoff) return closeHandoff(step);
    state.step = step;
    state.errors = {};
    state.notice = null;
    if (STEPS.some(([s]) => s === step)) saveNow();
    render();
    window.scrollTo(0, 0);
    $('main').focus({ preventScroll: true });
  }
  const stepIndex = () => STEPS.findIndex(([s]) => s === state.step);
  function next() {
    if (state.handoff) {
      const here = state.step;
      return closeHandoff().then(() => { if (state.step === here) next(); });
    }
    const problems = validate(state.step);
    state.errors = problems;
    if (Object.keys(problems).length) {
      render();
      document.querySelector('.error-text')?.closest('.card, label, div')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    go(STEPS[stepIndex() + 1][0]);
  }
  function back() {
    const i = stepIndex();
    go(i > 0 ? STEPS[i - 1][0] : 'intro');
  }
  function reset(message) {
    state.token = null; store.set(null);
    Object.assign(state, { step: 'intro', form: {}, photos: {}, errors: {}, resumable: false, handoff: false, reference: null, vinNote: null, vinSuggestion: null });
    state.notice = message || null;
    stopPolling();
    render();
  }
  function finished(reference) {
    state.reference = reference;
    state.handoff = false;
    stopPolling();
    store.set(null);
    go('done');
  }

  // ---------- validation ----------
  function validate(step) {
    const f = state.form;
    const e = {};
    if (step === 'you') {
      if (!f.name?.trim()) e.name = 'Enter your name.';
      if (!f.ownership) e.ownership = 'Choose one.';
      if (f.ownership === 'company' && !f.company?.trim()) e.company = 'Enter the company or fleet name.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email?.trim() || '')) e.email = 'Enter a valid email address.';
      if ((f.phone || '').replace(/\D/g, '').length < 10) e.phone = 'Enter a 10-digit phone number.';
      if (!f.contact) e.contact = 'Choose one.';
    }
    if (step === 'vehicle') {
      if (!f.vin_skipped && !VIN_PATTERN.test(f.vin || '')) e.vin = f.vin ? 'A VIN has 17 letters and numbers. Check it, or tap "I don\'t have the VIN".' : 'Enter or scan the VIN, or tap "I don\'t have the VIN".';
      if (!/^\d{4}$/.test(f.year || '')) e.year = 'Enter the 4-digit year.';
      if (!f.make?.trim()) e.make = 'Enter the make.';
      if (!f.model?.trim()) e.model = 'Enter the model.';
    }
    if (step === 'damage' && !(f.areas || []).length) e.areas = 'Tap at least one area where the damage is.';
    if (step === 'photos') {
      const busy = Object.values(state.photos).some((p) => p.status === 'busy');
      const missing = REQUIRED.filter((s) => state.photos[s]?.status !== 'done');
      if (busy) e.photos = 'Wait for your photos to finish uploading.';
      else if (missing.length) e.photos = `Add the ${missing.length === 1 ? 'last required photo' : `${missing.length} required photos`} marked with a star.`;
    }
    if (step === 'finish' && !f.insurance) e.insurance = 'Choose one.';
    return e;
  }

  // ---------- small pieces ----------
  const err = (key) => state.errors[key] ? h('p', { class: 'error-text', role: 'alert' }, state.errors[key]) : null;
  function field(key, label, attrs = {}, hint) {
    return h('label', { class: 'field' },
      h('span', {}, label),
      h('input', { type: 'text', name: key, value: state.form[key] || '', oninput: (ev) => { state.form[key] = ev.target.value; saveSoon(); }, ...attrs }),
      hint ? h('p', { class: 'hint' }, hint) : null,
      err(key));
  }
  function choices(key, options, cls = '') {
    return h('div', { class: `choices ${cls}`, role: 'group' }, options.map(([value, label, sub]) =>
      h('button', {
        type: 'button', class: 'choice', 'aria-pressed': String(state.form[key] === value), 'data-key': `${key}:${value}`,
        onclick: () => { state.form[key] = value; delete state.errors[key]; saveSoon(); render(`${key}:${value}`); },
      }, label, sub ? h('small', {}, sub) : null)));
  }
  function carSvg(areasOn = [], spot) {
    const ns = 'http://www.w3.org/2000/svg';
    const s = (tag, attrs) => { const el = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); return el; };
    const svg = s('svg', { viewBox: spot ? '0 0 140 260' : '10 0 120 250', 'aria-hidden': 'true' });
    const g = s('g', { transform: 'translate(10 10)' });
    const part = (key, d) => g.append(s('path', { d, class: `car-part${areasOn.includes(key) ? ' on' : ''}` }));
    for (const [x, y] of [[12, 40], [100, 40], [12, 172], [100, 172]]) g.append(s('rect', { x, y, width: 8, height: 30, rx: 3, fill: '#3b4658' }));
    part('front', 'M20 62 L20 42 Q20 8 60 8 Q100 8 100 42 L100 62 Z');
    part('driver-front', 'M20 62 H34 V122 H20 Z');
    part('driver-rear', 'M20 122 H34 V184 H20 Z');
    part('passenger-front', 'M86 62 H100 V122 H86 Z');
    part('passenger-rear', 'M86 122 H100 V184 H86 Z');
    part('rear', 'M20 184 H100 V204 Q100 232 60 232 Q20 232 20 204 Z');
    part('roof', 'M34 62 H86 V184 H34 Z');
    g.append(s('path', { d: 'M38 66 H82 L77 84 H43 Z', fill: '#9fb0c6' }));
    g.append(s('path', { d: 'M43 166 H77 L82 180 H38 Z', fill: '#9fb0c6' }));
    if (spot) {
      const [cx, cy] = spot;
      g.append(s('line', { x1: cx - 10, y1: cy - 10, x2: cx < 60 ? cx + 8 : cx - 28, y2: cy < 120 ? cy + 16 : cy - 16, stroke: '#e67451', 'stroke-width': 3, 'stroke-linecap': 'round' }));
      g.append(s('circle', { cx: cx - 10, cy: cy - 10, r: 9, fill: '#e67451', stroke: '#fff', 'stroke-width': 3 }));
    }
    svg.append(g);
    return svg;
  }

  // ---------- screens ----------
  function screenIntro() {
    const first = state.form.name?.trim().split(/\s+/)[0];
    return [
      state.notice ? h('p', { class: 'note warn', role: 'status' }, state.notice) : null,
      state.resumable ? h('section', { class: 'card' },
        h('h2', {}, `Welcome back${first ? `, ${first}` : ''}.`),
        h('p', { class: 'lede' }, 'Your estimate is saved. Pick up where you left off.'),
        h('div', { class: 'vin-actions' },
          h('button', { type: 'button', class: 'button', onclick: () => { state.resumable = false; go(STEPS.some(([s]) => s === state.savedStep) ? state.savedStep : 'you'); } }, 'Continue my estimate'),
          h('button', { type: 'button', class: 'button ghost', onclick: () => { if (confirm('Start over? What you entered will be cleared.')) reset(); } }, 'Start over'))) : null,
      h('section', { class: 'card' },
        h('p', { class: 'eyebrow' }, 'Heritage Collision'),
        h('h1', {}, 'Start your repair estimate'),
        h('p', { class: 'lede' }, 'Tell us about the vehicle and show us the damage. It takes about 5 minutes with the vehicle in front of you.'),
        h('ol', { class: 'intro-list' },
          h('li', {}, h('b', {}, '1'), h('span', {}, 'Your contact details')),
          h('li', {}, h('b', {}, '2'), h('span', {}, 'The VIN. You can scan the barcode on the driver door jamb.')),
          h('li', {}, h('b', {}, '3'), h('span', {}, 'Photos of the four corners and the damage'))),
        h('div', { class: 'hp', 'aria-hidden': 'true' }, h('label', {}, 'Leave this empty', h('input', { id: 'hp-field', tabindex: '-1', autocomplete: 'off' }))),
        state.resumable ? null : h('button', { type: 'button', class: 'button block', style: 'margin-top:20px', onclick: startEstimate }, 'Start my estimate')),
      state.desktop ? handoffCard('On a computer? Taking photos is easier with your phone. Scan a code and pick up there.') : null,
    ];
  }
  async function startEstimate(ev) {
    ev.target.disabled = true;
    try { await ensureSession(); go('you'); }
    catch (e) { state.notice = e.message; ev.target.disabled = false; render(); }
  }

  function handoffCard(intro) {
    if (!state.handoff) {
      return h('section', { class: 'card' },
        h('h2', {}, 'Use your phone'),
        h('p', { class: 'lede' }, intro),
        h('button', { type: 'button', class: 'button ghost', style: 'margin-top:14px', onclick: openHandoff }, 'Show the QR code'));
    }
    const info = state.handoffInfo;
    return h('section', { class: 'card', 'aria-live': 'polite' },
      h('h2', {}, 'Scan with your phone camera'),
      h('div', { class: 'handoff', style: 'margin-top:12px' },
        h('div', { class: 'qr', id: 'qr' }, state.qrSvg ? null : 'Loading…'),
        h('div', { class: 'stack' },
          h('p', {}, 'Point your phone camera at the code and tap the link. Everything you entered comes with you.'),
          h('p', { class: 'hint' }, info?.step && info.step !== 'intro'
            ? h('span', {}, h('span', { class: 'pulse' }), `Your phone is on: ${STEPS.find(([s]) => s === info.step)?.[1] || 'the estimate'}. We will show the confirmation here when you send it.`)
            : 'Waiting for your phone…'),
          h('button', { type: 'button', class: 'link', onclick: () => closeHandoff() }, 'Keep going on this computer'))));
  }
  let pollTimer = 0;
  function stopPolling() { clearInterval(pollTimer); pollTimer = 0; }
  async function openHandoff() {
    try {
      await ensureSession();
      await saveNow();
      state.handoff = true;
      state.qrSvg = null;
      render();
      const url = `${location.origin}${location.pathname}?t=${encodeURIComponent(state.token)}`;
      const { svg } = await api('qr', { url });
      state.qrSvg = svg;
      paintQr();
      stopPolling();
      pollTimer = setInterval(async () => {
        try {
          const s = await api('status');
          if (s.submitted) return finished(s.reference);
          if (s.step !== state.handoffInfo?.step) { state.handoffInfo = s; render(); }
        } catch {}
      }, 4000);
    } catch (e) {
      state.handoff = false;
      state.notice = e.message;
      render();
    }
  }
  function paintQr() {
    const box = $('qr');
    if (box && state.qrSvg) box.innerHTML = state.qrSvg; // SVG generated by our own function from our own URL.
  }
  // Back to this computer: pick up whatever the phone saved, then carry on.
  async function closeHandoff(thenStep) {
    state.handoff = false;
    stopPolling();
    try { await loadSession(true); }
    catch (e) { if (e.gone) return reset('This estimate is no longer available. Please start again.'); }
    if (state.step !== 'done' && thenStep) return go(thenStep);
    render();
  }

  function screenYou() {
    const f = state.form;
    return [h('section', { class: 'card' },
      h('h1', {}, 'About you'),
      h('p', { class: 'lede' }, 'So we know who to reach about the estimate.'),
      field('name', 'Your name', { autocomplete: 'name', maxlength: 120 }),
      h('div', { style: 'margin-top:16px' }, h('p', { class: 'label' }, 'Is this a company or personal vehicle?'),
        choices('ownership', [['company', 'Company or fleet'], ['personal', 'Personal']]), err('ownership')),
      f.ownership === 'company' ? field('company', 'Company or fleet name', { autocomplete: 'organization', maxlength: 160 }) : null,
      field('email', 'Email', { type: 'email', autocomplete: 'email', inputmode: 'email', maxlength: 254 }),
      field('phone', 'Phone', { type: 'tel', autocomplete: 'tel', inputmode: 'tel', maxlength: 40 }),
      h('div', { style: 'margin-top:16px' }, h('p', { class: 'label' }, 'How should we reach you?'),
        choices('contact', [['Phone call', 'Call'], ['Text message', 'Text'], ['Email', 'Email']], 'three'), err('contact')))];
  }

  function screenVehicle() {
    const f = state.form;
    const vinBlock = f.vin_skipped
      ? h('div', { class: 'note' }, 'No problem. Tell us the year, make and model below. ',
        h('button', { type: 'button', class: 'link', onclick: () => { f.vin_skipped = false; saveSoon(); render(); } }, 'I found the VIN'))
      : h('div', {},
        h('label', { class: 'field' }, h('span', {}, 'VIN'),
          h('input', {
            type: 'text', class: 'vin', name: 'vin', 'data-key': 'vin', value: f.vin || '', maxlength: 17, autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false',
            oninput: (ev) => {
              const v = ev.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/[IOQ]/g, (c) => (c === 'Q' || c === 'O' ? '0' : '1'));
              ev.target.value = v; f.vin = v; saveSoon();
              $('vin-count').textContent = `${v.length} of 17 characters`;
              if (v.length === 17) lookupVin(v);
            },
          }),
          h('p', { class: 'vin-count', id: 'vin-count' }, `${(f.vin || '').length} of 17 characters`),
          err('vin')),
        h('div', { class: 'vin-actions' },
          h('button', { type: 'button', class: 'button ghost', onclick: openScanner }, 'Scan the VIN barcode'),
          h('button', { type: 'button', class: 'link', onclick: () => { f.vin_skipped = true; f.vin = ''; state.vinNote = null; delete state.errors.vin; saveSoon(); render(); } }, "I don't have the VIN")),
        h('details', { class: 'help' }, h('summary', {}, 'Where is the VIN?'),
          h('ul', {}, h('li', {}, 'On a sticker in the driver door jamb (it has a barcode you can scan)'), h('li', {}, 'On the dashboard, visible through the windshield on the driver side'), h('li', {}, 'On the registration or insurance card'))));
    return [h('section', { class: 'card' },
      h('h1', {}, 'Your vehicle'),
      h('p', { class: 'lede' }, 'The VIN tells us exactly what we are working on. Scan it and we fill in the rest.'),
      vinBlock,
      state.vinNote ? h('p', { class: `note ${state.vinNote.kind}`, role: 'status' }, state.vinNote.text,
        state.vinSuggestion ? h('button', { type: 'button', class: 'link', style: 'margin-left:6px', onclick: () => { Object.assign(f, state.vinSuggestion); state.vinSuggestion = null; state.vinNote = { kind: 'good', text: 'Vehicle details updated from the VIN.' }; saveSoon(); render(); } }, 'Use these') : null) : null,
      h('div', { class: 'row3' },
        field('year', 'Year', { inputmode: 'numeric', maxlength: 4, autocomplete: 'off' }),
        field('make', 'Make', { maxlength: 60, autocomplete: 'off' }),
        field('model', 'Model', { maxlength: 80, autocomplete: 'off' })),
      h('div', { class: 'row' },
        field('plate', h('span', {}, 'License plate ', h('small', {}, '(optional)')), { maxlength: 20, autocomplete: 'off', autocapitalize: 'characters' }),
        field('mileage', h('span', {}, 'Mileage ', h('small', {}, '(optional)')), { inputmode: 'numeric', maxlength: 9, autocomplete: 'off' })))];
  }

  // NHTSA's free VIN decoder. Fills empty fields; offers the VIN's answer when fields differ.
  async function lookupVin(vin) {
    const f = state.form;
    delete state.errors.vin;
    state.vinSuggestion = null;
    const typo = checkDigitOk(vin) ? '' : ' This VIN may have a typo. Please compare it with the sticker.';
    state.vinNote = { kind: '', text: 'Looking up the VIN…' };
    render('vin');
    try {
      const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`);
      const r = (await res.json()).Results?.[0] || {};
      const found = { year: r.ModelYear && r.ModelYear !== '0' ? r.ModelYear : '', make: titleCase(r.Make), model: r.Model || '' };
      if (state.form.vin !== vin) return;
      if (!found.year || !found.make || !found.model) {
        state.vinNote = { kind: 'warn', text: `We couldn't look up this VIN. Please enter the year, make and model.${typo}` };
      } else if (!f.year && !f.make && !f.model) {
        Object.assign(f, found);
        state.vinNote = { kind: typo ? 'warn' : 'good', text: `Found it: ${found.year} ${found.make} ${found.model}. Check the details below.${typo}` };
        saveSoon();
      } else if (f.year !== found.year || (f.make || '').toLowerCase() !== found.make.toLowerCase() || (f.model || '').toLowerCase() !== found.model.toLowerCase()) {
        state.vinSuggestion = found;
        state.vinNote = { kind: 'warn', text: `The VIN says ${found.year} ${found.make} ${found.model}.${typo}` };
      } else {
        state.vinNote = { kind: typo ? 'warn' : 'good', text: `The VIN matches the vehicle details.${typo}` };
      }
    } catch {
      state.vinNote = { kind: 'warn', text: `We couldn't look up the VIN right now. Please enter the year, make and model.${typo}` };
    }
    if (state.step === 'vehicle') render();
  }
  const titleCase = (s) => (s || '').toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()).replace(/\bBmw\b|\bGmc\b|\bRam\b/g, (m) => m.toUpperCase());
  function checkDigitOk(vin) {
    const VALUES = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9, S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9 };
    const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
    if (!VIN_PATTERN.test(vin)) return false;
    const sum = [...vin].reduce((t, c, i) => t + (/\d/.test(c) ? Number(c) : VALUES[c]) * WEIGHTS[i], 0);
    return vin[8] === (sum % 11 === 10 ? 'X' : String(sum % 11));
  }
  function vinFromScan(text) {
    const cleaned = String(text).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const direct = cleaned.length === 18 && cleaned.startsWith('I') ? cleaned.slice(1) : cleaned;
    if (VIN_PATTERN.test(direct)) return direct;
    return cleaned.match(/[A-HJ-NPR-Z0-9]{17}/)?.[0] ?? null;
  }

  function screenDamage() {
    const f = state.form;
    const on = f.areas || [];
    const toggle = (key) => { f.areas = on.includes(key) ? on.filter((a) => a !== key) : [...on, key]; delete state.errors.areas; saveSoon(); render(`area:${key}`); };
    const zone = (key, cls, label) => h('button', { type: 'button', class: `zone ${cls}`, 'aria-pressed': String(on.includes(key)), 'data-key': `area:${key}`, onclick: () => toggle(key) }, label);
    return [h('section', { class: 'card' },
      h('h1', {}, 'Where is the damage?'),
      h('p', { class: 'lede' }, 'Tap every area that is damaged. The front of the vehicle is at the top.'),
      h('div', { class: 'diagram' },
        zone('front', 'zone-front', 'Front'),
        zone('driver-front', 'zone-df', 'Driver side front'),
        zone('driver-rear', 'zone-dr', 'Driver side rear'),
        h('div', { class: 'car' }, carSvg(on), h('button', { type: 'button', class: 'roof-button', 'aria-pressed': String(on.includes('roof')), 'data-key': 'area:roof', onclick: () => toggle('roof') }, 'Roof')),
        zone('passenger-front', 'zone-pf', 'Passenger side front'),
        zone('passenger-rear', 'zone-pr', 'Passenger side rear'),
        zone('rear', 'zone-rear', 'Rear')),
      zone('undercarriage', 'zone-under', 'Underneath the vehicle'),
      on.length ? h('div', { class: 'chips', 'aria-label': 'Selected areas' }, Object.keys(AREAS).filter((k) => on.includes(k)).map((k) => h('span', { class: 'chip' }, AREAS[k]))) : null,
      err('areas'),
      h('label', { class: 'field' }, h('span', {}, 'What happened? ', h('small', {}, '(optional)')),
        h('textarea', { name: 'description', maxlength: 4000, placeholder: 'For example: backed into a pole, rear bumper pushed in on the passenger side.', oninput: (ev) => { f.description = ev.target.value; saveSoon(); } }, f.description || '')))];
  }

  function slotCard({ slot, title, tip, spot }, required) {
    const p = state.photos[slot];
    const status = p?.status;
    const cls = `slot${status === 'done' ? ' done' : ''}${status === 'busy' ? ' busy' : ''}${status === 'error' ? ' error' : ''}`;
    const stateText = status === 'done' ? 'Added' : status === 'busy' ? 'Uploading…' : status === 'error' ? 'Try again' : null;
    return h('div', { class: cls },
      h('div', { class: 'slot-media' },
        p?.url ? h('img', { src: p.url, alt: `${title} photo` }) : spot ? carSvg([], spot) : h('span', { class: 'hint' }, 'Tap to add'),
        stateText ? h('span', { class: 'slot-state' }, stateText) : null),
      h('div', { class: 'slot-body' },
        h('p', { class: 'slot-title' }, title, required ? h('span', { class: 'req', 'aria-label': 'required' }, '*') : null),
        tip ? h('p', { class: 'slot-tip' }, status === 'error' ? p.error : tip) : status === 'error' ? h('p', { class: 'slot-tip' }, p.error) : null),
      status === 'busy' ? null : h('input', { type: 'file', accept: 'image/*', 'aria-label': `${p ? 'Replace' : 'Add'} photo: ${title}`, onchange: (ev) => { const file = ev.target.files[0]; ev.target.value = ''; if (file) upload(slot, file); } }),
      status === 'done' ? h('button', { type: 'button', class: 'slot-remove', 'aria-label': `Remove photo: ${title}`, onclick: () => removePhoto(slot) }, 'Remove') : null);
  }
  function screenPhotos() {
    const doneCount = REQUIRED.filter((s) => state.photos[s]?.status === 'done').length;
    const extrasUsed = EXTRA_SLOTS.filter((s) => state.photos[s]);
    const nextExtra = EXTRA_SLOTS.find((s) => !state.photos[s]);
    return [
      state.desktop ? handoffCard('Your phone camera makes this much easier. Scan a code and your progress moves to your phone.') : null,
      h('section', { class: 'card' },
        h('h1', {}, 'Photos'),
        h('p', { class: 'lede' }, 'Walk around the vehicle first, then get close to the damage. Tap a box to take a photo or choose one.'),
        h('p', { class: 'photo-count', role: 'status' }, `${doneCount} of ${REQUIRED.length} required photos added`),
        err('photos'),
        h('h2', { style: 'margin-top:18px' }, 'Walk around the vehicle'),
        h('p', { class: 'hint' }, 'The orange dot shows where to stand.'),
        h('div', { class: 'photo-grid four' }, CORNERS.map((c) => slotCard(c, true)))),
      h('section', { class: 'card' },
        h('h2', {}, 'Close-ups of the damage'),
        h('p', { class: 'hint' }, 'If there is damage in more than one place, add the others below.'),
        h('div', { class: 'photo-grid three' }, DAMAGE.map((d) => slotCard(d, true)))),
      h('section', { class: 'card' },
        h('h2', {}, 'Anything else? ', h('small', { class: 'hint' }, '(optional)')),
        h('p', { class: 'hint' }, 'Other damage, the VIN sticker, the odometer, or anything you want us to see. Up to 6.'),
        h('div', { class: 'photo-grid three' },
          extrasUsed.map((s) => slotCard({ slot: s, title: `Extra photo ${EXTRA_SLOTS.indexOf(s) + 1}` }, false)),
          nextExtra ? slotCard({ slot: nextExtra, title: 'Add a photo' }, false) : null)),
    ];
  }
  async function upload(slot, file) {
    state.photos[slot] = { ...(state.photos[slot] || {}), status: 'busy' };
    delete state.errors.photos;
    render();
    try {
      await ensureSession();
      const shrunk = await shrink(file);
      const data = new FormData();
      data.append('token', state.token);
      data.append('slot', slot);
      data.append('file', shrunk);
      const res = await fetch(API, { method: 'POST', body: data });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || 'Upload failed.');
      state.photos[slot] = { status: 'done', url: out.url || URL.createObjectURL(shrunk) };
    } catch (e) {
      state.photos[slot] = { status: 'error', error: e instanceof TypeError ? 'No connection. Tap to try again.' : `${e.message} Tap to try again.` };
    }
    if (state.step === 'photos') render();
  }
  async function removePhoto(slot) {
    const before = state.photos[slot];
    delete state.photos[slot];
    render();
    try { await api('remove_photo', { slot }); }
    catch { state.photos[slot] = before; render(); }
  }
  // Resize to about 2000 px and JPEG so phone photos upload quickly. HEIC that the browser
  // cannot open is sent as is (the server accepts it).
  async function shrink(file) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close?.();
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
      if (!blob) throw new Error('encode');
      return new File([blob], 'photo.jpg', { type: 'image/jpeg' });
    } catch {
      if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type)) throw new Error('This file is not a photo we can use. Choose a JPG or PNG.');
      if (file.size > 10 * 1024 * 1024) throw new Error('This photo is larger than 10 MB.');
      return file;
    }
  }

  function screenFinish() {
    const f = state.form;
    const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    return [h('section', { class: 'card' },
      h('h1', {}, 'Timing and insurance'),
      h('label', { class: 'check' },
        h('input', { type: 'checkbox', checked: !!f.rush, onchange: (ev) => { f.rush = ev.target.checked; saveSoon(); } }),
        h('span', {}, 'This is a rush repair', h('small', {}, 'The vehicle is out of service or needed urgently.'))),
      h('label', { class: 'field' }, h('span', {}, 'When do you need the vehicle back? ', h('small', {}, '(optional)')),
        h('input', { type: 'date', min: today, value: f.needed_by || '', onchange: (ev) => { f.needed_by = ev.target.value; saveSoon(); } })),
      h('div', { style: 'margin-top:16px' }, h('p', { class: 'label' }, 'Will this be an insurance claim?'),
        choices('insurance', [['Yes', 'Yes'], ['No', 'No'], ['Not sure', 'Not sure']], 'three'), err('insurance')),
      f.insurance === 'Yes' ? field('claim_number', h('span', {}, 'Claim number ', h('small', {}, '(if you have it)')), { maxlength: 60, autocomplete: 'off' }) : null)];
  }

  function screenReview() {
    const f = state.form;
    const edit = (step) => h('button', { type: 'button', class: 'link', onclick: () => go(step) }, 'Edit');
    const rows = (pairs) => h('dl', {}, pairs.filter(([, v]) => v).map(([k, v]) => [h('dt', {}, k), h('dd', {}, v)]));
    const photos = [...REQUIRED, ...EXTRA_SLOTS].filter((s) => state.photos[s]?.status === 'done');
    return [
      h('section', { class: 'card' }, h('h1', {}, 'Check and send'), h('p', { class: 'lede' }, 'Make sure everything looks right, then send it to the shop.'),
        state.notice ? h('p', { class: 'note warn', role: 'alert' }, state.notice) : null),
      h('section', { class: 'card review' }, h('div', { class: 'review-head' }, h('h2', {}, 'About you'), edit('you')),
        rows([['Name', f.name], ['Vehicle type', f.ownership === 'company' ? `Company or fleet: ${f.company || ''}` : 'Personal'], ['Email', f.email], ['Phone', f.phone], ['Reach me by', f.contact]])),
      h('section', { class: 'card review' }, h('div', { class: 'review-head' }, h('h2', {}, 'Vehicle'), edit('vehicle')),
        rows([['Vehicle', [f.year, f.make, f.model].filter(Boolean).join(' ')], ['VIN', f.vin_skipped ? 'Not provided' : f.vin], ['License plate', f.plate], ['Mileage', f.mileage ? Number(f.mileage).toLocaleString('en-US') : '']])),
      h('section', { class: 'card review' }, h('div', { class: 'review-head' }, h('h2', {}, 'Damage'), edit('damage')),
        rows([['Areas', Object.keys(AREAS).filter((k) => (f.areas || []).includes(k)).map((k) => AREAS[k]).join(', ')], ['What happened', f.description]])),
      h('section', { class: 'card review' }, h('div', { class: 'review-head' }, h('h2', {}, `Photos (${photos.length})`), edit('photos')),
        h('div', { class: 'thumbs' }, photos.map((s) => state.photos[s].url ? h('img', { src: state.photos[s].url, alt: '' }) : null))),
      h('section', { class: 'card review' }, h('div', { class: 'review-head' }, h('h2', {}, 'Timing and insurance'), edit('finish')),
        rows([['Rush repair', f.rush ? 'Yes' : 'No'], ['Needed back by', f.needed_by ? new Date(`${f.needed_by}T12:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''], ['Insurance claim', f.insurance], ['Claim number', f.claim_number]])),
    ];
  }
  async function submit(ev) {
    const button = ev.currentTarget;
    button.disabled = true;
    state.notice = null;
    button.textContent = 'Sending…';
    try {
      await saveNow();
      const out = await api('submit', { form: state.form });
      finished(out.reference);
    } catch (e) {
      state.notice = e instanceof TypeError ? `We could not reach the shop. Check your connection and try again, or call ${PHONE}.` : e.message;
      if (e.step && e.step !== 'review') { const target = e.step; state.step = target; state.errors = validate(target); render(); state.notice = null; return; }
      render();
    }
  }

  function screenDone() {
    const f = state.form;
    const first = f.name?.trim().split(/\s+/)[0];
    const how = f.contact === 'Email' ? `by email at ${f.email}` : f.contact === 'Text message' ? `by text at ${f.phone}` : f.phone ? `by phone at ${f.phone}` : 'soon';
    return [h('section', { class: 'card', 'aria-live': 'polite' },
      h('p', { class: 'eyebrow' }, 'Request received'),
      h('h1', {}, first ? `Thanks, ${first}. Your estimate request is in.` : 'Your estimate request is in.'),
      h('p', { class: 'label', style: 'margin-top:14px' }, 'Your reference number'),
      h('div', { class: 'reference' }, h('span', {}, state.reference || ''),
        navigator.clipboard ? h('button', { type: 'button', class: 'button ghost', onclick: (ev) => { navigator.clipboard.writeText(state.reference || ''); ev.currentTarget.textContent = 'Copied'; } }, 'Copy') : null),
      h('h2', { style: 'margin-top:20px' }, 'What happens next'),
      h('ol', { class: 'done-steps' },
        h('li', {}, 'Our team looks over your photos and details.'),
        h('li', {}, `We contact you ${how} about the repair and the next step.`)),
      h('p', { style: 'margin-top:16px' }, 'Need us sooner? Call ', h('a', { href: 'tel:6107078600' }, PHONE), '.'),
      h('button', { type: 'button', class: 'button ghost', style: 'margin-top:18px', onclick: () => reset() }, 'Start another estimate'))];
  }

  // ---------- rendering ----------
  function render(focusKey) {
    $('loading').hidden = true;
    const screens = { intro: screenIntro, you: screenYou, vehicle: screenVehicle, damage: screenDamage, photos: screenPhotos, finish: screenFinish, review: screenReview, done: screenDone };
    $('screen').replaceChildren(...[screens[state.step]()].flat(Infinity).filter(Boolean));
    paintQr();
    const i = stepIndex();
    $('progress').hidden = i < 0;
    if (i >= 0) {
      $('progress-label').textContent = `Step ${i + 1} of ${STEPS.length}: ${STEPS[i][1]}`;
      $('progress-fill').style.width = `${((i + 1) / STEPS.length) * 100}%`;
    }
    document.querySelector('.actions')?.remove();
    if (i >= 0) {
      const isReview = state.step === 'review';
      document.body.append(h('nav', { class: 'actions', 'aria-label': 'Step navigation' }, h('div', { class: 'actions-inner' },
        h('button', { type: 'button', class: 'button ghost', onclick: back }, 'Back'),
        isReview ? h('button', { type: 'button', class: 'button', onclick: submit }, 'Send my estimate request') : h('button', { type: 'button', class: 'button', onclick: next }, 'Continue'))));
    }
    if (focusKey) document.querySelector(`[data-key="${focusKey}"]`)?.focus();
  }

  // ---------- VIN scanner ----------
  const scanner = { stream: null, timer: 0, active: false };
  async function openScanner() {
    const dialog = $('scanner');
    const video = $('scanner-video');
    const status = $('scanner-status');
    const torch = $('scanner-torch');
    dialog.hidden = false;
    document.body.style.overflow = 'hidden';
    status.textContent = 'Starting the camera…';
    torch.hidden = true;
    scanner.active = true;
    try {
      scanner.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      if (!scanner.active) return stopScanner();
      video.srcObject = scanner.stream;
      await video.play();
      const track = scanner.stream.getVideoTracks()[0];
      if (track.getCapabilities?.().torch) {
        let on = false;
        torch.hidden = false;
        torch.onclick = async () => { on = !on; await track.applyConstraints({ advanced: [{ torch: on }] }).catch(() => {}); torch.textContent = on ? 'Turn off light' : 'Turn on light'; };
      }
      status.textContent = 'Point the camera at the VIN barcode on the driver door jamb. Hold steady.';
      const read = await barcodeReader();
      const tick = async () => {
        if (!scanner.active) return;
        try {
          const text = video.videoWidth ? await read(video) : null;
          const vin = text && vinFromScan(text);
          if (vin) {
            navigator.vibrate?.(80);
            stopScanner();
            state.form.vin = vin;
            state.form.vin_skipped = false;
            render();
            lookupVin(vin);
            return;
          }
          if (text) status.textContent = 'That barcode is not the VIN. Look for the one next to the 17-character number.';
        } catch {}
        scanner.timer = setTimeout(tick, 250);
      };
      tick();
    } catch (e) {
      const denied = /NotAllowed|denied/i.test(`${e?.name} ${e?.message}`);
      status.textContent = denied
        ? 'Camera access was blocked. Allow the camera for this site in your browser settings, or type the VIN.'
        : 'The camera could not start on this device. Type the VIN instead.';
    }
  }
  // Uses the browser's own barcode reader when it has one (most Android phones); otherwise
  // loads ZXing (iPhone Safari).
  async function barcodeReader() {
    if ('BarcodeDetector' in window) {
      const wanted = ['code_39', 'code_128', 'data_matrix', 'qr_code'];
      const supported = (await window.BarcodeDetector.getSupportedFormats?.()) || [];
      const formats = wanted.filter((x) => supported.includes(x));
      if (formats.length) {
        const detector = new window.BarcodeDetector({ formats });
        return async (video) => (await detector.detect(video))[0]?.rawValue || null;
      }
    }
    if (!window.ZXing) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = ZXING; s.onload = resolve; s.onerror = reject;
        document.head.append(s);
      });
    }
    const Z = window.ZXing;
    const hints = new Map();
    hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.CODE_39, Z.BarcodeFormat.CODE_128, Z.BarcodeFormat.DATA_MATRIX, Z.BarcodeFormat.QR_CODE]);
    hints.set(Z.DecodeHintType.TRY_HARDER, true);
    const reader = new Z.MultiFormatReader();
    reader.setHints(hints);
    const canvas = document.createElement('canvas');
    return async (video) => {
      // Read the middle band of the picture, where the guide box is.
      const w = video.videoWidth, hgt = video.videoHeight;
      const band = Math.round(hgt * 0.45);
      canvas.width = w; canvas.height = band;
      canvas.getContext('2d').drawImage(video, 0, Math.round((hgt - band) / 2), w, band, 0, 0, w, band);
      try {
        const bitmap = new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(canvas)));
        return reader.decode(bitmap).getText();
      } catch { return null; }
    };
  }
  function stopScanner() {
    scanner.active = false;
    clearTimeout(scanner.timer);
    scanner.stream?.getTracks().forEach((t) => t.stop());
    scanner.stream = null;
    $('scanner-video').srcObject = null;
    $('scanner').hidden = true;
    document.body.style.overflow = '';
  }
  $('scanner-close').addEventListener('click', stopScanner);
  $('scanner-type').addEventListener('click', () => { stopScanner(); document.querySelector('input.vin')?.focus(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('scanner').hidden) stopScanner(); });

  // ---------- start ----------
  async function loadSession(showDone) {
    const data = await api('load');
    if (data.submitted) {
      if (showDone && data.reference) { state.reference = data.reference; store.set(null); state.step = 'done'; return; }
      throw Object.assign(new Error('done'), { gone: true });
    }
    state.form = data.form || {};
    state.savedStep = data.step;
    state.photos = Object.fromEntries(Object.entries(data.photos || {}).map(([slot, p]) => [slot, { status: 'done', url: p.url }]));
  }
  async function boot() {
    const params = new URLSearchParams(location.search);
    const linked = params.get('t');
    if (linked) {
      params.delete('t');
      history.replaceState(null, '', location.pathname + (params.toString() ? `?${params}` : ''));
    }
    state.token = linked || store.get();
    if (state.token) {
      try {
        await loadSession(!!linked);
        if (state.step !== 'done') {
          store.set(state.token);
          if (linked) {
            // Arrived from the QR code: go straight to where the other device was.
            const saved = STEPS.some(([s]) => s === state.savedStep) ? state.savedStep : 'you';
            state.step = state.form.name ? saved : 'you';
          } else {
            state.resumable = !!(state.form.name || Object.keys(state.photos).length);
          }
        }
      } catch (e) {
        state.token = null; store.set(null);
        if (linked) state.notice = e.gone ? 'That link has expired or the estimate was already sent. You can start a new one here.' : 'We could not open that estimate. You can start a new one here.';
      }
    }
    render();
  }
  boot();
})();
