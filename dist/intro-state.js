// File pair: intro.js, intro-state.js and intro.css are coupled adapters.
export const INTRO_DURATION = 9000;
export const INTRO_BEATS = Object.freeze([
  Object.freeze({ start: 0, index: 0, key: 'identity', section: 'Welcome', message: 'Andrei Bautin', caption: 'Software engineer. Professional experience and personal explorations.' }),
  Object.freeze({ start: 900, index: 4, key: 'knowledge', section: 'Experience', message: 'Knowledge, connected.', caption: 'An Azure RAG platform for engineering documentation.' }),
  Object.freeze({ start: 2200, index: 5, key: 'replication', section: 'Experience', message: 'Data, in motion.', caption: 'Asynchronous replication with Azure Service Bus.' }),
  Object.freeze({ start: 3500, index: 6, key: 'payments', section: 'Experience', message: 'Less manual work.', caption: 'Payment workflows automated with a bank-integrated microservice.' }),
  Object.freeze({ start: 4800, index: 1, key: 'terra', section: 'Projects', message: 'TERRA', caption: 'A procedural planet, from orbit to terrain.' }),
  Object.freeze({ start: 6200, index: 2, key: 'nacre', section: 'Projects', message: 'NACRE', caption: 'Liquid forms to shape, split and freeze.' }),
  Object.freeze({ start: 7600, index: 3, key: 'pelagic', section: 'Projects', message: 'PELAGIC', caption: 'An aquarium of responsive ocean life.' }),
]);

export function shouldStartIntro({ seen = false, reducedMotion = false, saveData = false, hash = '' } = {}) {
  return !seen && !reducedMotion && !saveData && !/^#(?:top|projects|terra|nacre|pelagic|construct|experience|career|contact|resume|work-(?:knowledge|replication|payments|career|contact))(?:$|[/?])/i.test(typeof hash === 'string' ? hash : '');
}

const validTime = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
export function createIntroState(now) {
  return { active: true, elapsed: 0, anchor: validTime(now) ? now : null };
}

export function advanceIntro(state, now) {
  if (!state.active || !validTime(now)) return state;
  if (state.anchor === null) return { ...state, anchor: now };
  if (now < state.anchor) return state;
  const elapsed = Math.min(INTRO_DURATION, state.elapsed + now - state.anchor);
  return { active: elapsed < INTRO_DURATION, elapsed, anchor: now };
}

export function pauseIntro(state) {
  return { ...state, anchor: null };
}

export function interruptIntro(state) {
  return { ...state, active: false, anchor: null };
}

export function introBeat(state) {
  if (!state.active) return null;
  return INTRO_BEATS.findLast(beat => state.elapsed >= beat.start) ?? INTRO_BEATS[0];
}
