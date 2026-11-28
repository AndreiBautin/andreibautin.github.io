# Interactive demo apps

The portfolio remains a static, single-screen particle application. Its project
models are previews; opening a project enters the standalone app. Each demo has
a stateless API for its rules and browser-local saves. There are no accounts,
shared worlds, cloud saves, or cross-device sync.

## NACRE

One editable sculpture combines slime, clay, and ice. Drop, launch, crush,
slice, heat, and freeze pass the sculpture to the API, which returns changed
particles, bonds, velocities, and temperature. WebGPU renders the continuous
surface while a bounded browser solver advances gravity and contact between
commands. Undo restores the prior state; local saves retain material and damage.
Legacy scenes and archive data remain in the source app.

Main `a980f5b7f52ae8609ad81ea9682984dc3b47ea08` passed the full gate with
185 tests and native GPU readback. The public deployment was checked in native
Chrome: a running mixed sculpture, a visible slice, Undo, and a second slice
retained after refresh. The anonymous live API also returned changed bonds for
a real slice, and its release receipt matched that commit.

These are bounded particle/contact approximations, not engineering material
models. Touch, device-loss recovery, and a long editing session were not fully
checked in the native browser.

## PELAGIC

A jellyfish, manta, and hammerhead share the spectral scene. Click or keys 1-3
choose the controlled animal. Each has a signature action and nearby animals
react; release eases back to the overview. Movement and action batches pass
through the API. Local saves retain progress. There is no aquarium mode.

Main `b60d4775f4400a2995814d41a8a358b5718b30b5` passed the full gate with
153 tests. Native Chrome checked all three animals, selection, the manta chase
view and action control, release, and the live connection status. An anonymous
API request selected the manta and applied its action; the public release
receipt matched that commit. Sustained held-key movement, mobile input, and
audio remain outside this native acceptance pass.

## TERRA

The original seed-based generator and flight remain. On-foot survival adds
harvesting, tools, larger construction pieces, digging, recoverable supplies,
and telekinesis, fire, ice, and flight with shared energy and use progress.
Camp changes and character progress belong to the saved world, keyed by seed
and generation settings. The existing Pages URL retains its browser origin
and uses the hosted API; the hosted app uses that same API directly.

The integrated gate passed 605 tests in 100 files, including real worker-patch
regressions for floating in inland water and full-pack resource retention.
The [public Worker app](https://terra.andreibautin94.chatgpt.site) was checked
without login: planet, streamed terrain, flight, drop, Craft, and floating water
in native Chrome. Local native checks also confirmed ice and fire casts, cursor
release, and takeoff. A separate 79-request public API fixture sequence checked
harvesting, crafting, building, dismantling once, excavation, power cost and
progress, camp travel, JSON reload, death, and recovery once. Renderer-tree and
near-death fixtures make that an API test, not a native playthrough.

A complete harvested and built outpost, sustained native movement, touch, and
long play remain unaccepted in the native browser. Full packs now refuse an
action that would discard its source; partial supply-bag recovery keeps the
remainder. Deep rivers and lakes use the drawn water sheet for floating.

This is a bounded survival extension: four camps per saved world, with finite
construction, excavation, and resource records. A fifth unrecovered death bag
discards the oldest; there is no dedicated camp-return navigator yet. Survival
props, creatures, and emissive fire effects use simple proxy graphics. It is
not a finished Minecraft replacement or a scientific terrain/ecology simulation.
Thaumara remains tabled.

## Evidence boundaries

Automated gates establish rule, storage, transport, and packaging behavior;
they do not establish visual quality or every real input sequence. Public
deployment receipts and native acceptance records live in the operator's
control directory outside Git. No provider transcript or credentials ship in
the portfolio. The earlier [acceptance queue](SUITE-ACCEPTANCE.md) is historical.
