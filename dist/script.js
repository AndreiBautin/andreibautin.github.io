document.getElementById('year').textContent = new Date().getFullYear();

const button = document.querySelector('.theme-toggle');
const flipTheme = () => {
  document.body.classList.toggle('light');
  localStorage.setItem('portfolio-theme', document.body.classList.contains('light') ? 'light' : 'dark');
};
// Where the browser has view transitions, the new theme spreads as a
// circle from the toggle; elsewhere it fades as before.
button.addEventListener('click', () => {
  if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { flipTheme(); return; }
  const box = button.getBoundingClientRect();
  const x = box.left + box.width / 2, y = box.top + box.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  document.documentElement.classList.add('theme-flipping');
  const transition = document.startViewTransition(flipTheme);
  transition.ready.then(() => document.documentElement.animate(
    { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
    { duration: 600, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' }
  ));
  transition.finished.finally(() => document.documentElement.classList.remove('theme-flipping'));
});

if (localStorage.getItem('portfolio-theme') === 'light') document.body.classList.add('light');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      if (!reduceMotion) {
        // A section's intro comes in as a sequence, kicker then heading,
        // 80 ms apart; everything else as one.
        const staggered = entry.target.matches('.section-intro, .proof, .resume-grid');
        const parts = staggered ? [...entry.target.children] : [entry.target];
        parts.forEach((part, index) => part.animate([
          { opacity: 0, transform: 'translateY(24px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ], { duration: 650, delay: index * 80, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'both' }));
      }
      observer.unobserve(entry.target);
    }
  });
}, { threshold: .12 });

document.querySelectorAll('.project, .about-grid, .contact-row, .section-intro, .proof, .resume-details > h2, .resume-grid, .contact-card').forEach((el) => observer.observe(el));

// The at-a-glance numbers count up from zero the first time they are
// seen. The final text is in the HTML, so without script they just show.
const proof = document.querySelector('.proof');
if (proof && !reduceMotion) {
  const numbers = [...proof.querySelectorAll('b')].map((el) => {
    const [, value, suffix] = el.textContent.match(/^(\d+)(.*)$/) || [];
    return value ? { el, value: Number(value), suffix } : null;
  }).filter(Boolean);
  numbers.forEach((n) => { n.el.textContent = `0${n.suffix}`; });
  new IntersectionObserver((entries, self) => {
    if (!entries[0].isIntersecting) return;
    self.disconnect();
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 1200);
      const eased = 1 - Math.pow(1 - t, 3);
      numbers.forEach((n) => { n.el.textContent = `${Math.round(n.value * eased)}${n.suffix}`; });
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, { threshold: .4 }).observe(proof);
}

// Each role's node on the experience timeline lights as it scrolls past
// the middle of the screen, and stays lit.
const nodes = document.querySelectorAll('.timeline h4');
if (reduceMotion) nodes.forEach((node) => node.classList.add('is-lit'));
else {
  const nodeObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('is-lit'); nodeObserver.unobserve(entry.target); }
    });
  }, { rootMargin: '0px 0px -45% 0px' });
  nodes.forEach((node) => nodeObserver.observe(node));
}

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
  // The last section is too short to reach the line; at the bottom of the
  // page it is the one being read.
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) current = sections[sections.length - 1];
  navLinks.forEach((link) => {
    const isCurrent = current !== null && link.getAttribute('href') === `#${current.id}`;
    if (isCurrent) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  });
};
// The current link sits on a pill that slides between links, and the
// header tightens once the page has left the top.
const nav = document.querySelector('nav');
const header = document.querySelector('.nav-shell');
nav.insertAdjacentHTML('afterbegin', '<span class="nav-pill" aria-hidden="true"></span>');
const pill = nav.querySelector('.nav-pill');
const placePill = () => {
  const current = nav.querySelector('a[aria-current="true"]');
  if (!current || current.offsetParent === null) { pill.style.opacity = '0'; return; }
  pill.style.opacity = '1';
  pill.style.width = `${current.offsetWidth}px`;
  pill.style.transform = `translateX(${current.offsetLeft}px)`;
};
const onScroll = () => {
  markCurrent();
  header.classList.toggle('is-scrolled', window.scrollY > 24);
  placePill();
};
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', placePill);
document.fonts.ready.then(placePill);
onScroll();

// A soft light follows the pointer over each project card. Only for a
// real pointer: on touch there is nothing to follow.
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
if (finePointer && !reduceMotion) {
  document.querySelectorAll('.project-visual').forEach((card) => {
    card.insertAdjacentHTML('beforeend', '<span class="spotlight" aria-hidden="true"></span>');
    card.addEventListener('pointermove', (event) => {
      const box = card.getBoundingClientRect();
      card.style.setProperty('--spot-x', `${event.clientX - box.left}px`);
      card.style.setProperty('--spot-y', `${event.clientY - box.top}px`);
    });
  });
}

// On a phone the nav is a sheet under the header, opened by the menu
// button and closed by choosing a link or pressing Escape.
const menuButton = document.querySelector('.menu-toggle');
const setMenu = (open) => {
  document.body.classList.toggle('menu-open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
};
menuButton.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
nav.addEventListener('click', (event) => { if (event.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setMenu(false); });

// Copy the email address, for anyone without a mail client set up.
const copyButton = document.querySelector('.copy-email');
if (copyButton) {
  const status = document.querySelector('.copy-status');
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(copyButton.dataset.email);
      status.textContent = 'Copied';
    } catch {
      // No clipboard permission: select the address so a keystroke copies it.
      const range = document.createRange();
      range.selectNodeContents(document.querySelector('.contact-email a'));
      getSelection().removeAllRanges();
      getSelection().addRange(range);
      status.textContent = 'Selected, press Ctrl+C';
    }
    status.classList.add('is-shown');
    setTimeout(() => status.classList.remove('is-shown'), 1800);
  });
}

// The Explore button leans toward the pointer and springs back.
if (finePointer && !reduceMotion) {
  document.querySelectorAll('.round-link').forEach((button) => {
    button.addEventListener('pointermove', (event) => {
      const box = button.getBoundingClientRect();
      const dx = (event.clientX - box.left - box.width / 2) * 0.25;
      const dy = (event.clientY - box.top - box.height / 2) * 0.25;
      button.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    button.addEventListener('pointerleave', () => { button.style.transform = ''; });
  });
}

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

// iOS Safari only applies :active to a touched element when some touch
// listener exists on the page; this empty one switches the press styles on.
document.addEventListener('touchstart', () => {}, { passive: true });
