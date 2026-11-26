# Experience scene quality

The five professional scenes (knowledge, replication, payments, career, contact)
are bounded artistic particle targets from `dist/work-shapes.js`. They suggest a
structure; they are not service diagrams, live data or measurements. They hold
no metrics, clients or dates, and every fact stays in the accessible HTML that
comes from the resume. "Good" here means legible, restrained and stable, judged
by eye. These checks lower the risk of a broken scene; they cannot prove one is
attractive.

## What the automated tests establish

`scripts/work-shapes.test.cjs` runs against the real `createWorkShapes`, at the
population tiers read from `dist/hero.js` (desktop 42000; adaptive prefixes 24000
and 18000 drawn with `setDrawRange(0, n)` from the same buffer).

- All samples are finite, tagged 0/1/2, and inside x ±5, y ±3.2, z ±2.2 up to 60000.
- Output is deterministic per integer seed; invalid counts and seeds throw.
- Every prefix of the desktop buffer keeps tags 0/1/2 within 2 particles of their
  0.60/0.12/0.28 share, so 18000 and 24000 keep all three tags in proportion.
- Prefixes keep at least 60% of the full depth spread (z standard deviation).
- The full buffer fills every structural bin: four document quadrants and both
  core hemispheres, four replication channels and the source cylinder, twelve
  payments annulus sectors, four career nodes and three contact destinations.
- Counts 1 to 60000 allocate by largest remainder and paint every slot.

## Defects found and corrected during integration

These are active regression tests in the full gate, with no todo exemption.

- **F1, prefix coverage.** A coprime spatial traversal inside each band preserves
  every lane, quadrant, node, destination and annulus sector at both prefixes.
- **F2, sphere belts.** Each career node and contact destination now samples
  a complete local Fibonacci sphere rather than a latitude slice of a shared one.

Details and measured counts are in the control findings file for this task.

## Native acceptance checklist

Run it on the local server (`npm run dev`, port 4357) on real hardware, in a
desktop window at least 1280 px wide and a narrow window under 700 px. No
automated browser check replaces it.

1. `npm run stamp`, then `npm run verify`, both pass without todo tests.
2. The page opens on the immersive single stage. There is no scrolling resume
   homepage. The name forms from particles with no fallback flash.
3. Open each professional mode from the work panel. Each scene reads at a glance:
   - Knowledge: a central core, four tilted document stacks with visible edge
     depth, arcs and beads running inward.
   - Replication: a capped source cylinder on the left, four ribbed channels,
     queued packets, receiving rings on the right. No accent color.
   - Payments: a double-depth ring with discrete teeth, a coral tangle on the
     left, gold output to the right, an inset ring. Ticks are geometry, not digits.
   - Career: four rising nodes, the last in gold, a connecting path and baseline.
   - Contact: an open ring with three destination orbs joined by arcs. No accent.
4. Rotate or rock through the transitions. Each scene shows depth, not a flat sheet.
   Transitions between scenes and the original four forms stay interruptible.
5. Force the adaptive reduction: sustain load until the 24000 and 18000 tiers
   engage. Confirm the full arrangement stays readable at both tiers.
6. Turn on reduced motion. Scenes appear still, changes are instant, and content
   stays readable.
7. Back and Escape restore the previous project. Project, resume and contact links
   work before the scene loads and with the renderer disabled.
8. Narrow window: the panel and stage fit with no clipped controls. Only panel
   details scroll.
9. Keyboard only: every mode, link and close control is reachable and visible.
10. Record pass, fail or deferred for each item, with the browser, device and
    date. Do not record a pass for an item you did not look at.
