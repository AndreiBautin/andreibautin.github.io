// Professional work HUD inside the particle stage. Styles: work-ui.css.
// Contract and behaviour: docs/WORK-UI.md. The renderer and scene choice
// belong to the main page; this module only builds and drives the compact
// panel inside div#work-panel, and every fact comes from the approved resume.
//
// window 'portfolio:mode' CustomEvent, detail { mode } with mode one of MODES
// or null, is authoritative for what is shown. Controls here dispatch the same
// event to request navigation; null returns to the projects.

export const MODES = Object.freeze(['knowledge', 'replication', 'payments', 'career', 'contact']);
const EXPERIENCE = MODES.slice(0, 3);
export const RESUME = './Andrei_Bautin_Resume.pdf';
export const EMAIL = 'andreibautin94@gmail.com';
export const LINKS = Object.freeze({
  linkedin: 'https://linkedin.com/in/andrei-bautin-0b2578184',
  github: 'https://github.com/AndreiBautin',
});
export const TIMINGS = Object.freeze({ copied: 4000, failed: 12000 });
export const MESSAGES = Object.freeze({
  copied: 'Email address copied.',
  selected: `Copy was blocked. ${EMAIL} is selected; press Ctrl+C or Cmd+C to copy it.`,
  manual: `Copy is unavailable here. Select ${EMAIL} to copy it.`,
});

const TAB_LABELS = Object.freeze({ knowledge: 'Knowledge assistant', replication: 'Replication', payments: 'Payments', career: 'Career', contact: 'Contact' });
const TAB_SUBTITLES = Object.freeze({ knowledge: 'Azure RAG platform', replication: 'Azure Service Bus', payments: 'Workflow automation' });
const STEPS = ['Problem', 'My contribution', 'Outcome'];

// Facts only: dist/index.html and Andrei_Bautin_Resume.pdf are the sources.
export const CONTENT = Object.freeze({
  knowledge: {
    eyebrow: '3Cloud · Azure RAG platform',
    title: 'Engineering knowledge assistant',
    lede: 'Led architecture and delivery of an Azure RAG platform for searching engineering documentation in natural language. Built with Azure OpenAI, Azure AI Search, Blob Storage, .NET and React/TypeScript.',
    steps: [
      'Inherited a delayed RAG platform whose architecture had to be stabilized before it could reach production.',
      'Designed the assistant end to end and owned its architecture across development, QA and production, with stakeholders and infrastructure. Added Application Insights, alerts and traces while building it.',
      'Led it to a production-ready release used to query engineering documentation, using that telemetry to diagnose issues through stabilization.',
    ],
  },
  replication: {
    eyebrow: '3Cloud · Azure Service Bus',
    title: 'Asynchronous data replication',
    lede: 'Replaced a serialized data-replication path with an asynchronous Azure Service Bus design.',
    steps: [
      'Data replication ran through a serialized path.',
      'Designed the asynchronous Service Bus replacement and instrumented it with Application Insights and alerting.',
      'Throughput improved, and the telemetry proved every message replicated without loss.',
    ],
  },
  payments: {
    eyebrow: 'Brainspire / 3Cloud · Automation',
    title: 'Payment automation',
    lede: 'Automated payment-processing workflows, including a microservice integrated with a bank.',
    steps: [
      'Payment processing relied on manual work every day.',
      'Automated the payment-processing workflows and built a microservice integrated with a bank.',
      'Eliminated more than 11 hours of manual work each day.',
    ],
  },
  career: {
    eyebrow: 'Resume',
    title: 'Career & credentials',
    lede: 'Senior software engineer in Denver with 7+ years building enterprise applications in C#, .NET, React and Azure.',
    milestones: [
      ['May 2019', 'B.S., Applied Computing Technology', 'Colorado State University, Fort Collins, Colorado.'],
      ['June 2019', 'Software Engineer, Brainspire / 3Cloud', 'Built web applications and Azure solutions for healthcare, insurance, retail and industrial clients with .NET, Vue.js, React and SQL Server.'],
      ['Sept 2024', 'Senior Software Engineer, 3Cloud', 'At 3Cloud, a Cognizant company, delivered the knowledge assistant and Service Bus replication work. Mentored and onboarded 5+ engineers through code reviews, architecture guidance and shared standards.'],
      ['Credentials', 'Microsoft Azure certifications', 'Azure Fundamentals (AZ-900) and Azure AI Fundamentals (AI-900).'],
    ],
  },
  contact: {
    eyebrow: 'Contact',
    title: 'Get in touch',
    lede: 'Based in Denver, Colorado.',
  },
});

export function validMode(value) { return value === null || MODES.includes(value); }

