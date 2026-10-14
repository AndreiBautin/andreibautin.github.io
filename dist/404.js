// Runs before first paint so a light-theme visitor does not see a dark flash.
try { if (localStorage.getItem('portfolio-theme') === 'light') document.body.classList.add('light'); } catch {}
