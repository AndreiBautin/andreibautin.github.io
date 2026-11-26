// Optional stage enhancements. The single-screen application works without them.
let intro = null, workUI = null, disposed = false;
import('./work-ui.js?v=394b87910f').then(module => {
  if (disposed) return;
  workUI = module.mountWorkUI(document);
  dispatchEvent(new CustomEvent('portfolio:work-ready'));
}).catch(() => {});
import('./intro.js?v=c9a90e5d46').then(module => {
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
