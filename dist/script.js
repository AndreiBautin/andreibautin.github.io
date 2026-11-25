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

// The real heading stays in the document; this canvas is decorative only.
// One entrance, then a short highlight every twelve seconds while visible.
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
  let width = 0, height = 0, ratio = 1, lines = [];
  let frame = 0, timer = 0, start = null, previous = -Infinity;
  let visible = false, entered = false, entrance = false;

  function resize() {
    const box = heading.getBoundingClientRect();
    width = box.width; height = box.height; ratio = Math.min(devicePixelRatio, 2);
    canvas.width = mask.width = Math.ceil(width * ratio);
    canvas.height = mask.height = Math.ceil(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    ink.setTransform(ratio, 0, 0, ratio, 0, 0);
    lines = words.map(word => {
      const rect = word.getBoundingClientRect(), style = getComputedStyle(word);
      ink.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const metrics = ink.measureText(word.textContent);
      const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent;
      const descent = metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent;
      return { text: word.textContent, x: rect.left - box.left, y: rect.top - box.top + (rect.height + ascent - descent) / 2,
        font: ink.font, tracking: style.letterSpacing };
    });
  }
  function clear() {
    cancelAnimationFrame(frame); clearTimeout(timer); start = null;
    context.clearRect(0, 0, width, height);
    heading.classList.remove('name-running');
  }
  function schedule() {
    clearTimeout(timer);
    if (visible && !document.hidden && !motion.matches) timer = setTimeout(() => play(false), 12000);
  }
  function draw(now) {
    if (!visible || document.hidden || motion.matches) { clear(); return; }
    if (start === null) start = now;
    const age = (now - start) / 1000, duration = entrance ? 2.5 : .65;
    if (age >= duration) { clear(); schedule(); return; }
    frame = requestAnimationFrame(draw);
    if (now - previous < 40) return;
    previous = now;
    ink.clearRect(0, 0, width, height);
    ink.fillStyle = '#fff';
    // Resolve each character once; width and the accessible name never change.
    lines.forEach((line, row) => {
      ink.font = line.font; ink.letterSpacing = line.tracking;
      const text = [...line.text].map((letter, column) => {
        const settle = .4 + column * .13 + row * .28;
        return !entrance || age >= settle ? letter : symbols[Math.floor(hash(column + row * 17, Math.floor(age * 16)) * symbols.length)];
      }).join('');
      ink.fillText(text, line.x, line.y);
    });
    context.clearRect(0, 0, width, height);
    const light = document.body.classList.contains('light');
    const colors = light ? ['#164f2c', '#176a38', '#216b3b'] : ['#d6ffe1', '#8bf2a7', '#3fbc6b'];
    context.fillStyle = light ? '#24643a' : '#50b975';
    context.globalAlpha = entrance ? .42 : .1;
    context.fillRect(0, 0, width, height);
    context.globalAlpha = 1;
    const cell = Math.max(9, width / 45), tick = Math.floor(age * 18);
    context.font = `${cell * .9}px "DM Mono", monospace`;
    for (let column = 0; column < Math.ceil(width / cell); column++) {
      const speed = 80 + hash(column, 2) * 90;
      const head = (age * speed + hash(column, 3) * (height + 140)) % (height + 140);
      for (let tail = 0; tail < 12; tail++) {
        const y = head - tail * cell;
        if (y < 0 || y > height + cell) continue;
        context.globalAlpha = (1 - tail / 12) * (entrance ? 1 : .55);
        context.fillStyle = colors[tail === 0 ? 0 : tail < 3 ? 1 : 2];
        context.fillText(symbols[Math.floor(hash(column * 31 + tail, tick) * symbols.length)], column * cell, y);
      }
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'destination-in';
    context.drawImage(mask, 0, 0, width, height);
    context.globalCompositeOperation = 'source-over';
    // Crossfade to the untouched typography instead of leaving a noisy label.
    if (entrance && age > 1.9) {
      heading.classList.remove('name-running');
      context.globalCompositeOperation = 'destination-in';
      context.fillStyle = `rgba(0,0,0,${Math.max(0, (2.5 - age) / .6)})`;
      context.fillRect(0, 0, width, height);
      context.globalCompositeOperation = 'source-over';
    }
  }
  function play(intro) {
    clear();
    if (!visible || document.hidden || motion.matches) return;
    resize(); entrance = intro; previous = -Infinity;
    if (intro) heading.classList.add('name-running');
    frame = requestAnimationFrame(draw);
  }
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) clear();
    else if (!entered) { entered = true; play(true); }
    else schedule();
  });
  observer.observe(heading);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); else schedule(); });
  motion.addEventListener('change', () => { clear(); schedule(); });
  new ResizeObserver(() => { resize(); }).observe(heading);
  addEventListener('pagehide', event => { clear(); if (!event.persisted) observer.disconnect(); });
  addEventListener('pageshow', () => schedule());
}
document.fonts.ready.then(connectNameRain);
