// Isolated visual adapters; a failed enhancement leaves all career HTML usable.
import('./intro.js?v=acc7487778').then(module => module.mountIntro(document)).catch(() => {});
import('./experience-effects.js?v=085436df6f').then(module => module.mountExperienceEffects(document)).catch(() => {});
import('./career.js?v=f0125bc81b').then(module => module.mountCareer(document)).catch(() => {});
