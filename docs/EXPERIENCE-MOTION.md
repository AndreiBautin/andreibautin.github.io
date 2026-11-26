# Experience motion

Knowledge, replication and payments share the original point field in `dist/hero.js`. Their choreography is analytic GLSL 1. It does not rebuild buffers on the CPU, sample a clock outside the existing frame time, or invent service state. The name, planet, ribbon and jellyfish motions are unchanged. Career and contact keep their previous packet drift.

`positions.w` is still the motif tag from `dist/work-shapes.js`: 0 anchor, 1 packet, 2 connection. The shader reads that tag and the settled position. It does not retarget geometry.

## What moves

Knowledge. The nucleus and its orbits turn slowly about the view axis, faster on the core than on the halo, so the disc stays circular. Document stacks only shift a few hundredths in Z. Packets advance inward from their sampled stations toward the origin and fade at the wrap. This is a bounded artistic approximation of retrieval, not a simulation of messages following exact curves. Connection arcs carry a brightness band that travels toward the nucleus.

Replication. The source cylinder at negative X rolls about its axis. Each helical lane rolls about the lane center (`y` of -1.62, -0.54, 0.54, 1.62). Packets advance in `+X` and around that center by one turn per cycle, then fade at the wrap. The inlet shows a brightness wave from the cylinder toward the lanes. Receiving rings roll in place.

Payments. The double-depth annulus keeps its silhouette. A highlight sweeps the clock, and depth breathes by less than 0.03. Gold packets advance along the existing `+X` output and fade at the wrap. The inset ring counter-rotates slowly. The coral braid keeps a travelling glint and a very small tangent shiver.

Depth shade uses particle Z and fades with the experience weight, including the reduced-motion still. Travelling glints, packet fades and displacements are multiplied by the motion weight, so reduced motion is a composed still.

## Transitions

`uFlow` eases toward 1 only after a morph settles on knowledge, replication or payments, and back toward 0 on entry, exit or interrupt. `uFlowWork` changes only while that weight is near 0, so the scene id does not swap under a live offset. Morphs stay interruptible. The camera does not orbit.

## Verified here

`npm run stamp` and `npm run verify` (source gate, policy, tests). No browser, GPU capture or headless shell was run. Native appearance of the sweeps, helix roll and packet wraps is still pending on a real GPU.

Integration corrected three descending `smoothstep` ranges, which have undefined
GLSL behavior, to complements of ascending ranges. The shader regression checks
constant range ordering and the actual frame function's transition weights;
neither check claims to compile GLSL or establish cross-GPU appearance.
