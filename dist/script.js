document.getElementById('year').textContent = new Date().getFullYear();

const button = document.querySelector('.theme-toggle');
button.addEventListener('click', () => {
  document.body.classList.toggle('light');
  localStorage.setItem('portfolio-theme', document.body.classList.contains('light') ? 'light' : 'dark');
});

if (localStorage.getItem('portfolio-theme') === 'light') document.body.classList.add('light');

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.animate([
        { opacity: 0, transform: 'translateY(24px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 650, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'both' });
      observer.unobserve(entry.target);
    }
  });
}, { threshold: .12 });

document.querySelectorAll('.project, .about-grid, .contact-row').forEach((el) => observer.observe(el));

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
