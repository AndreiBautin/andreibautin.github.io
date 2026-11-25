// Content and navigation remain usable when JavaScript is unavailable.
const themeButton = document.querySelector('.theme-toggle');
function setTheme(light) {
  document.body.classList.toggle('light', light);
  themeButton.setAttribute('aria-pressed', String(light));
  themeButton.setAttribute('aria-label', light ? 'Use dark theme' : 'Use light theme');
  document.querySelector('link[rel="icon"]').href = light ? './images/favicon-light.svg?v=outline-1' : './images/favicon.svg?v=outline-1';
  try { localStorage.setItem('portfolio-theme', light ? 'light' : 'dark'); } catch { /* Private mode can refuse persistence. */ }
}
try { setTheme(localStorage.getItem('portfolio-theme') === 'light'); } catch { setTheme(false); }
themeButton.addEventListener('click', () => setTheme(!document.body.classList.contains('light')));
document.getElementById('copy-email').addEventListener('click', async () => {
  const status = document.getElementById('copy-status');
  try { await navigator.clipboard.writeText('andreibautin94@gmail.com'); status.textContent = 'Email copied'; }
  catch { status.textContent = 'Select the email address to copy it.'; }
  setTimeout(() => { status.textContent = ''; }, 3000);
});
const links = [...document.querySelectorAll('nav a[href^="#"]')];
const sections = links.map(link => document.querySelector(link.getAttribute('href')));
let queued = false;
function markSection() {
  queued = false;
  let active = -1;
  sections.forEach((section, index) => { if (section.getBoundingClientRect().top < innerHeight * .4) active = index; });
  links.forEach((link, index) => { if (index === active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); });
}
addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(markSection); } }, { passive: true });
markSection();

// Continuous code rain clipped to the real, accessible name heading.
function connectNameRain() {
  const heading = document.querySelector('.matrix-name');
  const canvas = document.querySelector('.name-rain');
  const context = canvas?.getContext('2d');
  if (!heading || !context) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const mask = document.createElement('canvas'), ink = mask.getContext('2d');
  if (!ink) return;
  const hash = (value, salt) => { const n = Math.sin(value * 127.1 + salt * 311.7) * 43758.5453; return n - Math.floor(n); };
  const symbols = '01ABCDEFGHIJKLMNOPQRSTUVWXYZ<>/{}[]';
  const words = [...heading.querySelectorAll('.name-word')];
  let width = 0, height = 0, frame = 0, previous = -Infinity, visible = false;

  function resize() {
    const box = heading.getBoundingClientRect(), ratio = Math.min(devicePixelRatio, 1.5);
    width = box.width; height = box.height;
    canvas.width = mask.width = Math.ceil(width * ratio);
    canvas.height = mask.height = Math.ceil(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    ink.setTransform(ratio, 0, 0, ratio, 0, 0);
    ink.clearRect(0, 0, width, height); ink.fillStyle = '#fff';
    words.forEach(word => {
      const rect = word.getBoundingClientRect(), style = getComputedStyle(word);
      ink.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      ink.letterSpacing = style.letterSpacing;
      const metrics = ink.measureText(word.textContent);
      const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent;
      const descent = metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent;
      ink.fillText(word.textContent, rect.left - box.left, rect.top - box.top + (rect.height + ascent - descent) / 2);
    });
  }
  function stop() {
    cancelAnimationFrame(frame); frame = 0;
    context.clearRect(0, 0, width, height);
    heading.classList.remove('name-running');
  }
  function draw(now) {
    if (!visible || document.hidden || motion.matches) { stop(); return; }
    frame = requestAnimationFrame(draw);
    if (now - previous < 40) return;
    previous = now;
    const time = now / 1000, cell = Math.max(10, Math.min(18, width / 75));
    const light = document.body.classList.contains('light');
    const colors = light ? ['#0c3c20', '#176a38', '#358151'] : ['#d6ffe1', '#84f9a2', '#28aa55'];
    context.clearRect(0, 0, width, height);
    context.font = `${cell * .9}px "DM Mono", monospace`;
    // Staggered streams never switch the name itself to random letters.
    for (let column = 0; column < Math.ceil(width / cell); column++) {
      const tailLength = 15 + Math.floor(hash(column, 1) * 14);
      const travel = height + tailLength * cell;
      const speed = 55 + hash(column, 2) * 90;
      const head = (time * speed + hash(column, 3) * travel) % travel;
      for (let tail = 0; tail < tailLength; tail++) {
        const y = head - tail * cell;
        if (y < 0 || y > height + cell) continue;
        context.globalAlpha = Math.pow(1 - tail / tailLength, .65);
        context.fillStyle = colors[tail === 0 ? 0 : tail < 4 ? 1 : 2];
        context.fillText(symbols[Math.floor(hash(column * 31 + tail, Math.floor(time * 8)) * symbols.length)], column * cell, y);
      }
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'destination-in';
    context.drawImage(mask, 0, 0, width, height);
    context.globalCompositeOperation = 'source-over';
  }
  function resume() {
    stop();
    if (!visible || document.hidden || motion.matches) return;
    heading.classList.add('name-running'); previous = -Infinity;
    frame = requestAnimationFrame(draw);
  }
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; resume(); });
  const sizeObserver = new ResizeObserver(resize);
  resize(); observer.observe(heading); sizeObserver.observe(heading);
  document.addEventListener('visibilitychange', resume);
  motion.addEventListener('change', resume);
  addEventListener('pageshow', resume);
  addEventListener('pagehide', event => { stop(); if (!event.persisted) { observer.disconnect(); sizeObserver.disconnect(); } });
}
document.fonts.ready.then(connectNameRain);
