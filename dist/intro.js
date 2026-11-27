// File pair: intro.js, intro-state.js and intro.css are coupled adapters.
import { INTRO_BEATS, shouldStartIntro, createIntroState, advanceIntro, pauseIntro, interruptIntro, introBeat } from './intro-state.js?v=b829e54b6e';

export function mountIntro(root = document) {
  const doc = root.ownerDocument ?? root;
  const win = doc.defaultView;
  const overlay = root.querySelector('#portfolio-intro');
  const replayButton = root.querySelector('#replay-intro');
  const message = overlay?.querySelector('#intro-message');
  const caption = overlay?.querySelector('#intro-caption');
  const step = overlay?.querySelector('#intro-step');
  const skip = overlay?.querySelector('#skip-intro');
  const images = [...(overlay?.querySelectorAll('[data-intro-image]') ?? [])];
  const noop = { replay() {}, dispose() {} };
  if (!win || !overlay || !message || !caption || !skip || images.length !== 3) {
    if (overlay) overlay.hidden = true;
    return noop;
  }

  const motion = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  const connection = win.navigator.connection;
  const storageKey = 'portfolio-intro-seen-v2';
  let seen = false;
  try { seen = win.sessionStorage.getItem(storageKey) === '1'; } catch { seen = true; }
  let state = interruptIntro(createIntroState());
  let frame = null;
  let rendered = null;
  let initialScene = 0;
  let dispatching = false;
  let disposed = false;
  const removers = [];
  function listen(target, type, handler, options) {
    target?.addEventListener(type, handler, options);
    removers.push(() => target?.removeEventListener(type, handler, options));
  }
  function scene(index) {
    dispatching = true;
    try { win.dispatchEvent(new win.CustomEvent('portfolio:scene', { detail: { index, showcase: state.active } })); }
    finally { dispatching = false; }
  }
  function selectedScene() {
    const mode = root.querySelector('#work-panel')?.getAttribute('data-work-mode');
    const work = ['knowledge', 'replication', 'payments', 'career', 'contact'].indexOf(mode);
    if (work >= 0) return 4 + work;
    const value = Number(root.querySelector('[data-scene][aria-pressed="true"]')?.dataset.scene);
    return Number.isInteger(value) && value >= 0 && value <= 3 ? value : 0;
  }
  function finish() {
    if (!state.active) return;
    stop(!doc.body?.classList.contains('work-ui-ready'));
    win.dispatchEvent(new win.CustomEvent('portfolio:intro-complete'));
  }
  function stop(restore = true) {
    const active = state.active;
    state = interruptIntro(state);
    if (frame !== null) win.cancelAnimationFrame(frame);
    frame = null;
    overlay.hidden = true;
    doc.body?.classList.remove('intro-playing');
    delete overlay.dataset.introBeat;
    if (doc.activeElement && overlay.contains(doc.activeElement)) replayButton?.focus({ preventScroll: true });
    if (active && restore) scene(initialScene);
  }
  function paint() {
    const beat = introBeat(state);
    if (!beat || beat.key === rendered) return;
    rendered = beat.key;
    overlay.dataset.introBeat = beat.key;
    message.textContent = beat.message;
    caption.textContent = beat.caption;
    if (step) step.textContent = `${beat.section} / ${INTRO_BEATS.indexOf(beat) + 1} of ${INTRO_BEATS.length}`;
    images.forEach(img => { img.hidden = img.dataset.introImage !== beat.key; });
    scene(beat.index);
  }
  function tick(now) {
    frame = null;
    if (!state.active || disposed) return;
    if (doc.hidden) { state = pauseIntro(state); return; }
    const next = advanceIntro(state, now);
    if (!next.active) { finish(); return; }
    state = next;
    try { paint(); frame = win.requestAnimationFrame(tick); } catch { stop(); }
  }
  function replay() {
    if (disposed) return;
    stop();
    // An explicit replay still respects the visitor's live accessibility policy.
    if (motion?.matches || connection?.saveData) return;
    initialScene = selectedScene();
    state = createIntroState();
    rendered = null;
    try {
      win.sessionStorage.setItem(storageKey, '1');
    } catch { /* Explicit replay works even with storage denied. */ }
    try {
      overlay.hidden = false;
      doc.body?.classList.add('intro-playing');
      paint();
      if (!doc.hidden) frame = win.requestAnimationFrame(tick);
    } catch { stop(); }
  }
  function outside(event) {
    if (!state.active || overlay.contains(event.target)) return;
    if (event.type === 'keydown' && event.key === 'Tab') return;
    if (event.type === 'keydown' && event.key === 'Escape') { event.preventDefault(); finish(); return; }
    if (replayButton?.contains(event.target)) return;
    // Capture restores before the control's own handler chooses another scene.
    stop();
  }
  listen(skip, 'click', finish);
  listen(overlay, 'keydown', event => { if (event.key === 'Escape') { event.preventDefault(); finish(); } });
  listen(replayButton, 'click', replay);
  for (const type of ['pointerdown', 'keydown', 'click', 'wheel']) listen(doc, type, outside, { capture: true, passive: type !== 'keydown' });
  listen(win, 'portfolio:scene', () => { if (!dispatching) stop(false); });
  listen(win, 'portfolio:graphics-ready', () => { if (state.active) scene(introBeat(state).index); });
  listen(win, 'hashchange', () => stop(false));
  listen(win, 'pagehide', () => stop());
  listen(doc, 'visibilitychange', () => {
    if (!state.active) return;
    state = pauseIntro(state);
    if (frame !== null) win.cancelAnimationFrame(frame);
    frame = null;
    if (!doc.hidden) frame = win.requestAnimationFrame(tick);
  });
  listen(motion, 'change', () => { if (motion.matches) stop(); });
  listen(connection, 'change', () => { if (connection.saveData) stop(); });
  if (shouldStartIntro({ seen, reducedMotion: motion?.matches, saveData: connection?.saveData, hash: win.location.hash })) replay();
  else overlay.hidden = true;
  return { replay, dispose() { stop(); disposed = true; removers.forEach(remove => remove()); } };
}
