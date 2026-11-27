// UI and direct project links do not depend on the graphics renderer.
const projects = [
  ['index', 'Software engineer', 'Andrei Bautin', '.NET, React, and Azure. Senior software engineer at 3Cloud.', './Andrei_Bautin_Resume.pdf', 'Explore my background'],
  ['terra', 'Procedural planet explorer', 'TERRA', 'Create a world from a seed. Fly from orbit down to its terrain.', 'https://andreibautin.github.io/planet-generator/', 'Open TERRA'],
  ['nacre', 'Liquid sculpture studio', 'NACRE', 'Pull, split, merge, and freeze liquid into sculptures.', 'https://liquid-sculpture-studio.andreibautin94.chatgpt.site/', 'Open NACRE'],
  ['pelagic', 'Interactive ocean life', 'PELAGIC', 'Meet a luminous jellyfish. Build an aquarium and watch its inhabitants respond.', 'https://pelagic.andreibautin94.chatgpt.site/', 'Open PELAGIC'],
];
// The exact local portfolio origin, http://127.0.0.1:4357 or http://localhost:4357.
// Anything unreadable or any other origin, lookalikes included, is not local.
const onLocalPortfolio = (() => {
  try { return location.protocol === 'http:' && location.port === '4357' && ['127.0.0.1', 'localhost'].includes(location.hostname); } catch { return false; }
})();
// Local demos only (docs/LOCAL-DEMOS.md): there, the TERRA, NACRE and PELAGIC launch
// and detail links open their pinned local servers. Elsewhere nothing is rewritten.
if (onLocalPortfolio) {
  const local = new Map([[projects[1][4], 'http://127.0.0.1:5185/'], [projects[2][4], 'http://127.0.0.1:4386/'], [projects[3][4], 'http://127.0.0.1:4392/']]);
  projects.forEach(project => { project[4] = local.get(project[4]) ?? project[4]; });
  document.querySelectorAll('[data-project-note] a[href]').forEach(link => { const href = local.get(link.getAttribute('href')); if (href) link.setAttribute('href', href); });
}
const themeButton = document.querySelector('.theme-toggle');
function setTheme(light) {
  document.body.classList.toggle('light', light);
  themeButton?.setAttribute('aria-pressed', String(light));
  themeButton?.setAttribute('aria-label', light ? 'Use dark theme' : 'Use light theme');
  document.querySelector('link[rel="icon"]').href = light ? './images/favicon-light.svg?v=outline-1' : './images/favicon.svg?v=outline-1';
  try { localStorage.setItem('portfolio-theme', light ? 'light' : 'dark'); } catch { /* Optional storage. */ }
  dispatchEvent(new CustomEvent('portfolio:theme', { detail: { light } }));
}
try { setTheme(localStorage.getItem('portfolio-theme') === 'light'); } catch { setTheme(false); }
themeButton?.addEventListener('click', () => setTheme(!document.body.classList.contains('light')));
const buttons = [...document.querySelectorAll('[data-scene]')];
const workModes = ['knowledge', 'replication', 'payments', 'career', 'contact'];
const workFallbacks = {
  knowledge: ['Experience', 'Engineering knowledge assistant', 'An Azure RAG platform for searching engineering documentation.'],
  replication: ['Experience', 'Asynchronous data replication', 'An asynchronous replication design using Azure Service Bus.'],
  payments: ['Experience', 'Payment automation', 'Automated payment-processing workflows, including a microservice integrated with a bank.'],
  career: ['Resume', 'Career & credentials', 'Senior software engineer in Denver. C#, .NET, React and Azure.'],
  contact: ['Contact', 'Get in touch', 'Based in Denver, Colorado.'],
};
let currentProject = 0, workMode = null, fallbackMode = null;
const projectPanel = document.getElementById('project-info');
let aboutOpener = null;
function closeProjectDetails(restoreFocus = false) {
  projectPanel.hidden = true;
  document.body.classList.remove('project-details-view');
  document.getElementById('scene-details').setAttribute('aria-expanded', 'false');
  if (restoreFocus) document.getElementById('scene-details').focus({ preventScroll: true });
}
function projectStep(key) {
  if (!['overview', 'build', 'preview'].includes(key)) return;
  document.querySelectorAll('[data-detail-step]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.detailStep === key)));
  document.querySelectorAll('[data-detail-content]').forEach(content => { content.hidden = content.dataset.detailContent !== key; });
}
function openProjectDetails(focusTitle = true) {
  projectStep('overview'); projectPanel.hidden = false;
  document.body.classList.add('project-details-view');
  document.getElementById('scene-details').setAttribute('aria-expanded', 'true');
  if (focusTitle) document.getElementById('project-info-title').focus({ preventScroll: true });
}
document.querySelectorAll('[data-detail-step]').forEach(button => button.addEventListener('click', () => projectStep(button.dataset.detailStep)));
document.getElementById('close-project-details').addEventListener('click', () => closeProjectDetails(true));
function markSection(section) {
  document.body.setAttribute('data-section', section);
  document.querySelectorAll('[data-section-link]').forEach(link => link.setAttribute('aria-current', link.dataset.sectionLink === section ? 'location' : 'false'));
}
function select(index, updateUrl = true) {
  if (!Number.isInteger(index) || !projects[index]) return;
  if (document.getElementById('about').open) document.getElementById('about').close();
  const keepDetails = !projectPanel.hidden && currentProject !== 0 && workMode === null && fallbackMode === null;
  closeProjectDetails();
  currentProject = index; workMode = null; fallbackMode = null;
  markSection(index === 0 ? 'home' : 'projects');
  document.querySelector('.scene-copy')?.setAttribute('aria-live', index === 0 ? 'off' : 'polite');
  document.body.classList.remove('work-view', 'work-fallback');
  dispatchEvent(new CustomEvent('portfolio:mode', { detail: { mode: null } }));
  const [key, category, title, description, url, launch] = projects[index];
  document.body.classList.toggle('project-view', index !== 0);
  buttons.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.scene) === index)));
  document.getElementById('scene-category').textContent = category;
  document.getElementById('scene-title').textContent = title;
  document.getElementById('scene-description').textContent = description;
  const link = document.getElementById('scene-launch'); link.href = url; link.textContent = launch;
  const details = document.getElementById('scene-details'); details.dataset.open = index === 0 ? 'about' : 'project-info'; details.textContent = index === 0 ? 'Experience' : 'How it works';
  details.setAttribute('aria-controls', index === 0 ? 'about' : 'project-info');
  details.hidden = index === 0;
  document.getElementById('welcome-projects').hidden = index !== 0;
  document.getElementById('welcome-experience').hidden = index !== 0;
  document.getElementById('welcome-sections').hidden = index !== 0;
  document.getElementById('projects').hidden = index === 0;
  document.querySelectorAll('[data-project-note]').forEach(note => { note.hidden = Number(note.dataset.projectNote) !== index; });
  if (keepDetails && index !== 0) openProjectDetails(false);
  if (updateUrl) history.replaceState(null, '', index === 0 ? location.pathname : `#${key}`);
  dispatchEvent(new CustomEvent('portfolio:scene', { detail: { index } }));
}
buttons.forEach(button => button.addEventListener('click', () => select(Number(button.dataset.scene))));
for (const control of [document.querySelector('[data-home]'), document.getElementById('scene-home')]) control.addEventListener('click', event => {
  if (event.defaultPrevented || event.button > 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault(); select(0); document.getElementById('welcome-resume').focus({ preventScroll: true });
});
for (const link of [document.querySelector('[data-projects]'), document.getElementById('welcome-projects')]) link?.addEventListener('click', event => {
  if (event.defaultPrevented || event.button > 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault(); select(currentProject || 1); document.getElementById('projects').focus({ preventScroll: true });
});
document.getElementById('scene-launch').addEventListener('click', event => {
  if (currentProject !== 0 || workMode !== null || fallbackMode !== null || event.defaultPrevented || event.button > 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !document.body.classList.contains('work-ui-ready')) return;
  event.preventDefault(); dispatchEvent(new CustomEvent('portfolio:mode', { detail: { mode: 'career', focus: 'title' } }));
});
// Home previews respond to intent only; they never navigate or cycle scenes.
const homePreviews = [
  ['welcome-resume', 'Resume', 'Career & credentials', 'Explore my career milestones, Azure certifications and the full resume.'],
  ['welcome-experience', 'Experience', 'Engineering in practice', 'Explore the problem, my contribution and the outcome across three projects at 3Cloud.'],
  ['welcome-projects', 'Projects', 'Independent experiments', 'Explore TERRA, NACRE and PELAGIC, then open their working applications.'],
];
function welcomePreview(copy) {
  if (currentProject !== 0 || workMode !== null || fallbackMode !== null) return;
  const [category, title, description] = copy;
  document.getElementById('scene-category').textContent = category;
  document.getElementById('scene-title').textContent = title;
  document.getElementById('scene-description').textContent = description;
}
for (const [id, ...copy] of homePreviews) {
  const control = document.getElementById(id);
  control.addEventListener('pointerenter', () => welcomePreview(copy));
  control.addEventListener('focus', () => welcomePreview(copy));
  control.addEventListener('pointerleave', () => welcomePreview(projects[0].slice(1, 4)));
  control.addEventListener('blur', () => welcomePreview(projects[0].slice(1, 4)));
}
function fromHash(event) {
  const key = location.hash.slice(1).replace(/^work-/, '');
  const mode = key === 'experience' ? 'knowledge' : key === 'resume' ? 'career' : key;
  if (workModes.includes(mode) && document.body.classList.contains('work-ui-ready')) { dispatchEvent(new CustomEvent('portfolio:mode', { detail: { mode, updateUrl: false, instant: true } })); return; }
  if (workModes.includes(mode)) {
    if (document.getElementById('about').open) document.getElementById('about').close();
    fallbackMode = mode; workMode = null;
    document.body.classList.remove('work-view', 'project-view');
    document.body.classList.add('work-fallback');
    markSection(mode === 'career' ? 'resume' : mode === 'contact' ? 'contact' : 'experience');
    buttons.forEach(button => button.setAttribute('aria-pressed', 'false'));
    const [category, title, description] = workFallbacks[mode];
    document.getElementById('scene-category').textContent = category;
    document.getElementById('scene-title').textContent = title;
    document.getElementById('scene-description').textContent = description;
    const launch = document.getElementById('scene-launch');
    launch.href = mode === 'contact' ? 'mailto:andreibautin94@gmail.com' : './Andrei_Bautin_Resume.pdf';
    launch.textContent = mode === 'contact' ? 'Send email' : 'View resume (PDF)';
    document.getElementById('welcome-projects').hidden = true;
    document.getElementById('welcome-experience').hidden = true;
    document.getElementById('welcome-sections').hidden = true;
    closeProjectDetails();
    const details = document.getElementById('scene-details'); details.hidden = false; details.dataset.open = 'about'; details.textContent = 'About me';
    details.setAttribute('aria-controls', 'about');
    dispatchEvent(new CustomEvent('portfolio:scene', { detail: { index: 4 + workModes.indexOf(mode), instant: true } }));
    return;
  }
  if (location.hash === '#construct') { select(2, false); return; }
  if (location.hash === '#projects') { select(currentProject || 1, false); if (event?.type === 'hashchange') document.getElementById('projects').focus({ preventScroll: true }); return; }
  select(Math.max(0, projects.findIndex(project => `#${project[0]}` === location.hash)), false);
}
addEventListener('hashchange', fromHash); fromHash();
addEventListener('portfolio:work-ready', () => {
  if (!document.body.classList.contains('work-ui-ready')) return;
  if (/^#(?:work-(?:knowledge|replication|payments|career|contact)|experience|career|resume|contact)$/.test(location.hash)) fromHash();
});
addEventListener('portfolio:mode', event => {
  const mode = event.detail?.mode;
  if (mode === null) {
    if (event.detail?.destination === 'home') { select(0); document.getElementById('welcome-resume').focus({ preventScroll: true }); }
    else if (workMode !== null) select(currentProject || 1);
    return;
  }
  if (!workModes.includes(mode)) return;
  if (document.getElementById('about').open) document.getElementById('about').close();
  closeProjectDetails();
  fallbackMode = null; document.body.classList.remove('work-fallback');
  workMode = mode; document.body.classList.add('work-view');
  document.getElementById('welcome-sections').hidden = true;
  markSection(mode === 'career' ? 'resume' : mode === 'contact' ? 'contact' : 'experience');
  buttons.forEach(button => button.setAttribute('aria-pressed', 'false'));
  if (event.detail?.updateUrl !== false) history.replaceState(null, '', `#work-${mode}`);
  dispatchEvent(new CustomEvent('portfolio:scene', { detail: { index: 4 + workModes.indexOf(mode), instant: event.detail?.instant === true } }));
});
addEventListener('portfolio:graphics-ready', () => { const mode = workMode ?? fallbackMode; if (mode !== null) dispatchEvent(new CustomEvent('portfolio:scene', { detail: { index: 4 + workModes.indexOf(mode), instant: true } })); });
for (const control of [document.querySelector('[data-resume]'), document.getElementById('welcome-resume')]) control.addEventListener('click', event => {
  if (event.defaultPrevented || event.button > 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  if (!document.body.classList.contains('work-ui-ready')) return;
  event.preventDefault(); dispatchEvent(new CustomEvent('portfolio:mode', { detail: { mode: 'career', focus: 'title' } }));
});
document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.open === 'project-info') {
    if (!currentProject || workMode !== null || fallbackMode !== null) return;
    openProjectDetails();
    return;
  }
  if (button.dataset.open === 'about' && document.body.classList.contains('work-ui-ready')) { dispatchEvent(new CustomEvent('portfolio:mode', { detail: { mode: button.hasAttribute('data-contact') ? 'contact' : 'knowledge', focus: 'title' } })); return; }
  const dialog = document.getElementById(button.dataset.open);
  if (!(dialog instanceof HTMLDialogElement)) return;
  aboutOpener = button; dialog.show();
  document.getElementById('about-title').focus({ preventScroll: true });
  if (button.hasAttribute('data-contact')) document.getElementById('contact').scrollIntoView({ block: 'center' });
  else dialog.scrollTop = 0;
}));
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => { aboutOpener?.focus({ preventScroll: true }); aboutOpener = null; });
});
addEventListener('keydown', event => {
  if (!event.defaultPrevented && event.key === 'Escape' && document.getElementById('about').open) { document.getElementById('about').close(); return; }
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
  if (!projectPanel.hidden && event.key === 'Escape') { closeProjectDetails(true); return; }
  if ((workMode !== null || fallbackMode !== null) && event.key === 'Escape') { select(currentProject || 1); return; }
  const index = ['1', '2', '3', '4'].indexOf(event.key);
  if (index >= 0) document.querySelectorAll('[data-section-link]')[index]?.click();
});
document.getElementById('copy-email').addEventListener('click', async () => {
  const status = document.getElementById('copy-status');
  try { await navigator.clipboard.writeText('andreibautin94@gmail.com'); status.textContent = 'Email copied'; }
  catch { status.textContent = 'Select the email address to copy it.'; }
  setTimeout(() => { status.textContent = ''; }, 3000);
});
// Local preview only (docs/LOCAL-PREVIEW.md): on http://127.0.0.1:4357 or
// http://localhost:4357, reload once when `npm run verify` publishes a new
// verified-bundle token. Every other origin, the published site included,
// returns here before any timer, listener or request exists.
(() => {
  if (!onLocalPortfolio || typeof fetch !== 'function') return;
  const quiet = 2000, slowest = 30000;
  let baseline, timer = 0, busy = false, delay = quiet, reloading = false;
  const schedule = () => { if (!reloading && !timer && !busy && document.visibilityState !== 'hidden') timer = setTimeout(poll, delay); };
  async function poll() {
    timer = 0;
    if (reloading || busy || document.visibilityState === 'hidden') return;
    busy = true;
    try {
      const response = await fetch('/__preview/token', { cache: 'no-store', credentials: 'omit', redirect: 'error' });
      const token = response.status === 200 ? await response.text() : response.status === 204 ? '' : null;
      if (token === null || (token && !/^[0-9a-f]{16}$/.test(token))) throw new Error('unavailable');
      delay = quiet;
      // The first answer is the baseline; only a later, different verified token reloads.
      if (baseline === undefined) baseline = token;
      else if (token && token !== baseline) { reloading = true; location.reload(); }
    } catch { delay = Math.min(delay * 2, slowest); }
    busy = false;
    schedule();
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { clearTimeout(timer); timer = 0; } else if (!timer && !busy) poll(); });
  poll();
})();
