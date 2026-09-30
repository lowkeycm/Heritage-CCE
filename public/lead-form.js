// Sends a website estimate request to the Heritage Collision lead database
// (Supabase edge function submit-lead, project zxzzmrkyctbgxlgjritv). Photos are shrunk in
// the browser first so phone pictures upload quickly. Used by any form marked
// data-lead-form with data-brand="commercial" or "retail". The same file is copied into
// the Heritage Collision Experts site; keep the two copies identical.
(() => {
  'use strict';
  const ENDPOINT = 'https://zxzzmrkyctbgxlgjritv.supabase.co/functions/v1/submit-lead';
  const PHONE = '(610) 707-8600';
  const MAX_PHOTOS = 10;
  const MAX_BYTES = 10 * 1024 * 1024;
  const LONG_EDGE = 2000;
  const SENDABLE = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

  document.querySelectorAll('form[data-lead-form]').forEach(setup);

  function setup(form) {
    const input = form.querySelector('[data-photo-input]');
    const list = form.querySelector('[data-photo-list]');
    const status = form.querySelector('[data-form-status]');
    const success = document.getElementById(form.dataset.success);
    const button = form.querySelector('button[type="submit"]');
    const phone = form.elements.phone;
    const email = form.elements.email;
    const photos = [];
    const say = (text, kind) => { status.textContent = text; status.dataset.kind = kind || ''; };

    // A link such as /contact?service=peelclear preselects what the visitor needs.
    const wanted = new URLSearchParams(location.search).get('service');
    const service = form.elements.service;
    if (wanted && service) {
      const option = [...service.options].find((o) => o.dataset.key === wanted);
      if (option) service.value = option.value;
    }

    if (input && list) {
      input.addEventListener('change', () => {
        let skipped = 0;
        for (const file of input.files) {
          if (photos.length >= MAX_PHOTOS) { skipped++; continue; }
          photos.push(file);
        }
        input.value = '';
        say(skipped ? `You can add up to ${MAX_PHOTOS} photos. ${skipped} ${skipped === 1 ? 'was' : 'were'} left out.` : '', skipped ? 'error' : '');
        renderPhotos();
      });
    }

    function renderPhotos() {
      list.replaceChildren(...photos.map((file, i) => {
        const item = document.createElement('li');
        const thumb = document.createElement('img');
        thumb.alt = '';
        thumb.src = URL.createObjectURL(file);
        thumb.addEventListener('load', () => URL.revokeObjectURL(thumb.src));
        thumb.addEventListener('error', () => thumb.remove());
        const name = document.createElement('span');
        name.textContent = file.name;
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = 'Remove';
        remove.setAttribute('aria-label', 'Remove ' + file.name);
        remove.addEventListener('click', () => { photos.splice(i, 1); renderPhotos(); input.focus(); });
        item.append(thumb, name, remove);
        return item;
      }));
      list.hidden = !photos.length;
    }

    // Commercial form: a phone number or an email is enough. Retail marks phone required.
    function checkContact() {
      if (!phone || !email || phone.required) return;
      const missing = !phone.value.trim() && !email.value.trim();
      phone.setCustomValidity(missing ? 'Enter a phone number or an email address.' : '');
    }
    phone?.addEventListener('input', checkContact);
    email?.addEventListener('input', checkContact);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      checkContact();
      if (!form.reportValidity()) return;
      button.disabled = true;
      say(photos.length ? 'Preparing your photos...' : 'Sending your request...');
      try {
        const data = new FormData(form);
        data.delete('photos');
        data.set('brand', form.dataset.brand);
        data.set('source_page', location.pathname);
        for (const file of photos) data.append('photos', await shrink(file));
        if (photos.length) say('Sending your request and photos...');
        const res = await fetch(ENDPOINT, { method: 'POST', body: data });
        const out = await res.json().catch(() => ({}));
        if (!res.ok || !out.ok) throw new Error(out.error || 'We could not send your request.');
        success.querySelector('[data-success-name]').textContent = String(data.get('name')).trim().split(/\s+/)[0];
        const note = success.querySelector('[data-success-photos]');
        if (note) note.textContent = out.failedPhotos
          ? `${out.failedPhotos} of your photos did not come through. You can send them when we contact you.`
          : photos.length ? `We received your ${photos.length === 1 ? 'photo' : photos.length + ' photos'} too.` : '';
        form.hidden = true;
        success.hidden = false;
        success.focus({ preventScroll: true });
        success.scrollIntoView({ block: 'center' });
      } catch (err) {
        const offline = err instanceof TypeError;
        say(`${offline ? 'We could not reach the shop. Check your connection and try again.' : err.message} You can also call us at ${PHONE}.`, 'error');
      } finally {
        button.disabled = false;
      }
    });
  }

  // Resize to a sensible size and convert to JPEG. If the browser cannot read the photo
  // (for example an iPhone HEIC photo outside Safari), send the original when it fits.
  async function shrink(file) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const scale = Math.min(1, LONG_EDGE / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close?.();
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
      if (!blob) throw new Error('encode');
      return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
    } catch {
      if (!SENDABLE.includes(file.type)) throw new Error(`${file.name} is not a photo we can open. Please choose a JPG or PNG.`);
      if (file.size > MAX_BYTES) throw new Error(`${file.name} is too large. Please choose a photo under 10 MB.`);
      return file;
    }
  }
})();
