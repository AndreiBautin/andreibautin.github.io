// Isolated visual adapters; a failed enhancement leaves all career HTML usable.
import('./experience-effects.js').then(module => module.mountExperienceEffects(document)).catch(() => {});
import('./career.js').then(module => module.mountCareer(document)).catch(() => {});
