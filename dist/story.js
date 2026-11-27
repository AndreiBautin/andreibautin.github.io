// Optional stage enhancements. The single-screen application works without them.
let intro = null, workUI = null, disposed = false;
const professional = import('./work-ui.js?v=d84fad3d13').then(module => {
  if (disposed) return;
  workUI = module.mountWorkUI(document);
}).catch(() => {});
professional.then(() => import('./intro.js?v=3f3887eac1')).then(module => {
  if (disposed) return;
  dispatchEvent(new CustomEvent('portfolio:work-ready'));
  intro = module.mountIntro(document);
  const replay = document.getElementById('replay-intro');
  replay.hidden = false;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const available = () => { replay.disabled = motion.matches || !!navigator.connection?.saveData; };
  motion.addEventListener('change', available);
  navigator.connection?.addEventListener('change', available);
  available();
  addEventListener('pagehide', event => {
    if (event.persisted) return;
    motion.removeEventListener('change', available);
    navigator.connection?.removeEventListener('change', available);
  });
}).catch(() => { if (!disposed) dispatchEvent(new CustomEvent('portfolio:work-ready')); });
addEventListener('pagehide', event => { if (!event.persisted) { disposed = true; intro?.dispose(); workUI?.dispose(); } });
