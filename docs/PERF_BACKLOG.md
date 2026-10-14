# Performance backlog

Drafted 2026-10-13 from a read of `dist/`. The site is already lean on the
critical path (fonts preloaded and `swap`, images lazy with dimensions,
Three.js deferred to idle, render loop paused off-screen). What remains is
dominated by one file: `vendor/three.module.min.js` at 676 KB, 85 % of the
page's bytes.

Each item is done when `npm run verify` is green and the before/after
number is recorded here.

## Measure first

1. **Baseline.** Lighthouse (mobile, throttled) on the live site and on
   `127.0.0.1:4317`: LCP, TBT, CLS, total transfer. Record it here so every
   later item has a number to move.
   **Done.** Live site, Lighthouse 12.2.1 mobile: score 85, FCP 1.7 s,
   LCP 2.3 s, TBT 450 ms, CLS 0, 267 KiB transferred (Three.js 174 KB of
   it gzipped). Boot-up: script.js 1.6 s, hero.js 0.8 s under 4x CPU
   throttling — script.js was not expected to be the top cost.

## The big one

2. **Tree-shaken Three.js.** `hero.js` uses 18 exports (WebGLRenderer,
   MeshStandardMaterial, IcosahedronGeometry, Raycaster, …). Bundle only
   those with a one-off esbuild script (`scripts/build_three.cjs`) into
   `vendor/three.hero.min.js`. Expected: 676 KB → roughly 350–450 KB
   (the renderer and shader chunks are most of it), plus less parse time
   on phones.
   **Done.** `vendor/three.hero.min.js`: 692 KB → 487 KB, gzip 174 →
   123 KB. Less than hoped: WebGLRenderer pulls in every shader chunk via
   ShaderLib, which is most of the library. `verify` now fails if hero.js
   uses a THREE.* name the subset does not export.
3. **Lighter material if it holds up.** `MeshStandardMaterial` pulls in
   the PBR shader chunks; a `MeshLambertMaterial`/`MeshPhongMaterial` with
   flat shading may look the same on dark faceted spheres and compile
   faster. Only if a side-by-side screenshot is indistinguishable.
   **Dropped.** Item 2 showed ShaderLib ships every material's shaders
   with the renderer, so this saves no bytes — only a one-time shader
   compile that already happens at idle. Not worth a visual change.

## Smaller wins

4. **One request for the twelve logos.** `hero.js` fetches 12 SVGs before
   it can draw. Inline them as a map in a generated module (or one sprite
   file) — 12 round trips → 0–1.
   **Done.** Sources moved to `assets/tech/`; `scripts/build_marks.cjs`
   generates `dist/tech-marks.js`, imported alongside Three.js. 12
   requests → 1; verify fails if the module is stale.
5. **Skip WebGL where it cannot pay off.** On `saveData` or
   `deviceMemory <= 2`, never download Three.js; keep the static hero.
6. **`content-visibility: auto`** on below-the-fold sections (with
   `contain-intrinsic-size`) so first render skips their layout/paint.
7. **Dev server content types.** `serve.cjs` serves `.svg`, `.webp`,
   `.woff2` as `application/octet-stream`; local measurements then differ
   from Pages. Add the types so item 1's local numbers are honest.

## Keep it fast

8. **Byte budget in `verify`.** Fail the build if `index.html` + CSS + JS
   (excluding the lazily loaded vendor bundle) or the vendor bundle grows
   past a set ceiling. A regression should be red, not discovered.
