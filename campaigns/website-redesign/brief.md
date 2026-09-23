# Heritage CCE website redesign

Owner direction: 2026-09-23. Expand the approved Sites concept into the full site, using current navigation as the guide. Mainly aesthetic; preserve business behavior and identity. This is the first design implementation, not production cutover.

## Selected direction
Premium industrial/editorial, approved by Clay in the prior preview. Reuse its navy #1A2A4A and orange #E67451, layered workshop photography, inset arrow buttons, technical background grids, independent photo planes, and scroll-progress/step emphasis. Keep direct contact and service navigation familiar. Desktop gets restrained parallax; mobile gets offset still layers; reduced-motion removes transforms and reveals. No cinematic video scrub or live 3D is proposed.

## Page jobs
- Home: identify commercial and specialty repair, route by need, show real before/after work.
- Services: explain the six existing service categories and vehicle types.
- PeelClear: explain the spray-applied product, finishes and published starting prices; preserve quote path and existing videos. Avoid unverified absolute superiority/risk claims.
- About: show the business history and working principles, link to facility.
- Facility: browsable gallery of all existing shop photos, proof rather than decorative stock.
- Contact: phone, email, directions and estimate path; preserve the production submission workflow until backend migration is verified.
- Warranty: exact current legal wording with readable navigation and layout.

## Research and reuse
The homepage direction was approved before this session. Original references are recorded in its design-notes.html: Awwwards United Carriers, 21st Background Beams, and Godly Superpower. This pass primarily extends that established system, not a fresh brand selection.
- https://www.awwwards.com/sites/united-carriers : prior preview reference for overlap and strong transport imagery. Current research fetch unavailable; do not claim new live motion inspection.
- https://21st.dev/@manuarora700/components/background-beams : current source describes flowing background paths. Use restrained angled light inside navy surfaces, not its component or a new dependency. Current HTML/source access only until rendered evidence is added.
- https://godly.design/website/superpower/ : current gallery provides desktop/mobile section references; only gallery evidence, not proof of conversion.

## Composition and assets
Preserve the asymmetric layered homepage hero. Services uses numbered open editorial rows rather than another six-card grid. PeelClear uses a dark product stage, paired finish imagery and readable pricing table. About uses a large year and workshop photo stack. Facility is a wide main image with selectable thumbnails and accessible lightbox. Contact uses a lighter working surface with a dark contact rail. Warranty is a clear paper-like legal surface within the same identity. Different page jobs keep different compositions.

Use only real existing shop/gallery imagery and existing product imagery, with their provenance recorded. No generated photos presented as actual work. White truck = Before; black truck = After, regardless of legacy filenames.

## Migration boundaries
Live JS exposes routes /, /services, /peelclear, /about, /facility, /contact, /warranty, /admin. Estimate flow includes photos, callback-only mode and settings-driven functions. It references legacy Supabase zxzzmrkyctbgxlgjritv. Do not alter that project or assume ownership of shared tables. Keep admin and live estimate access on the existing domain for this preview. No customer submissions or outgoing messages are authorized for QA. Integrations and production cutover are a separate verified milestone.

## Known content conflicts
PeelClear lists 8 AM opening while shared footer/contact lists 7 AM. Preserve the primary contact hours (7 AM) and flag the discrepancy for owner confirmation. Do not import unverified numerical proof, 5-10 day turnaround, zero risk, regional exclusivity, or comparative performance as new verified claims. Preserve the warranty verbatim.

## Success and QA
Visitor can find a relevant service, inspect actual work, get directions and reach the existing estimate workflow. Proposed measures after launch: qualified inquiries and completion of the estimate flow, not animation engagement. Before merge, verify routes, images, links, keyboard/mobile navigation, gallery, before/after slider, reduced motion, metadata and complete served HTML. Record actual preview and rendering results here.
