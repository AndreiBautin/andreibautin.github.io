document.getElementById('year').textContent = new Date().getFullYear();

const button = document.querySelector('.theme-toggle');
button.addEventListener('click', () => {
  document.body.classList.toggle('light');
  localStorage.setItem('portfolio-theme', document.body.classList.contains('light') ? 'light' : 'dark');
});

if (localStorage.getItem('portfolio-theme') === 'light') document.body.classList.add('light');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      if (!reduceMotion) {
        // A section's intro comes in as a sequence, kicker then heading,
        // 80 ms apart; everything else as one.
        const parts = entry.target.classList.contains('section-intro') ? [...entry.target.children] : [entry.target];
        parts.forEach((part, index) => part.animate([
          { opacity: 0, transform: 'translateY(24px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ], { duration: 650, delay: index * 80, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'both' }));
      }
      observer.unobserve(entry.target);
    }
  });
}, { threshold: .12 });

document.querySelectorAll('.project, .about-grid, .contact-row, .section-intro').forEach((el) => observer.observe(el));

// The nav marks the section in view: each section's link is current while
// its top half crosses the upper part of the viewport.
const navLinks = [...document.querySelectorAll('nav a[href^="#"]')];
const sections = navLinks.map((link) => document.querySelector(link.getAttribute('href'))).filter(Boolean);
const markCurrent = () => {
  const line = window.innerHeight * 0.35;
  let current = null;
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= line) current = section;
  }
  navLinks.forEach((link) => {
    const isCurrent = current !== null && link.getAttribute('href') === `#${current.id}`;
    if (isCurrent) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  });
};
window.addEventListener('scroll', markCurrent, { passive: true });
markCurrent();

// A star field behind the hero: a few hundred points by a hash, drawn
// once, twinkling slowly unless motion is reduced.
const stars = document.querySelector('.stars');
if (stars) {
  const ctx = stars.getContext('2d');
  const points = Array.from({ length: 260 }, (_, k) => {
    const h = (n) => { const x = Math.sin(k * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
    return { x: h(1), y: h(2), r: 0.4 + h(3) * 1.1, a: 0.25 + h(4) * 0.6, p: h(5) * 6.283 };
  });
  const draw = (t) => {
    const w = stars.clientWidth, h = stars.clientHeight;
    if (stars.width !== w * devicePixelRatio || stars.height !== h * devicePixelRatio) {
      stars.width = w * devicePixelRatio; stars.height = h * devicePixelRatio;
    }
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const light = document.body.classList.contains('light');
    for (const s of points) {
      const tw = reduceMotion ? 1 : 0.7 + 0.3 * Math.sin(t / 1400 + s.p);
      ctx.globalAlpha = s.a * tw * (light ? 0.35 : 1);
      ctx.fillStyle = light ? '#1e5d66' : '#e9edf2';
      ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.r, 0, 6.283); ctx.fill();
    }
    if (!reduceMotion) requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
  window.addEventListener('resize', () => { if (reduceMotion) requestAnimationFrame(draw); });
}
