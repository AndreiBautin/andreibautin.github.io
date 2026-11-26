// Career/contact enhancement. The timeline, resume link, contact links and
// email address are all useful HTML without this module; it only adds the
// disclosure behaviour, selected states, one-shot pulses and copy-email.
// Contract: docs/STORY-CONTRACT.md, behaviour and selectors: docs/CAREER.md.

const KEY = /^[a-z][a-z0-9-]{0,31}$/;
const REDUCE = '(prefers-reduced-motion: reduce)';
export const TIMINGS = Object.freeze({ stepPulse: 1300, contactPulse: 1000, copied: 4000, failed: 10000 });
export const MESSAGES = Object.freeze({
  copied: 'Email address copied to the clipboard.',
  selected: (address) => `Could not copy automatically. ${address} is selected; press Ctrl+C or Cmd+C to copy it.`,
  manual: (address) => `Could not copy automatically. Select ${address} to copy it.`,
});

// Pure helpers, exported for scripts/career.test.cjs.
export function validKey(value) { return typeof value === 'string' && KEY.test(value); }

// The step the markup marks expanded wins; otherwise the first step opens.
export function initialKey(steps) {
  if (!Array.isArray(steps) || steps.length === 0) return null;
  const declared = steps.find((s) => s && s.expanded && validKey(s.key));
  if (declared) return declared.key;
  const first = steps.find((s) => s && validKey(s.key));
  return first ? first.key : null;
}

// Roving focus between step buttons; returns the index to focus or -1.
export function nextIndex(current, key, length) {
  if (!Number.isInteger(length) || length <= 0) return -1;
  const at = Number.isInteger(current) && current >= 0 && current < length ? current : 0;
  switch (key) {
    case 'ArrowRight': case 'ArrowDown': return (at + 1) % length;
    case 'ArrowLeft': case 'ArrowUp': return (at - 1 + length) % length;
    case 'Home': return 0;
    case 'End': return length - 1;
    default: return -1;
  }
}

