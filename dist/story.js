// Optional stage enhancements. The single-screen application works without them.
let intro = null, workUI = null, disposed = false;
const professional = import('./work-ui.js?v=d84fad3d13').then(module => {
  if (disposed) return;
  workUI = module.mountWorkUI(document);
  dispatchEvent(new CustomEvent('portfolio:work-ready'));
}).catch(() => {});
professional.then(() => import('./intro.js?v=6f36698c48')).then(module => {
  if (disposed) return;
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
}).catch(() => {});
addEventListener('pagehide', event => { if (!event.persisted) { disposed = true; intro?.dispose(); workUI?.dispose(); } });
