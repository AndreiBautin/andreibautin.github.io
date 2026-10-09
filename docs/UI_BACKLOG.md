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
