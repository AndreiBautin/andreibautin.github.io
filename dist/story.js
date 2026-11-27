// Optional stage enhancements. The single-screen application works without them.
let workUI = null, disposed = false;
import('./work-ui.js?v=af6e71f3fc').then(module => {
  if (disposed) return;
  workUI = module.mountWorkUI(document);
  dispatchEvent(new CustomEvent('portfolio:work-ready'));
}).catch(() => {});
addEventListener('pagehide', event => { if (!event.persisted) { disposed = true; workUI?.dispose(); } });