// A mailto: href to its bare address, or '' when it is not a plain address.
export function emailFromHref(href) {
  if (typeof href !== 'string' || !href.toLowerCase().startsWith('mailto:')) return '';
  const address = href.slice(7).split('?')[0].trim();
  const at = address.indexOf('@');
  if (at < 1 || at !== address.lastIndexOf('@') || at === address.length - 1 || /[\s<>"',;]/.test(address)) return '';
  return address;
}

function scope() {
  const listeners = [];
  const timers = new Set();
  return {
    on(target, type, fn, options) { if (!target || !target.addEventListener) return; target.addEventListener(type, fn, options); listeners.push([target, type, fn, options]); },
    later(fn, ms) { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; },
    cancel(id) { if (id != null) { clearTimeout(id); timers.delete(id); } },
    dispose() { for (const [t, type, fn, options] of listeners.splice(0)) t.removeEventListener(type, fn, options); for (const id of timers) clearTimeout(id); timers.clear(); },
  };
}

// Restart a one-shot CSS animation by removing the class, reading layout and
// adding it again; the timer clears it if animationend never arrives.
function pulse(s, element, name, ms, slot) {
  s.cancel(slot.timer);
  element.classList.remove(name);
  void element.offsetWidth;
  element.classList.add(name);
  slot.timer = s.later(() => { element.classList.remove(name); slot.timer = null; }, ms);
}

function mountTimeline(section, s, motion) {
  const shell = section.querySelector('.career-shell');
  const path = section.querySelector('.career-path');
  const doc = section.ownerDocument;
  const seen = new Set();
  const steps = [];
  for (const button of section.querySelectorAll('button[data-career-step]')) {
    const key = button.getAttribute('data-career-step');
    if (!validKey(key) || seen.has(key)) continue;
    const controls = button.getAttribute('aria-controls');
    let panel = controls && doc && doc.getElementById ? doc.getElementById(controls) : null;
    if (!panel || !section.contains(panel)) panel = section.querySelector(`[data-career-detail="${key}"]`);
    if (!panel) continue;
    seen.add(key);
    steps.push({ key, button, panel, item: button.closest('.career-step') || button.parentElement, wasHidden: panel.hidden, wasExpanded: button.getAttribute('aria-expanded'), slot: { timer: null } });
  }
  if (!steps.length) return { motion() {}, restore() {} };

  let active = null;
  const select = (key, announce) => {
    active = key;
    steps.forEach((step, index) => {
      const open = step.key === key;
      step.button.setAttribute('aria-expanded', String(open));
      step.panel.hidden = !open;
      if (step.item) step.item.classList.toggle('is-selected', open);
      if (open && path) path.setAttribute('data-career-index', String(index));
      if (open && announce && step.item && !motion.reduced) pulse(s, step.item, 'is-pulsing', TIMINGS.stepPulse, step.slot);
    });
    if (!path) return;
    if (key) path.setAttribute('data-career-active', key);
    else { path.removeAttribute('data-career-active'); path.removeAttribute('data-career-index'); }
  };
  select(initialKey(steps.map((st) => ({ key: st.key, expanded: st.wasExpanded === 'true' }))), false);

  steps.forEach((step, index) => {
    s.on(step.button, 'click', () => select(active === step.key ? null : step.key, true));
    s.on(step.button, 'keydown', (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const to = nextIndex(index, event.key, steps.length);
      if (to < 0) return;
      event.preventDefault();
      steps[to].button.focus();
    });
  });

  const host = shell || section;
  host.setAttribute('data-career-ready', 'true');
  const reveal = () => host.classList.add('is-revealed');
  const view = doc && doc.defaultView;
  let observer = null;
  if (motion.reduced || !view || typeof view.IntersectionObserver !== 'function') reveal();
  else {
    observer = new view.IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { reveal(); observer.disconnect(); observer = null; }
    }, { threshold: 0.2 });
    observer.observe(host);
  }

  return {
    motion(reduced) {
      host.setAttribute('data-career-motion', reduced ? 'reduce' : 'full');
      if (reduced) { reveal(); if (observer) { observer.disconnect(); observer = null; } for (const st of steps) { s.cancel(st.slot.timer); st.item && st.item.classList.remove('is-pulsing'); } }
    },
    restore() {
      if (observer) observer.disconnect();
      for (const st of steps) {
        st.panel.hidden = st.wasHidden;
        if (st.wasExpanded == null) st.button.removeAttribute('aria-expanded'); else st.button.setAttribute('aria-expanded', st.wasExpanded);
        if (st.item) st.item.classList.remove('is-selected', 'is-pulsing');
      }
      host.removeAttribute('data-career-ready'); host.removeAttribute('data-career-motion'); host.classList.remove('is-revealed');
      if (path) { path.removeAttribute('data-career-active'); path.removeAttribute('data-career-index'); }
    },
  };
}

