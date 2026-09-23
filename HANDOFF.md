# HANDOFF

Read Last Session and Where We Are before working. Apply AGENTS.md doctrine 12: same operator/platform within 24 hours, continue silently; otherwise read the Last Session block back and obtain acknowledgment.

## Last Session

**Follow-up, 2026-09-23, Clay / Codex Work Mode:** Owner requested a live, unprotected Vercel site. Production deployment 121b767 was already READY, but Standard Protection sent unauthenticated requests to its unique deployment URL to Vercel login. Disabled Require Log In for project heritage-cce with the explicit confirmation. Password protection was already off. Verified without cookies or bypass headers: https://heritage-cce.vercel.app/ and https://heritage-lucqezppy-pridefamilyrealty.vercel.app/services return HTTP 200 with actual Heritage page content, no login redirect. Use https://heritage-cce.vercel.app/ as the stable public share URL. Existing business domain and backend unchanged; noindex retained. Next session can continue from the public review.

### Preceding design session

- **When:** 2026-09-23.
- **Who:** Clay, sole operator profile.
- **Platform:** Codex / ChatGPT Work Mode.
- **Request:** Restore Services trust bar, use Scroll Craft overlapping sections, add Services menu dropdown, upscale the central About shop photo.
- **Changed:** Published trust figures restored; six compact photo-led panels layer on desktop; normal flow on phone/short viewports and reduced motion. Added accessible shared Services disclosure with six anchors. Enhanced About workshop photo, retaining original. Imported unchanged pinned Scroll Craft engine with license.
- **Verification:** Build/check, syntax, whitespace pass. Services and About rendered at 1440×900 and 390×844. All panel transitions, dropdown keyboard/mobile behavior and direct navigation inspected. Sticky-anchor regression found, fixed and rechecked. Full evidence and capability limits in docs/verification.md.
- **Status:** PR https://github.com/lowkeycm/Heritage-CCE/pull/3. At this final handoff commit, final deployment check, merge and branch deletion follow; GitHub/Vercel record subsequent events.
- **Next:** Review these refinements with Clay, then continue the remaining production integration plan. No domain cutover until estimate/photo, chat and admin workflows are migrated and delivery verified.

## Where We Are

The first full-site visual pass and requested Services/About refinements are implemented. This is a review milestone, not a finished production migration. The existing business website at https://heritagecce.com remains unchanged.

**What works:** Home, Services, PeelClear, About, Facility, Contact and Warranty routes; consistent desktop/mobile navigation; real facility gallery; truck comparison; published pricing; existing estimate/staff links. Vercel automatically builds feature branches from this repo in project `heritage-cce`, id `prj_QVxX0xImRE7c83nQF2OAuEmCg7mi`, team `team_K0quIbtPFw7RIl9M7bG54yTE`. Build runs `npm run build && npm run check`.

**Review evidence:** Initial reviewed app commit `c248015b93a9076fe0dfd53a8fbc7b7cbba9516c`; exact-viewport QA commit `949d2100f0a22a2ba8b15c1dbc92f95e46f84eb4`; mobile correction `4e293ebf07017c47122fa562ca450cc0faa0c92b` at https://heritage-brzvyoz1d-pridefamilyrealty.vercel.app. Later deployment SHA is available on PR #2. The temporary review frame is removed before merge.

**Still open:** Existing estimate/contact/photo delivery, PeelClear inquiry, chat and staff integration migration. Legacy Supabase references are documented, but ownership/isolation/auth/delivery are unverified. No DB writes or test messages were sent. The current site has conflicting opening hours: primary contact 7am, PeelClear body 8am. Prices need reconfirmation before launch. Legal entity unverified. Production domain/DNS plan not changed.

**Marketing-Hub:** Canonical README, installer instructions, website-system and relevant references were read through authenticated GitHub, including copy calibration. Full local snapshot restore was interrupted by automatic approval review, classified as unrelated Hub changes. No Hub remote writes were made. The partial sibling tree is not an installed checkout; do not generate pointers from it. Obtain a complete checkout before skill-pointer installation. No additional permission needed for the completed design work; any renewed blocked Hub-write action requires resolving the review rejection first.

**Next concrete step:** Design review, then retrieve the current application source and verify the Heritage CCE-owned backend resources before porting the live submission/admin flows. Follow docs/migration-status.md; do not invent backend configuration from public bundle references.

## Platform capability notes

Measured 2026-09-23 on Codex / ChatGPT Work Mode. Retest stale limitations.

| Bootstrap item | Result |
| --- | --- |
| Handoff/operator | PASS: read prior handoff; same operator and platform within 24 hours; Clay sole profile. |
| Git identity | PASS locally: lowkeycm / lowkeycm@users.noreply.github.com. Remote connector author uses account email and exposes no override. Exact local/remote content tree verified at first checkpoint. |
| Branch/other work | PASS: clay/full-site-redesign; remote branches checked before work. |
| Complete checkout | PASS for Heritage-CCE, public git fetch available, not sparse. |
| Dependencies | N/A: Node static implementation uses no third-party packages. |
| Build | PASS: npm run build/check, JS syntax, whitespace, hook syntax. 7 routes and 231 local destinations checked. |
| Browser | PASS: actual Vercel app rendered in cloud browser; exact 1440×900 and 390×844 layout frames. OS reduced-motion toggle and physical touch-device testing not exercised. |
| Existing live site | PASS: reachable and rendered; actual contact form destination verified without submission. |
| Database | UNVERIFIED, no database access required for visual review. No data mutations. |
| GitHub | PASS: authenticated connector blob/tree/commit/ref and PR workflows; public Git fetch. Private shell Git auth unavailable. |
| Deploy | PASS: Vercel Git integration built review commits; SHA verified by list_deployments. Connector get_project schema mismatch, but list_projects/deployments work. |
| CI | No GitHub Actions workflow. Vercel executes the build/content-check gate. |
| Hub pointers | NOT INSTALLED: canonical reads work, full local restore blocked by automatic approval review; partial tree must not be treated as complete. |

## Recovery checkpoints

- Scaffolding PR #1 merged: https://github.com/lowkeycm/Heritage-CCE/pull/1.
- Project-map PR #3 merged: https://github.com/lowkeycm/clay-config/pull/3.
- Original scaffolding main: b48ffb8359cad522a058b13737109ee28c39e760.
- Redesign PR #2: https://github.com/lowkeycm/Heritage-CCE/pull/2.
- Approved original visual reference: https://heritage-cce-design-preview.cmallory.chatgpt.site.

Track local save, remote push, merge and deployment separately. A documentation commit does not mean the deployed app changed. Preserve acknowledgment requirements across platforms and operators.

### Platform capability update, 2026-09-23, Codex / ChatGPT Work Mode

Bootstrap repeated for Services refinement: HANDOFF/operator read; local Git identity set to lowkeycm/noreply; clay/services-scroll-craft branch; no overlapping remote branch; full source present; no dependency install required; build/check pass; actual live Services and branch previews rendered; no database work required. GitHub connector writes/PR and Vercel automatic branch deployment verified. Shell private Git authentication still unavailable; connector commit-author difference remains as documented.

Marketing-Hub Scroll Craft integration alone was fetched read-only into an isolated reference directory and bundle integrity verified at Hub 0ab3fbcc29fb92f0f45b8f9b33f5782a8b83b85f, upstream 0b816225945e45380397d6a0487efa3c98916858. This does not make the partial sibling a full Hub checkout or install pointers. Node/ffmpeg preflight ready; optional local Chrome/KIE key absent. Cloud browser verified desktop/mobile and intermediate scroll states. OS reduced-motion preference toggle and physical phone remain untested.
