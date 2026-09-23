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

## Services and About refinement, 2026-09-23

Branch clay/services-scroll-craft, PR #3. Published Services trust figures confirmed in the live site's actual DOM. Scroll Craft bundle integrity and runtime doctor passed with documented optional warnings; cloud browser substituted for unavailable local Chrome. The exact unmodified engine drives service flow progress; native sticky panels supply overlap.

- Services inspected at 1440×900 and 390×844 layouts using the temporary same-origin frame. All six panels and five overlapping transitions visually checked by actual wheel scrolling; progress and sticky positions measured from rendered DOM. Text, bullet lists, photos and CTA remain readable. Phone layout uses normal flow, with no horizontal overflow.
- Shared Services disclosure checked on desktop and mobile. Enter opens; Tab reaches the first service; Escape closes the submenu and a second Escape closes mobile navigation. Clicking a service closes menus.
- Found that a native fragment aimed at a sticky article could land behind later panels. Moved fragment targets to zero-height natural-flow markers. Retested last-service then first-service navigation on deployment e6bfe35e249215becc7722baaaaf6e11cb02c64c: correct visible panels. Focus on a covered panel's link returns to its natural position.
- Enhanced About photo visually checked at both viewports. Source preserved; 1448×1086 enhanced WebP displayed with responsive cropping. AI restoration may reconstruct fine details.
- Build/check, JavaScript syntax and whitespace gates pass; 275 local links/assets checked and unchanged warranty/truck mapping preserved. Vercel branch builds pass.
- Reduced-motion fallback is implemented but OS preference toggling remains unavailable in this browser. No physical phone test. Browser logs contain extension metadata errors, no observed site JavaScript errors.

The initial remote checkpoint was necessary to render this shell's changes on the connected cloud browser; final verification precedes the final commit/merge. Temporary QA route removed before merge.