function mountContact(section, s, motion) {
  const doc = section.ownerDocument;
  const orbit = section.querySelector('.contact-orbit');
  const nodes = orbit ? [...orbit.querySelectorAll('.contact-node[data-contact-node]')].filter((n) => validKey(n.getAttribute('data-contact-node'))) : [];
  const orbitSlot = { timer: null };
  if (orbit) orbit.setAttribute('data-contact-ready', 'true');

  for (const node of nodes) {
    const key = node.getAttribute('data-contact-node');
    const slot = { timer: null };
    const enter = () => {
      if (orbit.getAttribute('data-contact-active') === key) return;
      orbit.setAttribute('data-contact-active', key);
      if (motion.reduced) return;
      pulse(s, node, 'is-pulsing', TIMINGS.contactPulse, slot);
      pulse(s, orbit, 'is-signaling', TIMINGS.contactPulse, orbitSlot);
    };
    const leave = (event) => {
      if (event && event.relatedTarget && node.contains(event.relatedTarget)) return;
      if (event && event.type === 'pointerleave' && doc.activeElement && node.contains(doc.activeElement)) return;
      if (orbit.getAttribute('data-contact-active') === key) orbit.removeAttribute('data-contact-active');
    };
    s.on(node, 'pointerenter', enter);
    s.on(node, 'focusin', enter);
    s.on(node, 'pointerleave', leave);
    s.on(node, 'focusout', leave);
  }

  // Copy email. Success is only announced after writeText resolves; a late
  // answer from an earlier click or after dispose is ignored.
  const button = doc.getElementById ? doc.getElementById('copy-email') : null;
  const status = doc.getElementById ? doc.getElementById('copy-status') : null;
  const link = section.querySelector('.contact-node[data-contact-node="email"]') || section.querySelector('a[href^="mailto:"]');
  const address = link ? emailFromHref(link.getAttribute('href')) : '';
  let attempt = 0;
  let clearTimer = null;
  let target = null;
  const settle = (state, text, ms) => {
    s.cancel(clearTimer);
    if (button) { button.removeAttribute('aria-busy'); if (state) button.setAttribute('data-copy-state', state); else button.removeAttribute('data-copy-state'); }
    if (status) status.textContent = text;
    if (state) clearTimer = s.later(() => { clearTimer = null; settle(null, '', 0); if (target) target.classList.remove('is-copy-target'); }, ms);
  };
  const selectAddress = () => {
    const view = doc.defaultView;
    target = [link, section.querySelector('.email')].find((el) => el && (el.textContent || '').includes(address)) || null;
    if (!target || !view || !view.getSelection || !doc.createRange) return false;
    try {
      const range = doc.createRange();
      range.selectNodeContents(target);
      const selection = view.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      target.classList.add('is-copy-target');
      return true;
    } catch { return false; }
  };
  const fail = () => settle('failed', selectAddress() ? MESSAGES.selected(address) : MESSAGES.manual(address), TIMINGS.failed);
  if (button && status && address) {
    s.on(button, 'click', async () => {
      const mine = ++attempt;
      s.cancel(clearTimer);
      if (target) target.classList.remove('is-copy-target');
      button.setAttribute('aria-busy', 'true');
      const clipboard = doc.defaultView && doc.defaultView.navigator && doc.defaultView.navigator.clipboard;
      if (!clipboard || typeof clipboard.writeText !== 'function') { fail(); return; }
      let ok = false;
      try { await clipboard.writeText(address); ok = true; } catch { ok = false; }
      if (mine !== attempt) return;
      if (ok) settle('copied', MESSAGES.copied, TIMINGS.copied); else fail();
    });
  }

  return {
    motion(reduced) {
      if (orbit) orbit.setAttribute('data-contact-motion', reduced ? 'reduce' : 'full');
      if (reduced) { for (const n of nodes) n.classList.remove('is-pulsing'); if (orbit) orbit.classList.remove('is-signaling'); }
    },
    restore() {
      attempt += 1;
      if (button) { button.removeAttribute('aria-busy'); button.removeAttribute('data-copy-state'); }
      if (target) target.classList.remove('is-copy-target');
      for (const n of nodes) n.classList.remove('is-pulsing');
      if (orbit) for (const name of ['data-contact-ready', 'data-contact-active', 'data-contact-motion']) orbit.removeAttribute(name);
      if (orbit) orbit.classList.remove('is-signaling');
    },
  };
}

export function mountCareer(root = document) {
  const s = scope();
  const parts = [];
  let disposed = false;
  try {
    const find = (id) => (root && root.querySelector ? root.querySelector(`#${id}`) : null);
    const view = (root && (root.defaultView || (root.ownerDocument && root.ownerDocument.defaultView))) || null;
    const query = view && typeof view.matchMedia === 'function' ? view.matchMedia(REDUCE) : null;
    const motion = { reduced: Boolean(query && query.matches) };
    const career = find('career');
    const contact = find('contact');
    if (career) parts.push(mountTimeline(career, s, motion));
    if (contact) parts.push(mountContact(contact, s, motion));
    const apply = () => { motion.reduced = Boolean(query && query.matches); for (const p of parts) p.motion(motion.reduced); };
    apply();
    if (query) {
      if (typeof query.addEventListener === 'function') s.on(query, 'change', apply);
      else if (typeof query.addListener === 'function') { query.addListener(apply); parts.push({ motion() {}, restore() { query.removeListener(apply); } }); }
    }
  } catch {
    // A broken enhancement must leave the HTML as it was.
    s.dispose();
    for (const p of parts.splice(0)) { try { p.restore(); } catch { /* keep going */ } }
  }
  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      s.dispose();
      for (const p of parts.splice(0)) p.restore();
    },
  };
}
