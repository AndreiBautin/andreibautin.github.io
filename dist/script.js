// Content and navigation remain usable when JavaScript is unavailable.
const themeButton = document.querySelector('.theme-toggle');
function setTheme(light) {
  document.body.classList.toggle('light', light);
  themeButton.setAttribute('aria-pressed', String(light));
  themeButton.setAttribute('aria-label', light ? 'Use dark theme' : 'Use light theme');
  document.querySelector('link[rel="icon"]').href = light ? './images/favicon-light.svg' : './images/favicon.svg';
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
