// Heritage Collision staff page: sign in by emailed link, read and work leads for
// both collision brands, manage who can sign in and who gets new-lead emails.
// Talks directly to Supabase project zxzzmrkyctbgxlgjritv. The key below is the
// public anon key; row level security decides what a signed-in person can see.
(() => {
  const SB = 'https://zxzzmrkyctbgxlgjritv.supabase.co';
  const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4enptcmt5Y3RiZ3hsZ2pyaXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNTE2NzcsImV4cCI6MjA2NjgyNzY3N30.7A63ZNl1Cpm5Jn1q5uUW3FqlWaqe8DGpOq0Q9dG7N4s';
  const STORE = 'heritage-collision-staff-session';
  const BRAND_LABEL = { commercial: 'Commercial', retail: 'Retail' };
  const STATUS_LABEL = { new: 'New', contacted: 'Contacted', closed: 'Closed' };
  const AREA_LABEL = {
    front: 'Front', 'driver-front': 'Driver side front', 'driver-rear': 'Driver side rear', rear: 'Rear',
    'passenger-rear': 'Passenger side rear', 'passenger-front': 'Passenger side front', roof: 'Roof', undercarriage: 'Underneath',
  };
  const SOURCE_LABEL = { website: 'Website form', 'estimate-app': 'Estimate app' };
  // [column, label, optional formatter]. Empty values are left out of the detail view.
  const FIELDS = [
    ['reference', 'Reference'], ['phone', 'Phone'], ['email', 'Email'], ['business_name', 'Business'], ['service', 'Needs help with'],
    ['preferred_contact', 'Preferred contact'], ['best_time', 'Best time to reach'],
    ['vehicle', 'Vehicle'], ['vehicle_type', 'Vehicle type'], ['vin', 'VIN'], ['license_plate', 'License plate'],
    ['mileage', 'Mileage', (v) => v == null ? '' : Number(v).toLocaleString('en-US')],
    ['damage_areas', 'Damage areas', (v) => (v || []).map((a) => AREA_LABEL[a] || a).join(', ')],
    ['is_rush', 'Rush repair', (v) => v ? 'Yes' : ''],
    ['needed_by', 'Needed back by', (v) => v ? new Date(v + 'T12:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''],
    ['insurance', 'Insurance'], ['claim_number', 'Claim number'], ['message', 'Details'],
    ['source', 'Came in through', (v) => SOURCE_LABEL[v] || v], ['source_page', 'Sent from'],
  ];

  const $ = (id) => document.getElementById(id);
  const state = { session: null, me: null, staff: [], leads: [], brand: 'all', status: 'open', selected: null };

  // Build DOM nodes without innerHTML so customer text can never become markup.
  function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat(Infinity)) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
    return el;
  }
  const show = (id, on) => { $(id).hidden = !on; };
  const note = (id, text, kind) => { const el = $(id); el.textContent = text || ''; el.className = 'notice' + (kind ? ' ' + kind : ''); };
  const when = (iso) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

  // Session storage is a convenience; everything still works if the browser blocks it.
  const saveSession = (s) => { state.session = s; try { s ? localStorage.setItem(STORE, JSON.stringify(s)) : localStorage.removeItem(STORE); } catch {} };
  const loadSession = () => { try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch { return null; } };
  const fromAuth = (r) => ({ access_token: r.access_token, refresh_token: r.refresh_token, expires_at: Date.now() + (r.expires_in || 3600) * 1000 });
  const emailOf = (token) => { try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).email.toLowerCase(); } catch { return ''; } };

  async function auth(path, body, token) {
    const res = await fetch(SB + '/auth/v1/' + path, {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.msg || data.error_description || data.message || 'Sign-in failed');
    return data;
  }

  async function refresh() {
    if (!state.session?.refresh_token) return false;
    try { saveSession(fromAuth(await auth('token?grant_type=refresh_token', { refresh_token: state.session.refresh_token }))); return true; }
    catch { saveSession(null); return false; }
  }

  async function api(path, { method = 'GET', body, headers = {} } = {}, retried = false) {
    if (state.session && state.session.expires_at - Date.now() < 60000) await refresh();
    if (!state.session) { toLogin(); throw new Error('Signed out'); }
    const res = await fetch(SB + path, {
      method,
      headers: { apikey: KEY, Authorization: 'Bearer ' + state.session.access_token, ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401 && !retried && await refresh()) return api(path, { method, body, headers }, true);
    const data = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || data?.error || 'Request failed (' + res.status + ')');
    return data;
  }

  // ---------- sign in ----------
  function toLogin(message, kind) {
    show('loading', false); show('view-app', false); show('bar-user', false); show('view-login', true);
    if (message) note('login-message', message, kind);
  }

  $('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('login-email').value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return note('login-message', 'Enter your email address.', 'error');
    const button = e.submitter || e.target.querySelector('button');
    button.disabled = true;
    try {
      const res = await fetch(SB + '/functions/v1/staff-login', {
        method: 'POST',
        headers: { apikey: KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, page: location.origin + '/staff/' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
      note('login-message', 'If ' + email + ' is on the staff list, a sign-in link is on its way. Check your inbox.', 'ok');
    } catch (err) {
      note('login-message', err.message, 'error');
    } finally {
      button.disabled = false;
    }
  });

  $('sign-out').addEventListener('click', async () => {
    try { if (state.session) await auth('logout', {}, state.session.access_token); } catch {}
    saveSession(null);
    toLogin('You are signed out.', 'ok');
  });

  // ---------- leads ----------
  const visibleLeads = () => state.leads.filter((l) =>
    (state.brand === 'all' || l.brand === state.brand) &&
    (state.status === 'all' || (state.status === 'open' ? l.status !== 'closed' : l.status === state.status)));

  function renderList() {
    const list = visibleLeads();
    $('lead-count').textContent = list.length + (list.length === 1 ? ' lead' : ' leads');
    $('lead-list').replaceChildren(...(list.length ? list.map((l) => h('li', { class: 'lead-item' + (l.status === 'new' ? ' is-new' : '') },
      h('button', { type: 'button', 'aria-current': state.selected === l.id ? 'true' : null, onclick: () => select(l.id) },
        h('span', { class: 'lead-top' }, h('span', { class: 'lead-name' }, l.name), h('span', { class: 'lead-date' }, when(l.created_at))),
        h('span', { class: 'lead-sub' }, [l.business_name, l.service, l.vehicle].filter(Boolean).join(' / ') || l.phone || l.email || ''),
        h('span', { class: 'tags' },
          h('span', { class: 'tag ' + l.brand }, BRAND_LABEL[l.brand]),
          h('span', { class: 'tag' + (l.status === 'new' ? ' new' : '') }, STATUS_LABEL[l.status]),
          l.is_rush ? h('span', { class: 'tag warn' }, 'Rush') : null,
          l.source === 'estimate-app' ? h('span', { class: 'tag' }, 'Estimate app') : null,
          l.photos?.length ? h('span', { class: 'tag' }, l.photos.length + ' photo' + (l.photos.length === 1 ? '' : 's')) : null,
          l.alert_error ? h('span', { class: 'tag warn' }, 'Email alert failed') : null)))) :
      [h('li', { class: 'hint' }, 'No leads match these filters.')]));
  }

  async function loadLeads() {
    state.leads = await api('/rest/v1/leads?select=*&order=created_at.desc&limit=1000');
    renderList();
    if (state.selected && state.leads.some((l) => l.id === state.selected)) renderDetail();
  }

  function select(id) {
    state.selected = id;
    note('list-message', '');
    const url = new URL(location.href); url.searchParams.set('lead', id); history.replaceState(null, '', url);
    $('view-app').classList.add('showing-detail');
    renderList(); renderDetail();
    if (matchMedia('(max-width: 860px)').matches) window.scrollTo(0, 0);
  }

  function closeDetail() {
    state.selected = null;
    const url = new URL(location.href); url.searchParams.delete('lead'); history.replaceState(null, '', url);
    $('view-app').classList.remove('showing-detail');
    renderList();
    $('lead-detail').replaceChildren(h('p', { class: 'empty' }, 'Choose a lead to see the details and photos.'));
  }

  // Managers only (the database enforces it too). Typing "delete" guards against a slip.
  function confirmDelete(l) {
    const count = l.photos?.length || 0;
    const input = h('input', { id: 'delete-confirm', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false' });
    const msg = h('p', { class: 'notice', role: 'status' });
    const cancel = h('button', { type: 'button', class: 'button secondary' }, 'Cancel');
    const go = h('button', { type: 'button', class: 'button danger-button', disabled: true }, 'Delete lead');
    const dialog = h('dialog', { class: 'confirm', 'aria-labelledby': 'delete-title' },
      h('h2', { id: 'delete-title' }, 'Delete this lead?'),
      h('p', {}, 'This permanently removes the lead from ' + l.name + (count ? ' and its ' + count + ' photo' + (count === 1 ? '' : 's') : '') + '. It cannot be undone.'),
      h('label', { for: 'delete-confirm' }, 'Type delete to confirm'),
      input,
      h('div', { class: 'confirm-actions' }, cancel, go),
      msg);
    const ready = () => input.value.trim().toLowerCase() === 'delete';
    input.addEventListener('input', () => { go.disabled = !ready(); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && ready() && !go.disabled) go.click(); });
    cancel.addEventListener('click', () => { dialog.close(); dialog.remove(); });
    dialog.addEventListener('close', () => dialog.remove());
    go.addEventListener('click', async () => {
      if (!ready()) return;
      go.disabled = cancel.disabled = input.disabled = true;
      msg.textContent = 'Deleting...'; msg.className = 'notice';
      try {
        const rows = await api('/rest/v1/leads?id=eq.' + l.id, { method: 'DELETE', headers: { Prefer: 'return=representation' } });
        if (!rows?.length) throw new Error('This lead could not be deleted. Only managers can delete leads.');
        const paths = (rows[0].photos || []).map((p) => p.path).filter(Boolean);
        let leftover = 0;
        if (paths.length) {
          try { leftover = paths.length - ((await api('/storage/v1/object/lead-photos', { method: 'DELETE', body: { prefixes: paths } }))?.length || 0); }
          catch { leftover = paths.length; }
        }
        state.leads = state.leads.filter((x) => x.id !== l.id);
        dialog.close();
        closeDetail();
        note('list-message', leftover ? 'Lead deleted. ' + leftover + ' of its photos could not be removed.' : 'Lead from ' + l.name + ' deleted.', leftover ? 'error' : 'ok');
      } catch (err) {
        msg.textContent = err.message; msg.className = 'notice error';
        cancel.disabled = input.disabled = false; go.disabled = !ready();
      }
    });
    document.body.append(dialog);
    dialog.showModal();
    input.focus();
  }

  async function renderDetail() {
    const l = state.leads.find((x) => x.id === state.selected);
    const box = $('lead-detail');
    if (!l) return closeDetail();
    const tel = l.phone ? 'tel:' + l.phone.replace(/[^\d+]/g, '') : null;
    const photoGrid = h('div', { class: 'photos' });
    const status = h('select', { id: 'lead-status' }, Object.entries(STATUS_LABEL).map(([v, t]) => h('option', { value: v, selected: l.status === v }, t)));
    const notes = h('textarea', { id: 'lead-notes', maxlength: '4000', placeholder: 'Called, left a voicemail, estimate booked for Tuesday...' }, l.staff_notes || '');
    const saveNote = h('p', { class: 'notice', role: 'status' });
    const save = h('button', { class: 'button', type: 'button', onclick: async () => {
      save.disabled = true; saveNote.textContent = '';
      try {
        const [row] = await api('/rest/v1/leads?id=eq.' + l.id, { method: 'PATCH', body: { status: status.value, staff_notes: notes.value.trim() || null }, headers: { Prefer: 'return=representation' } });
        Object.assign(l, row); renderList();
        saveNote.textContent = 'Saved.'; saveNote.className = 'notice ok';
      } catch (err) { saveNote.textContent = err.message; saveNote.className = 'notice error'; }
      finally { save.disabled = false; }
    } }, 'Save');

    box.replaceChildren(...[
      h('button', { type: 'button', class: 'text-button back', onclick: closeDetail }, 'Back to leads'),
      h('div', { class: 'detail-head' }, h('h2', {}, l.name), h('span', { class: 'tag ' + l.brand }, BRAND_LABEL[l.brand])),
      h('p', { class: 'meta' }, 'Received ' + when(l.created_at) + (l.updated_by && l.updated_by !== 'system' ? ' · last changed by ' + l.updated_by : '')),
      l.alert_error ? h('p', { class: 'alert-box' }, 'The email alert for this lead did not go out, so nobody may have seen it yet.') : null,
      h('div', { class: 'actions' },
        tel ? h('a', { class: 'button', href: tel }, 'Call ' + l.phone) : null,
        l.email ? h('a', { class: 'button secondary', href: 'mailto:' + l.email }, 'Email') : null),
      h('dl', { class: 'fields' }, FIELDS.map(([k, label, format]) => [label, format ? format(l[k], l) : l[k]])
        .filter(([, v]) => v != null && v !== '').map(([label, v]) => [h('dt', {}, label), h('dd', {}, v)])),
      l.photos?.length ? [h('h3', { class: 'section-title' }, 'Photos'), photoGrid] : h('p', { class: 'hint', style: 'margin-top:14px' }, 'No photos were sent.'),
      h('h3', { class: 'section-title' }, 'Follow-up'),
      h('div', { class: 'work' }, h('label', { for: 'lead-status' }, 'Status'), status, h('label', { for: 'lead-notes' }, 'Notes for the team'), notes, save, saveNote),
      state.me?.can_manage_staff ? h('div', { class: 'delete-zone' },
        h('h3', { class: 'section-title' }, 'Delete lead'),
        h('p', { class: 'hint' }, 'For tests, spam and sales pitches. Removes the lead and its photos for good.'),
        h('button', { type: 'button', class: 'button danger-button', onclick: () => confirmDelete(l) }, 'Delete this lead')) : null,
    ].flat().filter(Boolean));

    if (l.photos?.length) {
      try {
        const signed = await api('/storage/v1/object/sign/lead-photos', { method: 'POST', body: { expiresIn: 3600, paths: l.photos.map((p) => p.path) } });
        if (state.selected !== l.id) return;
        // Signed links come back in the order asked for; match by path when it is returned.
        photoGrid.replaceChildren(...signed.map((s, i) => [s, l.photos.find((p) => p.path === s.path) || l.photos[i]]).filter(([s]) => s.signedURL).map(([s, photo], i) => {
          const url = SB + '/storage/v1' + s.signedURL;
          const label = photo?.label;
          return h('figure', {},
            h('a', { href: url, target: '_blank', rel: 'noopener' }, h('img', { src: url, alt: label || 'Photo ' + (i + 1) + ' from ' + l.name, loading: 'lazy' })),
            label ? h('figcaption', {}, label) : null);
        }));
      } catch (err) {
        photoGrid.replaceChildren(h('p', { class: 'notice error' }, 'Photos could not be loaded: ' + err.message));
      }
    }
  }

  document.querySelectorAll('[data-brand]').forEach((b) => b.addEventListener('click', () => {
    state.brand = b.dataset.brand;
    document.querySelectorAll('[data-brand]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    renderList();
  }));
  $('filter-status').addEventListener('change', (e) => { state.status = e.target.value; renderList(); });
  $('refresh').addEventListener('click', () => loadLeads().catch((e) => alert(e.message)));

  // ---------- people and alerts ----------
  function renderPeople() {
    const manager = !!state.me?.can_manage_staff;
    $('people-list').replaceChildren(...state.staff.map((p) => h('li', {},
      h('span', { class: 'who' }, h('strong', {}, p.full_name + (p.email === state.me.email ? ' (you)' : '')), h('span', {}, p.email + (p.can_manage_staff ? ' · can add people' : ''))),
      manager && p.email !== state.me.email ? h('button', { type: 'button', class: 'text-button danger', onclick: () => removePerson(p) }, 'Remove') : null)));
    show('add-person', manager);
    ['alerts-commercial', 'alerts-retail'].forEach((id) => { $(id).disabled = !manager; });
    show('alerts-save', manager);
  }

  async function loadPeople() {
    state.staff = await api('/rest/v1/staff_members?select=email,full_name,can_manage_staff&order=full_name');
    const alerts = await api('/rest/v1/lead_alert_recipients?select=brand,emails');
    for (const a of alerts) $('alerts-' + a.brand).value = a.emails.join(', ');
    renderPeople();
  }

  async function removePerson(p) {
    if (!confirm('Remove ' + p.full_name + '? They will no longer be able to see leads.')) return;
    try { await api('/rest/v1/staff_members?email=eq.' + encodeURIComponent(p.email), { method: 'DELETE' }); await loadPeople(); }
    catch (err) { alert(err.message); }
  }

  $('add-person').addEventListener('submit', async (e) => {
    e.preventDefault();
    const full_name = $('person-name').value.trim();
    const email = $('person-email').value.trim().toLowerCase();
    if (!full_name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return note('person-message', 'Enter a name and a valid email.', 'error');
    try {
      await api('/rest/v1/staff_members', { method: 'POST', body: { email, full_name, can_manage_staff: $('person-manage').checked } });
      e.target.reset();
      note('person-message', full_name + ' can now sign in at ' + location.origin + '/staff/ with ' + email + '.', 'ok');
      await loadPeople();
    } catch (err) {
      note('person-message', /duplicate/i.test(err.message) ? 'That email is already on the list.' : err.message, 'error');
    }
  });

  $('alerts-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      for (const brand of ['commercial', 'retail']) {
        const emails = $('alerts-' + brand).value.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
        if (!emails.length || emails.some((x) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x))) throw new Error('Check the ' + BRAND_LABEL[brand].toLowerCase() + ' addresses. At least one valid email is needed.');
        await api('/rest/v1/lead_alert_recipients?brand=eq.' + brand, { method: 'PATCH', body: { emails } });
      }
      note('alerts-message', 'Saved. New leads will email these addresses.', 'ok');
    } catch (err) { note('alerts-message', err.message, 'error'); }
  });

  function showTab(which) {
    $('tab-leads').setAttribute('aria-pressed', String(which === 'leads'));
    $('tab-people').setAttribute('aria-pressed', String(which === 'people'));
    show('panel-leads', which === 'leads'); show('panel-people', which === 'people');
    if (which === 'people') loadPeople().catch((e) => alert(e.message));
  }
  $('tab-leads').addEventListener('click', () => showTab('leads'));
  $('tab-people').addEventListener('click', () => showTab('people'));

  // ---------- start ----------
  async function start() {
    const hash = new URLSearchParams(location.hash.slice(1));
    const tokenHash = hash.get('token_hash');
    if (tokenHash) {
      history.replaceState(null, '', location.pathname + location.search);
      try {
        let res;
        try { res = await auth('verify', { type: 'email', token_hash: tokenHash }); }
        catch { res = await auth('verify', { type: 'magiclink', token_hash: tokenHash }); }
        saveSession(fromAuth(res));
      } catch {
        return toLogin('That sign-in link has expired or was already used. Enter your email for a new one.', 'error');
      }
    } else {
      state.session = loadSession();
    }
    if (!state.session) return toLogin();

    try {
      const email = emailOf(state.session.access_token);
      state.staff = await api('/rest/v1/staff_members?select=email,full_name,can_manage_staff&order=full_name');
      state.me = state.staff.find((p) => p.email === email);
      if (!state.me) {
        saveSession(null);
        return toLogin(email + ' is not on the staff list. Ask a manager to add you.', 'error');
      }
      $('user-name').textContent = state.me.full_name;
      show('loading', false); show('view-login', false); show('bar-user', true); show('view-app', true);
      await loadLeads();
      const wanted = new URLSearchParams(location.search).get('lead');
      if (wanted && state.leads.some((l) => l.id === wanted)) select(wanted);
    } catch (err) {
      if (state.session) { show('loading', true); $('loading').textContent = 'Could not load leads: ' + err.message; }
    }
  }
  start();
})();
