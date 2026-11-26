# Work shapes

`dist/work-shapes.js` exports `createWorkShapes(count, seed = 69)`. It returns five
particle targets, in order: knowledge, replication, payments, career, contact.
Each target is `{ positions: Float32Array(count * 4), colors: Float32Array(count * 3) }`.
The module is browser-free and deterministic. `hero.js` does not import it yet, so the
file names itself to satisfy the orphan scan until that integration lands.

Coordinates match the current stage: centered near the origin, with visible limits
x ±5, y ±3.2, z ±2.2. Desktop translation and mobile scale stay in the renderer.
`count` is an integer from 1 through 60000. `seed` is a finite integer. The same
index bands are used in every scene so a point keeps its role while morphing between
these targets and the existing name, planet, ribbon and jellyfish.

`positions.w` is a motif tag, never above 2:

| Tag | Role | Shader motion that stays legible when reduced motion is off |
|---|---|---|
| 0 | Body or anchor. Cores, documents, lane volume, clock ring, milestone nodes, destination orbs, the open nexus. | Hold still, or a very slow rock of the whole anchor. |
| 1 | Moving packet. Beads on arcs, queued lane clusters, throughput marks, milestone satellites, travelers between nexus and destination. | Drift along the motif tangent. Do not add a second random field. |
| 2 | Connection or faint context. Convergence arcs, the inlet split, the manual tangle, the career path, destination links, dim guide paths. | A restrained pulse along the link. Keep it dimmer than tag 0. |

Reduced motion should show the static silhouette only. No scene samples text, and none
encodes a performance number.

## Scenes

Knowledge. Four tilted document sheets sit off center. Cyan arcs run from each sheet
into a gold query core at the origin. Packets are small beads stopped along those arcs.
Faint sheet ghosts sit just outside the documents.

Replication. A serial inlet occupies the left. It splits into four ordered horizontal
lanes, bottom to top. Packet clusters queue at regular stations on each lane. A dim
return path runs underneath from right to left. Accent color is not used here.

Payments. A sculptural ring is the workflow clock: short ticks are geometry, not digits.
A coral trefoil sits on the left side of the ring as the manual tangle. Gold packets
leave the right side of the ring on one straight throughput path. A dim inner ring is
context only.

Career. Four nodes rise from lower left to upper right and grow slightly. Orbital rings
and a few satellites sit on each node. The path between nodes is the connection. Only
the latest node is gold. A dim baseline marks the ascent.

Contact. An open ring at the origin is the nexus, with a gap toward the top. Three
orbs — upper left, upper right, and lower center — join it by arcs. Packets sit on
those arcs. A faint wide ellipse is the outer context. Accent color is not used here.

## Palette

Matrix green, sage and cyan are the body colors. Gold is reserved for the knowledge
core, the payments throughput packets and the latest career node. Coral is reserved
for the payments tangle. Brightness varies a little inside each color so a surface
reads as lit, without a random rainbow.
