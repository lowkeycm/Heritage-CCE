# Redesign review and launch boundary

2026-09-23. This is a design review build, not a production cutover.

## Source audit

Current site: https://heritagecce.com. Navigation and visible content inspected in the browser. Approved design source: https://heritage-cce-design-preview.cmallory.chatgpt.site. Marketing-Hub website-system and its design, conversion, claims and QA references read through authenticated GitHub at `0ab3fbcc29fb92f0f45b8f9b33f5782a8b83b85f`. Calibration anchors read before drafting.

Implemented routes: `/`, `/services`, `/peelclear`, `/about`, `/facility`, `/contact`, `/warranty`. Service anchors retained. Facility is promoted to a direct navigation item. Request estimate links to Contact. This preview does not submit customer data.

Phone, email, address and primary hours are carried from the current contact page/footer: (610) 707-8600; info@heritagecce.com; 449 Old Reading Pike, Pottstown PA 19464; Mon–Fri 7am–5pm. The current PeelClear body says 8am–5pm. Owner must resolve that discrepancy before launch. Legal entity is unverified. Warranty text is preserved verbatim in `src/content/warranty.json`. Image source URLs are recorded in `src/content/media-sources.json`. PeelClear prices match the published starting estimates on the audit date; reconfirm before launch.

## Existing capabilities requiring migration

Current estimate form, photo uploads, configurable contact routing, PeelClear inquiry, chat and staff dashboard remain on the existing site. Contact and staff links explicitly open those live pages. No simulated form success is presented. No production inquiry, message or test submission was sent.

The public live bundle identifies legacy Supabase project `zxzzmrkyctbgxlgjritv`, functions `get-form-settings`, `submit-estimate-form`, `request-estimate`, `chatbot-handler`, `send-form-email`, settings table `hccesettings` and photo storage `estimate-photos`. These are observed references, not authorization to alter them. Ownership/isolation, schema, auth, CORS, delivery routes and access controls remain unverified. Do not touch another business's data. Do not expose keys or copy settings values into source.

Before production: obtain the current app source and confirmed owned backend resources; port and verify estimate/photo/contact/PeelClear/chat/admin behavior; verify actual delivery using explicitly authorized test destinations; resolve hours; review published pricing; remove preview indexing guards only at launch; verify redirects and canonical metadata; confirm production hosting/domain plan. This repo must not replace heritagecce.com until those gates are complete.

## Technical design

Dependency-free static build using Node >=22, semantic HTML, CSS and progressive enhancement. No package installation required. `npm run build` creates `dist`; `npm run check` checks route and anchor destinations, images, unchanged legal terms and white-before/black-after slider mapping. `npm start` serves output locally. Vercel config outputs `dist`, redirects `/admin` to existing staff login, and blocks indexing of the review build.

Full Marketing-Hub local snapshot restore was stopped by automatic approval review, which classified some source-copy writes as unrelated modifications. No Hub remote files were modified. The partial sibling snapshot is not an installed checkout. Skill pointers are intentionally not generated against an incomplete tree. Use read-only canonical GitHub sources until a complete approved checkout is available.