// Roving focus inside a tab row; returns the index to move to, or -1.
export function nextIndex(current, key, length) {
  if (!Number.isInteger(length) || length <= 0) return -1;
  const at = Number.isInteger(current) && current >= 0 && current < length ? current : 0;
  switch (key) {
    case 'ArrowRight': return (at + 1) % length;
    case 'ArrowLeft': return (at - 1 + length) % length;
    case 'Home': return 0;
    case 'End': return length - 1;
    default: return -1;
  }
}

const SVG = 'http://www.w3.org/2000/svg';

// Abstract diagrams: shapes and lines only, no dashboards, numbers or labels.
const ART = {
  knowledge: [
    ['rect', { x: 8, y: 10, width: 26, height: 16, rx: 2 }], ['rect', { x: 8, y: 30, width: 26, height: 16, rx: 2 }], ['rect', { x: 8, y: 50, width: 26, height: 16, rx: 2 }],
    ['path', { d: 'M34 18 C70 18 80 38 104 38 M34 38 H104 M34 58 C70 58 80 38 104 38' }],
    ['circle', { cx: 120, cy: 38, r: 16 }], ['circle', { cx: 120, cy: 38, r: 6, class: 'work-art-accent' }],
    ['path', { d: 'M136 38 H176' }],
    ['path', { d: 'M180 24 H232 V50 H200 L190 60 V50 H180 Z', class: 'work-art-accent' }],
  ],
  replication: [
    ['rect', { x: 6, y: 22, width: 30, height: 32, rx: 3 }], ['rect', { x: 204, y: 22, width: 30, height: 32, rx: 3 }],
    ['path', { d: 'M36 28 H204 M36 38 H204 M36 48 H204' }],
    ['circle', { cx: 70, cy: 28, r: 3, class: 'work-art-accent' }], ['circle', { cx: 120, cy: 38, r: 3, class: 'work-art-accent' }], ['circle', { cx: 165, cy: 48, r: 3, class: 'work-art-accent' }],
    ['circle', { cx: 150, cy: 28, r: 3, class: 'work-art-accent' }], ['circle', { cx: 92, cy: 48, r: 3, class: 'work-art-accent' }],
  ],
  payments: [
    ['circle', { cx: 24, cy: 38, r: 12 }], ['circle', { cx: 88, cy: 38, r: 12 }], ['circle', { cx: 152, cy: 38, r: 12 }],
    ['path', { d: 'M36 38 H76 M100 38 H140 M164 38 H202' }],
    ['circle', { cx: 216, cy: 38, r: 14, class: 'work-art-accent' }], ['path', { d: 'M209 38 L214 43 L223 33', class: 'work-art-accent' }],
  ],
};

function scope() {
  const listeners = [];
  const timers = new Set();
  return {
    on(target, type, fn) { target.addEventListener(type, fn); listeners.push([target, type, fn]); },
    later(fn, ms) { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; },
    cancel(id) { if (id != null) { clearTimeout(id); timers.delete(id); } },
    dispose() { for (const [t, type, fn] of listeners.splice(0)) t.removeEventListener(type, fn); for (const id of timers) clearTimeout(id); timers.clear(); },
  };
}

