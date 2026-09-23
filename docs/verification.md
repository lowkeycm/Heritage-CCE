# Design-review verification

2026-09-23, Codex / ChatGPT Work Mode.

## Scope and result

Seven-page visual review completed in the cloud browser using a temporary same-origin iframe with actual layout dimensions 1440×900 and 390×844. The desktop frame was displayed at 85% scale to fit the browser viewport. This is responsive browser verification, not a physical phone/touch-device test.

- Rendered and visually inspected Home, Services, PeelClear, About, Facility, Contact and Warranty at both sizes.
- Mobile navigation opens, shows all links and closes with Escape.
- Facility gallery opens the actual photograph, advances to photo 2, returns to photo 1 with ArrowLeft and closes with Escape. Reduced the mobile dialog's empty space after visual review.
- Truck slider Home/End reaches 0% and 100%; ArrowLeft updates by 1%; pointer drag changed the value to 49% before / 51% after. Screenshots confirmed white-before and black-after orientation.
- PeelClear pricing anchor works. Replaced mobile horizontal table scrolling with package rows showing all three vehicle prices; visually rechecked the correction.
- Contact's Continue to estimate link opens the existing https://heritagecce.com/contact form with photo-upload next step. No fields submitted and no production messages sent.
- Published PeelClear application films retained with native playback controls and external fallback links; both films played in-browser (20.633 and 101.007 seconds).
- Shared navigation and footer destinations, service anchors and image paths validated by the build check. Warranty strings verified against the captured current-site text.
- Browser errors observed during interaction were extension metadata errors from a chrome-extension origin, not site application errors.

## Build gate

`npm run build`, `npm run check`, `node --check public/app.js`, `git diff --check` and `bash -n .claude/hooks/session-start.sh` passed. The static check covers seven routes and 231 local links/assets. Vercel builds run both build and check. No separate GitHub Actions CI workflow exists.

## Limits

No estimate, email, photo-upload, chat or admin integration is implemented in this review build. Links to the current site's workflows are retained. Backend ownership and delivery remain unverified. Reduced-motion fallbacks are present in CSS/JS but a live operating-system preference toggle was not available through the browser API; do not claim that state was exercised. No physical iOS/Android test. Legal entity and conflicting published opening hours require owner confirmation. See migration-status.md for the launch gates.

The temporary `/review-layout/` QA page is removed before merge. It must not become a public product feature.
