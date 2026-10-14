# Premium UI backlog

A pass over the published site on 2026-10-09 at 1440 × 900 and 375 × 812,
looking for what separates it from a premium, modern portfolio. The bones
are good: the type scale, the acid accent, the hero, the inverted About
band and the ticker all read as designed. What follows is ranked by how
much each would change a first impression against how long it takes.
Nothing here touches the resume facts.

## Tier 1 — the first ten seconds

1. **Sticky, translucent header.** The nav scrolls away at once; a
   backdrop-blurred bar that stays, with the current section marked,
   is the single most recognisable "finished" cue on a one-page site.
   Also add **Projects** (the independent work) and **Resume** links.
2. **Project cards that respond.** No hover state on any card: lift
   the card a few pixels, scale the thumbnail 1.03 over 600 ms, and let
   the whole card be the link (the heading and image clickable, not
   only the two text links at the end of the paragraph).
3. **A favicon and an app icon.** There is none — the tab shows the
   browser's default. One SVG `AB.` mark in the accent colour, a 180 px
   PNG for iOS, and `theme-color` for both themes.
4. **The large employer card's visual is mostly empty.** 620 px tall
   with three thin orbits and a 140 px `AI` disc. Either animate it (a
   slow orbit, a pulse on the core) or halve its height on desktop.
5. **Link affordance.** Body links are plain underlines in muted text;
   the premium cue is an underline that grows from the left on hover
   and an arrow that slides on `Live app →`.

## Tier 2 — polish that is felt more than seen

6. **`prefers-reduced-motion`.** The ticker, the hero entrance and the
   scroll-in fades all run regardless; respect the setting (hold the
   ticker still, skip the translate).
7. **Focus-visible styles.** Keyboard focus falls back to the browser
   ring, which clashes with the dark theme; a 2 px accent outline with
   offset on links, buttons and the theme toggle.
8. **Theme toggle feel.** It flips instantly; a 250 ms colour transition
   on `background` and `color` at the body level makes the flip read as
   deliberate. And the icon should change (sun ↔ moon).
9. **Section rhythm on phone.** 90 px section padding is right, but the
   Experience column is a long unbroken run of small text on 375 px:
   give the two `h3` groups a top rule and more space before them, and
   set the skills as a two-column list of chips.
10. **The ticker's duplicated row** is the right trick but the join is
    visible as a pause at the seam on some widths; use exactly two
    copies in a flex track and animate by 50 % of its own width.
11. **Thumbnail captions.** The pill at the bottom-left of each
    thumbnail repeats the `meta` line below; one of the two should go,
    or the pill should carry something the copy does not (the year, or
    "PWA · offline").
12. **Scroll-in animation of the heading pairs.** Headings pop in whole;
    staggering the kicker and heading by 80 ms, and the paragraph after,
    reads as choreography rather than a fade.

## Tier 3 — content and structure

13. **A skip link** to `#work` for keyboard users, and `aria-current` on
    the nav as the sections pass (goes with item 1).
14. **The Experience section is a resume re-typed.** It is the longest
    section and the least designed: a timeline rail with the two roles
    as nodes, dates in the mono face, and the skills grouped as chips,
    would make it scannable in five seconds.
15. **Open Graph image per project.** The site's OG image is generic;
    a planet from orbit would get more clicks when the link is shared,
    and the image already exists.
16. **A short line of proof under each independent project**: the test
    count, the deploy gate, the lint-enforced architecture, as three
    mono-face tags rather than buried in the paragraph.
17. **Print stylesheet.** `Download resume` covers it, but a page that
    prints cleanly (no dark backgrounds, no ticker) is a small, rare
    courtesy.
18. **Lighthouse pass** after the above: fonts load from Google with
    `display=swap`, which is fine, but self-hosting the two faces as
    `woff2` removes the only third-party request and the FOUT on first
    paint.

## Not worth doing

- A page loader or splash: the page is one HTML file and paints at once.
- Parallax on the hero: it fights the type and reads as 2015.
- A dark/light auto-switch by time of day: the toggle is enough.

## Measured

- No horizontal overflow at 375 px (`scrollWidth` 375).
- Page height 7,397 px at 1440 wide, 8,902 px at 375.
- Verify passes; the only JavaScript is 23 lines.

## Done (2026-10-09)

Tier 1 (1–5) and tier 2 (6–10, 12) as listed; 11 kept as is (the pill and
the meta line carry different text). From tier 3: 13 (`aria-current`),
14 (the timeline rail), 15 (a planet OG image) and 16 (proof tags). And
beyond the list, because the first two tiers read as no change: **a
planet in the hero** (a 1000 px frame from the generator, masked and
turning, over a star field) and **an at-a-glance strip** of four
resume numbers under it. Left: 17 (print stylesheet), 18 (self-hosted
fonts), a skip link.

## The hero, again (2026-10-09)