export function mountWorkUI(root = document) {
  const doc = root && (root.ownerDocument || root);
  const view = doc && doc.defaultView;
  const panel = root && root.querySelector ? root.querySelector('#work-panel') : null;
  if (!panel || !view || !doc.body) return { dispose() {} };

  const s = scope();
  const body = doc.body;
  const wasHidden = panel.hidden;
  let mode = null;
  let disposed = false;
  let request = null;
  const disposers = [];

  const el = (tag, cls, text) => { const node = doc.createElement(tag); if (cls) node.className = cls; if (text != null) node.textContent = text; return node; };
  const attrs = (node, map) => { for (const [k, v] of Object.entries(map)) node.setAttribute(k, String(v)); return node; };
  const link = (cls, href, text) => attrs(el('a', cls, text), { href });
  const focus = (node) => { if (node && typeof node.focus === 'function') node.focus({ preventScroll: true }); };

  // Ask the page to navigate; the page's (and this module's) listener decides.
  const navigate = (next, focusTarget) => {
    if (disposed || !validMode(next)) return;
    request = { mode: next, focus: focusTarget };
    try { view.dispatchEvent(new view.CustomEvent('portfolio:mode', { detail: { mode: next, destination: focusTarget === 'home' ? 'home' : undefined } })); } finally { request = null; }
  };

  // A row of role=tab buttons with roving tabindex. activate(index, viaKey).
  const tabRow = (row, buttons, activate) => {
    buttons.forEach((button, index) => {
      s.on(button, 'click', () => activate(index, false));
      s.on(button, 'keydown', (event) => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        const to = nextIndex(index, event.key, buttons.length);
        if (to < 0) return;
        event.preventDefault();
        activate(to, true);
      });
    });
    row.append(...buttons);
  };
  const markTabs = (buttons, selected) => buttons.forEach((button, index) => {
    const on = index === selected;
    button.setAttribute('aria-selected', String(on));
    button.setAttribute('tabindex', on ? '0' : '-1');
  });

  const actions = (items) => { const row = el('div', 'work-actions'); row.append(...items); return row; };
  const resumeLink = () => link('work-link', RESUME, 'Resume (PDF)');
  const contactButton = () => { const b = attrs(el('button', 'work-link', 'Contact'), { type: 'button' }); s.on(b, 'click', () => navigate('contact', 'title')); return b; };

  const art = (key) => {
    const svg = attrs(doc.createElementNS(SVG, 'svg'), { viewBox: '0 0 240 76', class: 'work-art', 'aria-hidden': 'true', focusable: 'false' });
    for (const [tag, a] of ART[key]) svg.append(attrs(doc.createElementNS(SVG, tag), a));
    return svg;
  };

  // A small switcher: three (or four) tabs over one shared detail paragraph.
  const switcher = (id, label, items, render) => {
    const wrap = el('div', 'work-switch');
    const row = attrs(el('div', 'work-steps'), { role: 'tablist', 'aria-label': label });
    const detail = attrs(el('div', 'work-detail'), { role: 'tabpanel', id: `${id}-detail`, tabindex: '0' });
    const buttons = items.map((item, index) => attrs(el('button', 'work-step'), { type: 'button', role: 'tab', id: `${id}-step-${index}`, 'aria-controls': `${id}-detail` }));
    items.forEach((item, index) => render.label(buttons[index], item));
    let selected = 0;
    const select = (index, viaKey) => {
      selected = index;
      markTabs(buttons, index);
      detail.setAttribute('aria-labelledby', buttons[index].id);
      render.detail(detail, items[index]);
      if (viaKey) focus(buttons[index]);
    };
    tabRow(row, buttons, select);
    select(0, false);
    wrap.append(row, detail);
    return { wrap, buttons, get selected() { return selected; } };
  };

  const views = {};
  const hud = el('div', 'work-hud');
  const head = el('div', 'work-head');
  const back = attrs(el('button', 'work-back', 'Home'), { type: 'button' });
  s.on(back, 'click', () => navigate(null, 'home'));
  head.append(back);
  hud.append(head);

  for (const key of MODES) {
    const data = CONTENT[key];
    const id = `work-ui-${key}`;
    const section = attrs(el('section', 'work-view'), { id, role: EXPERIENCE.includes(key) ? 'tabpanel' : 'region', 'aria-labelledby': EXPERIENCE.includes(key) ? `work-ui-tab-${key} ${id}-title` : `${id}-title`, 'data-work-mode': key });
    section.hidden = true;
    const title = attrs(el('h2', 'work-title', data.title), { id: `${id}-title`, tabindex: '-1' });
    section.append(el('p', 'work-eyebrow', data.eyebrow), title, el('p', 'work-lede', data.lede));
    if (data.steps) {
      section.append(art(key));
      const sw = switcher(id, `${data.title}: problem, contribution and outcome`, data.steps.map((text, i) => [STEPS[i], text]), {
        label(button, [name]) { button.textContent = name; },
        detail(node, [, text]) { node.textContent = ''; node.append(el('span', 'work-reveal', text)); },
      });
      section.append(sw.wrap, actions([resumeLink(), contactButton()]));
    } else if (key === 'career') {
      const sw = switcher(id, 'Career milestones', data.milestones, {
        label(button, [when, what]) { button.setAttribute('aria-label', `${when}: ${what}`); button.append(el('span', 'work-when', when)); },
        detail(node, item) {
          const [, what, text] = item;
          node.textContent = ''; node.append(el('strong', 'work-detail-title', what), el('p', null, text));
          view.dispatchEvent(new view.CustomEvent('portfolio:career-step', { detail: { index: data.milestones.indexOf(item) } }));
        },
      });
      section.append(sw.wrap, actions([attrs(link('work-link work-primary', RESUME, 'Download resume (PDF)'), { type: 'application/pdf' }), contactButton()]));
    } else {
      const email = link('work-email', `mailto:${EMAIL}`, EMAIL);
      const copy = attrs(el('button', 'work-link work-copy', 'Copy email'), { type: 'button' });
      const status = attrs(el('p', 'work-status'), { role: 'status', 'aria-live': 'polite' });
      section.append(email, actions([copy, link('work-link', LINKS.linkedin, 'LinkedIn'), link('work-link', LINKS.github, 'GitHub'), resumeLink()]), status);
      mountCopy(copy, status, email);
    }
    views[key] = { section, title };
    hud.append(section);
  }

  const tabs = attrs(el('div', 'work-tabs scene-picker'), { role: 'tablist', 'aria-label': 'Professional work' });
  const tabButtons = EXPERIENCE.map((key) => {
    const button = attrs(el('button', 'work-tab'), { type: 'button', role: 'tab', id: `work-ui-tab-${key}`, 'aria-controls': `work-ui-${key}`, 'aria-selected': 'false', tabindex: '-1' });
    button.append(el('span', null, TAB_LABELS[key]), el('small', null, TAB_SUBTITLES[key]));
    return button;
  });
  tabRow(tabs, tabButtons, (index) => navigate(EXPERIENCE[index], 'tab'));

  s.on(panel, 'keydown', (event) => {
    if (event.key !== 'Escape' || mode === null || event.defaultPrevented) return;
    event.preventDefault();
    navigate(null, 'projects');
  });

  function mountCopy(button, status, email) {
    let attempt = 0;
    let clear = null;
    const settle = (state, text) => {
      s.cancel(clear);
      button.removeAttribute('aria-busy');
      if (state) button.setAttribute('data-copy-state', state); else button.removeAttribute('data-copy-state');
      status.textContent = text;
      if (state) clear = s.later(() => { clear = null; settle(null, ''); }, TIMINGS[state]);
    };
    const selectAddress = () => {
      try {
        const selection = view.getSelection && view.getSelection();
        if (!selection || !doc.createRange) return false;
        const range = doc.createRange();
        range.selectNodeContents(email);
        selection.removeAllRanges();
        selection.addRange(range);
        return true;
      } catch { return false; }
    };
    s.on(button, 'click', async () => {
      const mine = ++attempt;
      button.setAttribute('aria-busy', 'true');
      status.textContent = '';
      const clipboard = view.navigator && view.navigator.clipboard;
      let ok = false;
      if (clipboard && typeof clipboard.writeText === 'function') {
        try { await clipboard.writeText(EMAIL); ok = true; } catch { ok = false; }
      }
      if (disposed || mine !== attempt) return;
      if (ok) settle('copied', MESSAGES.copied);
      else settle('failed', selectAddress() ? MESSAGES.selected : MESSAGES.manual);
    });
    disposers.push(() => { attempt += 1; });
  }

  // Synchronously reflect the authoritative mode in visibility and ARIA state.
  const apply = (next, intent = null) => {
    const previous = mode;
    const focusWasInside = panel.contains(doc.activeElement);
    const source = request && request.mode === next ? request.focus : intent;
    mode = next;
    tabs.hidden = !EXPERIENCE.includes(next);
    panel.hidden = next === null;
    panel.setAttribute('data-work-mode', next || 'projects');
    body.classList.toggle('work-view', next !== null);
    for (const key of MODES) views[key].section.hidden = key !== next;
    markTabs(tabButtons, EXPERIENCE.indexOf(next));
    if (next === null) {
      if (tabButtons.every((b) => b.getAttribute('tabindex') === '-1')) tabButtons[0].setAttribute('tabindex', '0');
      if (previous !== null && source === 'home') focus(doc.querySelector('#welcome-resume'));
      else if (previous !== null && (source === 'projects' || focusWasInside)) focus(doc.querySelector('#projects'));
      return;
    }
    if (previous === next) return;
    // Only navigation moves focus: never on load, and never from an external
    // event while the visitor's focus rests on the page body.
    if (source === 'tab') focus(tabButtons[EXPERIENCE.indexOf(next)]);
    else if (source === 'title' || (doc.activeElement && doc.activeElement !== body)) focus(views[next].title);
  };

  const onMode = (event) => {
    const detail = event && event.detail;
    if (disposed || !detail || typeof detail !== 'object' || !('mode' in detail) || !validMode(detail.mode)) return;
    apply(detail.mode, detail.focus === 'title' ? 'title' : null);
  };

  s.on(view, 'portfolio:mode', onMode);
  panel.append(hud, tabs);
  tabButtons[0].setAttribute('tabindex', '0');
  panel.hidden = true;
  panel.setAttribute('data-work-mode', 'projects');
  body.classList.add('work-ui-ready');

  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const fn of disposers.splice(0)) fn();
      s.dispose();
      const focusWasInside = panel.contains(doc.activeElement);
      hud.remove();
      tabs.remove();
      panel.hidden = wasHidden;
      panel.removeAttribute('data-work-mode');
      body.classList.remove('work-ui-ready', 'work-view');
      if (focusWasInside) focus(doc.querySelector('#projects'));
    },
  };
}
