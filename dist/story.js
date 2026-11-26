// Optional stage enhancements. The single-screen application works without them.
let intro = null, disposed = false;
import('./intro.js?v=854ce347c4').then(module => {
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
addEventListener('pagehide', event => { if (!event.persisted) { disposed = true; intro?.dispose(); } });
