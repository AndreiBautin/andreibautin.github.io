// UI and direct project links do not depend on the graphics renderer.
const projects = [
  ['index', 'Software engineer', 'Andrei Bautin', '.NET, React, and Azure. Senior software engineer at 3Cloud.', './Andrei_Bautin_Resume.pdf', 'View resume'],
  ['terra', 'Procedural planet explorer', 'TERRA', 'Create a world from a seed. Fly from orbit down to its terrain.', 'https://andreibautin.github.io/planet-generator/', 'Open TERRA'],
  ['nacre', 'Liquid sculpture studio', 'NACRE', 'Pull, split, merge, and freeze liquid into sculptures.', 'https://liquid-sculpture-studio.andreibautin94.chatgpt.site/', 'Open NACRE'],
  ['pelagic', 'Interactive ocean life', 'PELAGIC', 'Meet a luminous jellyfish. Build an aquarium and watch its inhabitants respond.', 'https://pelagic.andreibautin94.chatgpt.site/', 'Open PELAGIC'],
];
const themeButton = document.querySelector('.theme-toggle');
function setTheme(light) {
  document.body.classList.toggle('light', light);
  themeButton.setAttribute('aria-pressed', String(light));
  themeButton.setAttribute('aria-label', light ? 'Use dark theme' : 'Use light theme');
  document.querySelector('link[rel="icon"]').href = light ? './images/favicon-light.svg?v=outline-1' : './images/favicon.svg?v=outline-1';
  try { localStorage.setItem('portfolio-theme', light ? 'light' : 'dark'); } catch { /* Optional storage. */ }
  dispatchEvent(new CustomEvent('portfolio:theme', { detail: { light } }));
}
try { setTheme(localStorage.getItem('portfolio-theme') === 'light'); } catch { setTheme(false); }
themeButton.addEventListener('click', () => setTheme(!document.body.classList.contains('light')));
const buttons = [...document.querySelectorAll('[data-scene]')];
function select(index, updateUrl = true) {
  if (!Number.isInteger(index) || !projects[index]) return;
  const [key, category, title, description, url, launch] = projects[index];
  document.body.classList.toggle('project-view', index !== 0);
  buttons.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.scene) === index)));
  document.getElementById('scene-category').textContent = category;
  document.getElementById('scene-title').textContent = title;
  document.getElementById('scene-description').textContent = description;
  const link = document.getElementById('scene-launch'); link.href = url; link.textContent = launch;
  const details = document.getElementById('scene-details'); details.dataset.open = index === 0 ? 'about' : 'project-info'; details.textContent = index === 0 ? 'Experience' : 'How it works';
  document.querySelectorAll('[data-project-note]').forEach(note => { note.hidden = Number(note.dataset.projectNote) !== index; });
  if (updateUrl) history.replaceState(null, '', index === 0 ? location.pathname : `#${key}`);
  dispatchEvent(new CustomEvent('portfolio:scene', { detail: { index } }));
}
buttons.forEach(button => button.addEventListener('click', () => select(Number(button.dataset.scene))));
document.querySelector('[data-home]').addEventListener('click', event => { event.preventDefault(); select(0); });
function fromHash() { if (location.hash === '#construct') { select(2, false); return; } select(Math.max(0, projects.findIndex(project => `#${project[0]}` === location.hash)), false); }
addEventListener('hashchange', fromHash); fromHash();
document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => {
  const dialog = document.getElementById(button.dataset.open);
  if (!(dialog instanceof HTMLDialogElement)) return;
  dialog.showModal(); dispatchEvent(new CustomEvent('portfolio:overlay', { detail: { open: true } }));
  if (button.hasAttribute('data-contact')) document.getElementById('contact').scrollIntoView({ block: 'center' });
  else dialog.scrollTop = 0;
}));
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => dispatchEvent(new CustomEvent('portfolio:overlay', { detail: { open: false } })));
});
addEventListener('keydown', event => {
  if (document.querySelector('dialog[open]') || event.ctrlKey || event.metaKey || event.altKey) return;
  const index = ['1', '2', '3', '4'].indexOf(event.key);
  if (index >= 0) { select(index); buttons[index].focus(); }
});
document.getElementById('copy-email').addEventListener('click', async () => {
  const status = document.getElementById('copy-status');
  try { await navigator.clipboard.writeText('andreibautin94@gmail.com'); status.textContent = 'Email copied'; }
  catch { status.textContent = 'Select the email address to copy it.'; }
  setTimeout(() => { status.textContent = ''; }, 3000);
});
