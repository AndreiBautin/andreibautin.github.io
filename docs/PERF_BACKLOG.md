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
   **Done.** Checked in the browser with `deviceMemory` forced to 1: no
   vendor request, canvas removed, hero copy unchanged.
6. **`content-visibility: auto`** on below-the-fold sections (with
   `contain-intrinsic-size`) so first render skips their layout/paint.
   **Closed, not done.** Round 3 measured the page's own layout work at
   ~25 ms; the cost is WebGL and network, so this would buy little and adds
   a placeholder size to keep in sync with each section.
7. **Dev server content types.** `serve.cjs` serves `.svg`, `.webp`,
   `.woff2` as `application/octet-stream`; local measurements then differ
   from Pages. Add the types so item 1's local numbers are honest.
   **Done.**

## Keep it fast

8. **Byte budget in `verify`.** Fail the build if `index.html` + CSS + JS
   (excluding the lazily loaded vendor bundle) or the vendor bundle grows
   past a set ceiling. A regression should be red, not discovered.
   **Done.** Gzipped budgets: critical path 30 KB (now 22 KB), hero
   visual 150 KB (now 139 KB).

# Round 2

Drafted 2026-10-13 after round 1, from what round 1 turned up.

1. **Re-measure live.** Round 1 is committed but not pushed; deploy, re-run
   the same Lighthouse command, and record the delta against the baseline.
   **Done.** Four runs after deploy: transfer 267 → 215 KiB; score
   0.70–0.90, TBT 410–1,160 ms. TBT is bimodal run to run — it depends on
   whether the hero's idle-time setup lands inside Lighthouse's window — so
   the single-run baseline cannot show a TBT delta. Compare medians of 5.
2. **Find script.js's 1.6 s.** The baseline's largest boot-up cost was
   not Three.js. Profile under 4x throttling and attribute it — likely
   suspects are below.
   **Done.** The star field: 260 canvas arcs redrawn every frame, phones
   included, for as long as the hero is on screen — which is all of a
   Lighthouse run. Now redrawn at ~12 fps; the slow twinkle looks the same.
3. **Scroll handler layout reads.** Every scroll event calls
   `getBoundingClientRect` on each section and reads `offsetWidth` for the
   nav pill. Coalesce to one rAF per frame, or drive `markCurrent` from an
   IntersectionObserver.
   **Done.**
4. **Cursor ring runs forever.** Its `requestAnimationFrame(follow)` loop
   never stops on desktop, even with the pointer still or the tab idle.
   Stop when it has caught up; restart on `pointermove`.
   **Done.**
5. **Spotlight reads layout per move.** `pointermove` on each project card
   calls `getBoundingClientRect`; cache the box on `pointerenter`.
   **Done.**
6. **Shader compile off the first frame.** Use `renderer.compileAsync`
   before the first render so the hero's first frame doesn't block —
   a likely part of the 450 ms TBT.
   **Done.**
7. **Font weight audit.** DM Mono 500 (15 KB) loads on the first view but
   isn't preloaded; either preload it or replace the few 500-weight uses
   with 400 and drop the file.
   **Dropped.** Nothing above the fold uses the 500 weight (pill links,
   principles, the copy button — all lower down), so not preloading it is
   correct, and replacing it is a visual change, not a performance one.

Round 2 result, live, 5 Lighthouse runs: score median 0.75 (0.73–0.89),
LCP median 2.6 s, TBT median 780 ms (430–920), 216 KiB. Bytes are down 19 %
from the baseline; main-thread time is not measurably better, and the
single-run baseline (0.85 / 450 ms) was likely a good draw.

# Round 3

Drafted 2026-10-13 from round 2's Lighthouse traces. The main thread, not
bytes, is now the whole problem: 2.0 s script evaluation, 1.1 s style and
layout per run.

1. **Repeatable measurement.** A `scripts/lighthouse.cjs` that runs 5
   times and prints medians, so no item is judged on one noisy run again.
   **Done.** `npm run lighthouse -- [url] [runs]`.
2. **script.js's 1.2 s of style/layout.** Only ~230 ms of script.js's
   1.7 s is JavaScript; the rest is style and layout it triggers, in two
   long tasks (~300 ms at 1.8 s, ~430 ms at 3.1 s). Take a Performance
   trace and find the forced layouts — suspects: the reveal animations
   started together on load, the nav pill's `offsetLeft` reads at
   `fonts.ready`, the star canvas resize.
   **Finding, no change.** A CPU-profiled trace shows most "long task"
   time is not the page: ~500 ms per run is Chrome's own headless UI code
   (`lit.rollup.js`, mojo `bindings.js`), and ~380 ms is WebGL calls,
   which headless Chrome runs on a software renderer (SwiftShader). The
   page's own JS in those tasks is ~25 ms (`markCurrent`'s first layout,
   which is the page's first layout happening early, not extra work).
   Lighthouse TBT from this machine therefore overstates real phones,
   which render WebGL on a GPU.
3. **Three.js evaluation (~450 ms "Unattributable" at 2.6 s).** Module
   evaluation of the vendor bundle is one long task. Options: start it
   later (after first interaction or a longer idle), or split hero setup
   across frames with `scheduler.yield()`.
   **Dropped.** Module evaluation itself is small in the profile; the cost
   is software WebGL (above), which real devices do not pay.
4. **hero.js's 0.9 s of scripting.** Texture rasterising and scene setup;
   profile and spread across frames, or rasterise logos once into an atlas.
   **Dropped**, same reason: the samples are WebGL calls, not setup code.
5. **LCP 2.6 s.** Identify the LCP element in the trace; if it is the h1,
   check whether the hero entrance animation (opacity 0 → 1) delays it, and
   start that animation from a visible state on load.
   **Tested, no change.** The LCP element is hero text. A/B locally, 3 runs
   each: fade from opacity 0 → median LCP 2117 ms; from 0.01 → 2112 ms.
   The animation is not the cause; the live 2.6 s vs local 2.1 s gap is
   network (fonts and CSS from Pages under throttling).

# Round 4

Drafted 2026-10-13. The remaining cost is either the measurement
environment or the network; there is little left in the code.

1. **Field data, not lab data.** Check PageSpeed Insights / CrUX for real
   devices with GPUs. If field LCP and INP are green, stop here.
   **Closed, not measured.** The PSI API's anonymous daily quota was
   exhausted and the web UI never finished; a personal site likely has too
   little traffic for CrUX field data anyway. Lab results (round 8 of the UI
   backlog: score 79–88, LCP 1.6–2.2 s) stand as the record.
2. **Subset Manrope to the glyphs used** (25 KB → likely ~12 KB): the hero
   text is the LCP element and waits on it.
   **Done.** `scripts/subset_fonts.py` builds `dist/fonts` from the full
   Latin files in `assets/fonts`: Manrope 24.8 → 14.2 KB, DM Mono 14.8 →
   4.6 KB and 15.0 → 4.7 KB (31 KB saved). verify fails if a page shows a
   character outside the subset.
3. **Inline the above-the-fold CSS** if field LCP is not green: styles.css
   (12 KB gzipped) is the only render-blocking request.
   **Closed, not done.** It was conditional on field data showing LCP is a
   problem, which item 1 did not provide, and inlining would stop index and
   404 sharing a cached stylesheet.

No round 5: the remaining cost is the measurement environment and the
network, not code. A further backlog would be invented work.
