/* Corrimar site-v2 app.js (v3 pass, INTERNAL DRAFT)
 * - Validation + counter maths: PreorderCore (counter.js), same file as demo/ and landing-v1/.
 *   Email is the reservation contact; phone is optional with its own text opt-in.
 * - Source tag: PreorderSource (source.js). ?src=sample (or /s) greets sample scanners; source saved per entry.
 * - SHOW_LIVE_COUNT (config.js) keeps "X of N reserved" hidden until a shared backend exists.
 * - Storage: localStorage only (BACKEND "local"). No network, no payment.
 */
(() => {
  'use strict';
  const CFG = window.PREORDER_CONFIG || {};
  const Core = window.PreorderCore;
  const Src = window.PreorderSource;
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const canMove = () => !reduce.matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const KEY = CFG.STORAGE_KEY || 'corrimar.v2.batch01.entries';
  const WKEY = CFG.WAITLIST_KEY || 'corrimar.v2.batch01.waitlist';
  const SKEY = CFG.SOURCE_KEY || 'corrimar.v2.src';
  const MAX = Math.max(1, Number(CFG.MAX_PER_ORDER) || 3);
  const BATCH = CFG.BATCH_LABEL || 'Batch 01';
  const LIVE = CFG.SHOW_LIVE_COUNT === true;

  /* ---------- source ---------- */
  let stored = '';
  try { stored = sessionStorage.getItem(SKEY) || ''; } catch (e) {}
  const source = Src ? Src.parseSource(location.search, stored) : 'direct';
  try { if (source !== 'direct') sessionStorage.setItem(SKEY, source); } catch (e) {}
  root.classList.toggle('from-sample', Src ? Src.isSample(source, CFG.SAMPLE_SOURCES) : source === 'sample');
  root.dataset.source = source;
  $$('[data-source-input]').forEach((i) => { i.value = source; });
  $$('[data-live-count]').forEach((el) => { el.hidden = !LIVE; });

  /* ---------- storage ---------- */
  const read = (k) => { try { const v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
  const write = (k, list) => { try { localStorage.setItem(k, JSON.stringify(list)); return true; } catch (e) { return false; } };
  const status = () => Core.computeStatus(read(KEY), CFG);

  /* ---------- rendering ---------- */
  let counted = false;
  function countUp(el) {
    if (!canMove() || counted) { el.textContent = String(status().reserved); return; }
    const t0 = performance.now(), dur = 900;
    const step = (t) => {
      const p = clamp((t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(status().reserved * e)); // a reservation made mid-animation wins
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function render() {
    const st = status();
    $$('[data-target]').forEach((el) => { el.textContent = String(st.target); });
    $$('[data-left]').forEach((el) => { el.textContent = String(st.remaining); });
    $$('[data-reserved]').forEach((el) => { if (el.hasAttribute('data-countup') && !counted) return; el.textContent = String(st.reserved); });
    $$('[data-bar]').forEach((el) => { el.style.setProperty('--fill', String(st.percent / 100)); });
    const full = st.full;
    $$('[data-when="open"]').forEach((el) => { el.hidden = full; });
    $$('[data-when="full"]').forEach((el) => { el.hidden = !full; });
    const lede = $('[data-lede]');
    if (lede) lede.textContent = full ? `Every jar in ${BATCH} is held.` : `${st.target} jars in ${BATCH} · up to ${MAX} per person`;
    const batchLine = $('[data-batch-line]');
    if (batchLine) batchLine.textContent = full ? `${BATCH} · Waitlist open` : `${BATCH} · Reservations open`;
    const rForm = $('#reserveForm'), wForm = $('#waitForm'), done = $('[data-done]');
    if (done && done.hidden) { rForm.hidden = full; wForm.hidden = !full; }
    $$('input[name="quantity"]').forEach((r) => { r.disabled = Number(r.value) > st.remaining; });
    const chosen = $('input[name="quantity"]:checked');
    if (chosen && chosen.disabled && st.remaining > 0) { const p = $(`input[name="quantity"][value="${Math.min(st.remaining, MAX)}"]`); if (p) p.checked = true; }
    $$('[data-cta], .dock .btn').forEach((a) => { a.textContent = full ? 'Join the waitlist' : 'Reserve my full-size jar'; });
    syncLabel();
    return st;
  }
  function syncLabel() {
    const q = Number(($('input[name="quantity"]:checked') || {}).value) || 1;
    const lab = $('[data-submit-label]');
    if (lab) lab.textContent = `Reserve ${q} jar${q === 1 ? '' : 's'}`;
  }

  /* ---------- form helpers ---------- */
  const FIELDS = ['name', 'email', 'phone', 'quantity', 'consent', 'textOptIn'];
  function errEl(form, field) {
    const input = form.querySelector(`[name="${field}"]`);
    if (field === 'quantity') return form.querySelector('#r-qty-err');
    return input && document.getElementById(input.id + '-err');
  }
  function setErr(form, field, msg) {
    const input = form.querySelector(`[name="${field}"]`);
    const err = errEl(form, field);
    if (err) { err.textContent = msg || ''; err.hidden = !msg; }
    if (input && input.type !== 'radio') input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  function clearErrs(form) { FIELDS.forEach((f) => setErr(form, f, '')); const s = form.querySelector('.form__status'); if (s) s.textContent = ''; }

  // Returns {ok, errors, entry}. Core checks name, email (as the contact), quantity, consent and batch room.
  function validate(form, withQty, st) {
    const email = form.elements.email.value.trim();
    const r = Core.validateEntry({
      name: form.elements.name.value,
      contact: email,
      quantity: withQty ? (form.querySelector('input[name="quantity"]:checked') || {}).value : '1',
      notes: '',
      consent: form.elements.consent.checked,
    }, st, CFG);
    const errors = { ...r.errors };
    if (errors.contact) { errors.email = email ? 'Enter a valid email, like name@example.com.' : 'Please enter your email.'; delete errors.contact; }
    else if (email && Core.classifyContact(email) !== 'email') errors.email = 'Enter a valid email, like name@example.com.';
    if (errors.consent) errors.consent = 'Please check the box so we can email you about it.';
    let phone = '', textOptIn = false;
    if (form.elements.phone) {
      phone = form.elements.phone.value.trim();
      textOptIn = !!(form.elements.textOptIn && form.elements.textOptIn.checked);
      if (phone && Core.classifyContact(phone) !== 'phone') errors.phone = 'Enter a phone number with 10 to 15 digits, or leave it blank.';
      if (textOptIn && !phone) errors.textOptIn = 'Add a phone number to get texts, or uncheck this box.';
    }
    const ok = Object.keys(errors).length === 0;
    return { ok, errors, entry: ok ? { ...r.entry, email: r.entry.contact, phone, textOptIn } : null };
  }
  function showErrors(form, errors) {
    let first = null;
    FIELDS.forEach((f) => { if (errors[f]) { setErr(form, f, errors[f]); if (!first) first = form.querySelector(`[name="${f}"]`); } });
    if (errors.form) form.querySelector('.form__status').textContent = errors.form;
    if (first) first.focus();
  }

  // Errors appear on submit only; typing a fix clears them (nothing shifts mid-tap).
  $$('form[data-form]').forEach((form) => {
    ['name', 'email', 'phone'].forEach((f) => {
      const el = form.elements[f]; if (!el) return;
      el.addEventListener('input', () => {
        if (el.getAttribute('aria-invalid') !== 'true') return;
        const r = validate(form, false, null);
        if (!r.errors[f]) setErr(form, f, '');
      });
    });
    ['consent', 'textOptIn'].forEach((f) => {
      const el = form.elements[f]; if (!el) return;
      el.addEventListener('change', () => { if (el.getAttribute('aria-invalid') === 'true' && !validate(form, false, null).errors[f]) setErr(form, f, ''); });
    });
  });

  /* ---------- reserve ---------- */
  const rForm = $('#reserveForm');
  const wForm = $('#waitForm');
  const done = $('[data-done]');
  rForm.addEventListener('change', (e) => { if (e.target.name === 'quantity') { syncLabel(); setErr(rForm, 'quantity', ''); } });
  rForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrs(rForm);
    const list = read(KEY);
    const r = validate(rForm, true, Core.computeStatus(list, CFG));
    if (r.ok) {
      const mine = list.filter((x) => String(x.email || x.contact).toLowerCase() === r.entry.email.toLowerCase()).reduce((n, x) => n + (Number(x.quantity) || 0), 0);
      if (mine + r.entry.quantity > MAX) { r.ok = false; r.errors.quantity = `That email already holds ${mine} jar${mine === 1 ? '' : 's'}. The limit is ${MAX} per person.`; }
    }
    if (!r.ok) { showErrors(rForm, r.errors); return; }
    const entry = { ...r.entry, source, batch: BATCH, at: new Date().toISOString() };
    list.push(entry);
    if (!write(KEY, list)) { rForm.querySelector('.form__status').textContent = 'This browser would not save the reservation. Try again in a normal window.'; return; }
    counted = true;
    render();
    $('[data-done-title]').textContent = entry.quantity === 1 ? 'Your jar is held.' : `Your ${entry.quantity} jars are held.`;
    $('[data-done-text]').textContent = `Thank you, ${entry.name.split(' ')[0]}. We will email ${entry.email} before ${BATCH} ships. No payment today.`;
    rForm.hidden = true; wForm.hidden = true;
    done.hidden = false; done.focus();
    document.dispatchEvent(new CustomEvent('preorder:reserved', { detail: entry }));
  });

  /* ---------- waitlist ---------- */
  wForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrs(wForm);
    const r = validate(wForm, false, null);
    if (!r.ok) { showErrors(wForm, r.errors); return; }
    const list = read(WKEY);
    const entry = { name: r.entry.name, email: r.entry.email, consent: true, source, batch: BATCH, at: new Date().toISOString() };
    list.push(entry);
    if (!write(WKEY, list)) { wForm.querySelector('.form__status').textContent = 'This browser would not save your details. Try again in a normal window.'; return; }
    $('[data-done-title]').textContent = 'You are on the waitlist.';
    $('[data-done-text]').textContent = `Thank you, ${entry.name.split(' ')[0]}. We will email ${entry.email} when the next batch opens.`;
    $('[data-again]').textContent = 'Add someone else';
    wForm.hidden = true; done.hidden = false; done.focus();
    document.dispatchEvent(new CustomEvent('preorder:waitlisted', { detail: entry }));
  });

  $('[data-again]').addEventListener('click', () => {
    [rForm, wForm].forEach((f) => { f.reset(); clearErrs(f); });
    $('[data-again]').textContent = 'Reserve for someone else';
    done.hidden = true;
    render();
    (rForm.hidden ? wForm : rForm).elements.name.focus();
  });

  render();

  /* ---------- live count (only when enabled) ---------- */
  const countEl = $('[data-countup]');
  const counter = $('.count[data-live-count]');
  if (LIVE && countEl && counter) {
    if (!('IntersectionObserver' in window) || !canMove()) { countUp(countEl); counted = true; }
    else {
      const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { countUp(countEl); counted = true; io.disconnect(); } }, { threshold: 0.4 });
      io.observe(counter);
    }
  }

  /* ---------- reveals ---------- */
  const reveals = $$('[data-reveal]');
  if (!canMove() || !('IntersectionObserver' in window)) reveals.forEach((el) => el.classList.add('is-in'));
  else {
    const io = new IntersectionObserver((es) => es.forEach((x) => { if (x.isIntersecting) { x.target.classList.add('is-in'); io.unobserve(x.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    reveals.forEach((el) => io.observe(el));
  }

  /* ---------- scroll-linked: hero drift + phone dock ---------- */
  const drift = $('[data-drift]');
  const dock = $('[data-dock]');
  const cta = $('[data-cta]');
  const reserve = $('#reserve');
  let ticking = false;
  function frame() {
    ticking = false;
    const vh = innerHeight;
    if (canMove() && drift) {
      const r = drift.getBoundingClientRect();
      const p = clamp(-r.top / Math.max(1, r.height), 0, 1);
      drift.style.transform = `translate3d(0, ${(p * 20).toFixed(1)}px, 0)`;
    }
    if (dock && cta && reserve) {
      const ctaGone = cta.getBoundingClientRect().bottom < 0;          // the hero button has scrolled away
      const rr = reserve.getBoundingClientRect();
      const formOnScreen = rr.top < vh * 0.9 && rr.bottom > vh * 0.2;  // hide while the form is on screen
      const on = ctaGone && !formOnScreen;
      dock.classList.toggle('is-on', on);
      dock.setAttribute('aria-hidden', on ? 'false' : 'true');
      const a = dock.querySelector('a'); if (a) a.tabIndex = on ? 0 : -1;
    }
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  reduce.addEventListener?.('change', () => { root.classList.toggle('motion', canMove()); if (!canMove()) { reveals.forEach((el) => el.classList.add('is-in')); if (drift) drift.style.transform = ''; } onScroll(); });
  frame();

  addEventListener('storage', (e) => { if (e.key === KEY) { counted = true; render(); } });
})();
