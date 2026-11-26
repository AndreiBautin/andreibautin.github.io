# Restored single-screen presentation

The November 25 scrolling story composition was rejected by the user. Main
restores the presentation and verification sources from 60bd42e, including the
single-screen particle scene, project switching, and original experience/contact
dialog. The approved PDF remains unchanged. The new introductory tour is also
removed from the active page with that composition.

All rejected integration and individual provider work remains available on
`preserve/scroll-story-20261125` at
`56bc0996b8a2dda10a91d99e205f9fc300e785c0`. No provider branch was deleted and
no public push or deployment was made. Reuse of that work must extend the
existing interactive presentation rather than bring back the scrolling layout.

Run `npm run stamp`, `npm run verify`, and the local smoke check. Native review
must confirm the restored particle scene and click-open experience panel. This
restoration does not claim a newly designed experience scene is complete.

Validation: `npm run stamp` and `npm run verify` passed (20 check groups plus
tests). Native Chrome at the local preview showed the restored green particle
name, one-screen project navigation and original click-open experience dialog.
The dialog opened and closed, and Chrome was returned to fullscreen on the left
monitor. All `dist/` files match 60bd42e byte-for-byte.