The planet was rejected as a random space vibe and a lazy reuse. The hero
now runs edge to edge (the page's wrap is `min(1760px, 100% - 80px)`) with
**a cluster of faceted spheres in Three.js** (`dist/hero.js`, three vendored
in `dist/vendor/`), each wearing one technology's mark from the CC0 Simple
Icons set (`assets/tech/`), floating and tilting, with a slight
parallax to the pointer, in the dark-blue palette with the acid rim light.
The Explore button sits under the copy, over nothing. On a phone the
cluster drops below the button into space reserved for it. Seen at 1440 and
375. Not seen: a real phone's frame rate.

## Round 2: sleeker and more premium (2026-10-13)

Done, one commit each: the `Live app` arrow (a CSS escape stored as a raw
NUL byte, so it drew `�0→`; verify now fails on control characters),
lit-glass cards with pill chips, a pointer spotlight on cards, film grain
and a vignette, self-hosted fonts (no third-party requests left), a masked
hero name reveal, scroll reveals for the proof strip, experience and
contact, a magnetic Explore and Email button, a contact card with a
copyable address, a skip link, and a print stylesheet.

Found on the way: **the sticky header never stuck.** `overflow-x: hidden`
on both `html` and `body` makes `body` a scroll container that does not
scroll; `overflow-x: clip` fixes it. With it sticking, the header now
compacts on scroll and marks the section with a sliding pill. Contact was
never marked current (too short to reach the line); it is now at the
bottom of the page. The light theme's ledger fade was dark.

Dropped: the "dead space above the planet card" was the heading caught
mid-fade, not a gap (70 px, like every intro).

Seen at 1024 and 375 wide, dark and light. Not checked: the clipboard
success path (the preview browser refuses clipboard writes; the fallback
that selects the address is what was seen), print output on paper, a
real phone.

## Round 3 (2026-10-13)

Done: the eyebrow dot no longer wraps alone on a phone; a phone menu
(every link in a sheet) replaces hiding Work and Projects; the email
address is the contact section's single call to action; the light
theme's ledger rows are readable; the AI card's rings carry Azure
OpenAI, AI Search, Blob Storage and App Insights (and the outer ring now
turns at the 70 s reverse it was written for, which a more specific
shorthand had overridden); the at-a-glance numbers count up; section
intros read from the left under a ruled kicker; the footer has the mark
and profile icons.

No change needed: the hero in the light theme (dark glass spheres read
as intended), and smooth anchor scrolling (already `scroll-behavior`
plus `scroll-margin-top`). Dropped from the footer: a "built with" line.

Seen at 1024 and 375, dark and light. Not checked: a real phone, the
menu with a screen reader.

## Round 4 (2026-10-13)

Asked for alongside: the at-a-glance strip drops the certifications
count (three numbers now; the certifications stay under Experience).

Done: the LiftOS and DJ screenshots sit in browser-window frames, tipped
back and settling on hover; experience timeline nodes light as they pass
mid-screen; the ticker is in the display face with faded edges and
pauses under the pointer; the About panel's edges are lit hairlines;
touch screens get a press response on cards and buttons; Three.js is
fetched after `load` instead of at once (690 KB that competed with the
fonts); the share image is a capture of the current hero
(`images/og-hero.jpg`, made with headless Chrome at 1600 × 840 scaled to
1200 × 630), replacing the planet from the rejected first hero.

Not checked: the press response with a real finger (the preview sends
mouse clicks), the load change on a throttled connection, and how a
given site (LinkedIn, Slack) renders the new preview.

## Round 5 (2026-10-13)

Done: the hero name grows to 8.75 rem at 1500 px and up (kept on two
balanced lines; widening its column put it across a sphere); project
titles are headlines; Live app and Source are a pair of pill buttons;
the theme spreads as a circle from the toggle (view transitions, plain
switch elsewhere); a ring trails the pointer and swells over clickable
things; skills used in the projects are lit, with a key; an
accessibility pass (contrast of every text node in both themes, tab
order) fixed the light theme's skip link and payments tag and gave the
three thumbnail links distinct names.

Found on the way, older than this round: **on a phone the independent
projects were 1330 px wide**, clipped by `overflow-x: clip`, so their
text ran off the right edge. A desktop `min-height: 460px` on the
planet card outranked the phone override and, with the card's aspect
ratio, set the column's width. Fixed at the source (4:3 card on a
phone) and guarded (`minmax(0, 1fr)` tracks).

Not checked: the theme circle mid-animation (too quick to capture), a
screen reader on the new link names, a real phone.

## Round 6 (2026-10-13)

Done: one spacing rhythm for all six project cards on a phone (the wide
ones kept their desktop gap); the replication and payments visuals run
three times as fast under the pointer (`playbackRate`, so no jump); the
name's gradient is ink to deep teal in the light theme; the resume PDF
was checked against the site (every fact matches) and its button says
"PDF · 54 KB"; the favicon follows the theme and the tab title names the
section being read; a branded `404.html` (live: a missing path answers
404 with it).

Not checked: the 404 page in the light theme on the live site, a real
phone.

## Round 7 (2026-10-13)

From a real iPhone: the page showed through a strip between the status
bar and the sticky header. Now `viewport-fit=cover` with the header
padded by `env(safe-area-inset-top)` and its background extended upward.
Not yet confirmed on the phone (an emulator's inset is 0).

Done: the hero's WebGL spheres and star canvas stop drawing while
scrolled away (62 frames a second in the hero, 0 below it). Lighthouse
on the live site, mobile: Accessibility, Best Practices and SEO 100;
the one accessibility failure (label-in-name, six links) is fixed.
Performance ran 90, 77, 64 and 75 on the same code: total blocking time
swings 180 ms to 1.3 s, mostly the hero's WebGL setup, which headless
Chrome renders in software. Left alone: cache lifetimes (GitHub Pages
sets them) and "unused JavaScript" (Three.js, unbundled).

Skipped: a 3Cloud logo and company line under Experience; no logo file
to use, and the description of an employer is the owner's to write.

## Round 8 (2026-10-13)

The hero's 3D waits for an idle moment after load, renders at 1.5x on
phones and skips antialiasing on dense screens. Lighthouse mobile,
three runs each on the live site: before 77 / 64 / 75 (blocking time
0.86 to 1.3 s, LCP 2.3 to 3.6 s); after 88 / 79 / 82 (blocking time
0.46 to 0.78 s, LCP 1.6 to 2.2 s). Still noisy, still mostly WebGL setup
in a software-rendered headless browser.
