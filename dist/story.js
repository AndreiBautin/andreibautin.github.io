// Isolated visual adapters; a failed enhancement leaves all career HTML usable.
import('./experience-effects.js?v=085436df6f').then(module => module.mountExperienceEffects(document)).catch(() => {});
import('./career.js?v=c1ec046c23').then(module => module.mountCareer(document)).catch(() => {});
