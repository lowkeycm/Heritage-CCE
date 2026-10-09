# AGENTS.md

This is the canonical instruction file for this repository. Every agent and every human working here reads it, on every platform.

Claude Code reads `CLAUDE.md`, which contains a single line pointing at this file. Codex reads `AGENTS.md` natively. Perplexity Computer and anything else should be pointed here directly. There is one set of rules, in one place, so a rule learned on one platform is not lost when the work moves to another.

Section 1 is universal doctrine and is shared verbatim across projects. Do not edit it here. Section 2 is specific to this repository.

---

## Section 1: Working Doctrine

Fifteen rules. Every agent, every platform, every operator. Nothing in `people/` or anywhere else relaxes them. Project facts live in Section 2; current state lives in `HANDOFF.md`; how to communicate with the operator lives in `people/`.

1. **Think with the end in mind.** Before changing anything, answer: what is this for, who uses it and in what moment, what must they walk away with. Hold the result to those answers, not to "it compiles" or "the ticket is closed."

2. **Verify before declaring done.** UI work: render the actual surface and look at it. Data work: validate against live data. Bug fixes: reproduce first, then prove the fix kills that exact reproduction. If your platform cannot do the needed verification, item 15 applies.

3. **Root cause over patches.** If two symptoms share one cause, name it and fix it once. Never ship a workaround dressed as a fix.

4. **No half-builds.** If the work is bigger than the session, stop and propose it as a scoped follow-up instead of leaving something that looks finished and is not.

5. **Do not reintroduce fixed bugs.** Read `HANDOFF.md` and recent history for the area before working in it.

6. **Git discipline.** Set identity at session start, before any commit: `lowkeycm` / `lowkeycm@users.noreply.github.com`. Never commit to `main`. Branch `clay/what-it-does`. Open a PR with a conventional-commit title, merge it yourself once checks pass, delete the branch. Do not ask the operator to merge.

7. **Verify deploys.** Confirm what actually shipped rather than assuming a green build shipped the right thing.

8. **Secrets stay out of chat, commits, and logs.** Read them only from the locations in the Section 2 secrets map. A value you cannot read is not a value that is missing.

9. **Data isolation between businesses.** One business's data never touches another's database, CRM, or webhooks. Where two products share one database, the same rule applies between the products: touch only the tables and functions this repo owns (Section 2 lists them).

10. **Copy standards.** In anything customer-facing (site and app copy, marketing email and SMS, social posts, ad copy, anything an assistant says to a customer): no em dashes, no emojis, plain language, no filler, no corporate hedging. Internal docs, commit messages, PR bodies, and code comments are exempt from the punctuation ban but keep the plain-language bar. Legal text is precision, not marketing: do not restyle it unprompted. Never address a person by a name inferred from an email address. For tone and depth when talking to the operator, follow their file in `people/` (Clay's bans em dashes in messages to him).

11. **Ask before large or ambiguous changes.** When scope grows past what was agreed or the answer needs a product decision, stop and check. Non-owners cannot approve scope changes (see the Operator section).

12. **Handoff hygiene.** At session start read `HANDOFF.md`. Same operator, same platform, within 24 hours: pick up silently. Anything else: read the Last Session block back and get acknowledgment before working. At session end update `HANDOFF.md`, commit, push. Not committed means the session did not happen.

13. **Durable learnings go in the repo, not platform memory.** Platform memory does not travel. Rules and corrections belong in this file, current state in `HANDOFF.md`, operator preferences in `people/`.

14. **Confirm the target before infrastructure operations.** Before any deploy, migration, or secrets change, state which project you are targeting and check it against Section 2. The deploy credential reaches every project on the account, across separate businesses.

15. **Capability honesty.** If you cannot perform a required verification from your platform, say so plainly and hand that part back. Never skip it silently, never substitute a weaker check and present it as the real one. Capability notes recorded in `HANDOFF.md` go stale: retest any "cannot" before relying on it, and update the note when reality has changed.

## Section 2 - Project specifics

### 2.1 Identity

| Field | Value |
| --- | --- |
| What it is | Heritage Commercial Collision Experts aesthetic redesign. Seven-page static design-review build; production cutover not complete. |
| Business | Heritage Commercial Collision Experts; legal entity and DBA are UNVERIFIED. |
| Live URL | https://heritagecce.com/ is the current existing site, reachable 2026-09-23. This new repo is not confirmed connected to it. |
| Repo | github.com/lowkeycm/Heritage-CCE |
| Hosting | Current business domain remains Hostinger/Horizons. New design-review target is Vercel heritage-cce, documented in 2.7. |
| Database | Supabase project `zxzzmrkyctbgxlgjritv`, being renamed "Heritage Collision" (Clay, 2026-09-29; the dashboard still says "Heritage Coach" until he renames it). It is the lead database for both collision brands: this site (brand `commercial`) and Heritage Collision Experts (brand `retail`). This repo owns it; migrations and edge functions live in `supabase/`. See 2.15. |
| Other systems | Review links to existing inquiry and staff workflows. Their migration and delivery verification remain open. |
| Owner | Clay. See `people/clay.md`. |

Public business identity and source audit are recorded in docs/migration-status.md. Legal entity and conflicting opening hours still need owner confirmation. Do not borrow identity facts from Heritage Coach or Total Detailing.

### 2.2 Git identity and workflow

- Commits are authored as `lowkeycm` / `lowkeycm@users.noreply.github.com`. Set this during session bootstrap, before any work, not at commit time:
  ```
  git config user.name "lowkeycm"
  git config user.email "lowkeycm@users.noreply.github.com"
  ```
- **Never commit to `main`.** Every session opens its own branch.
- Branch naming: `clay/what-it-does`. Platform-generated names do not meet this. Rename before opening a PR.
- Open a pull request with a conventional-commit title. Merge it yourself once CI is green. Do not ask the owner to click merge. Delete the branch after merge.
- At session start, run `git branch -r --sort=-committerdate | head` and check whether another open branch is already touching the area you are about to work in.
- Pushes route through a proxy and occasionally fail with HTTP 407. Wait a few seconds and retry.

### 2.3 Operator

The operator is the person directing this session. It is not the commit account. That is always `lowkeycm` regardless of who is working, so it identifies nobody. Never infer the operator from git config, a commit email, or any address you find in the repo.

Profiles live in `people/`. Each begins with the person's name, role, and the account they work from.

**If `people/` contains exactly one profile, that person is the operator. Use it and do not ask.**

**If it contains more than one:**

1. Use the platform's authenticated account if you can see it, matched against the account listed in the profile header.
2. If the platform does not expose it, ask once, then continue.
3. If a person states who they are in the conversation, that overrides everything else.

Record the operator in the Last Session block of `HANDOFF.md`.

**Authority.** Clay is the owner and can approve product decisions, scope changes, and changes of direction. Other operators cannot. If a non-owner requests something that changes agreed scope, do it only if it clearly sits inside the existing plan. Otherwise say plainly that it needs Clay's sign off, and never treat silence as approval.

**Scope limit.** Profiles govern communication, context, and authority only. They never modify quality standards. Doctrine items 1 through 15 apply identically to every operator.

**Related.** `github.com/lowkeycm/clay-config` holds cross-project preferences and the project map. It is often unreachable from a single-repo session, which is why `people/clay.md` lives here. Nothing in this repo depends on reaching it.

### 2.4 Stack

Verified 2026-09-23: dependency-free Node >=22 static generator, semantic HTML/CSS, browser JavaScript. `scripts/build.mjs` writes `dist` from the approved homepage, content JSON and shared templates. `public/` contains original business photos and styles. No third-party packages or lockfile required. Existing live backend remains external; see `docs/migration-status.md`.

### 2.5 Secrets map

**Locations only. Never record a value here, in a commit, in a PR body, or in chat.**

The static site reads no secrets and needs no environment variables. The staff page embeds the Supabase anon key, which is public by design; row level security decides access. Hosting uses the existing authenticated Vercel connector; do not extract credentials from browser state.

| Purpose | Location | Status |
| --- | --- | --- |
| Lead alert and staff sign-in email (Resend) | Supabase edge function secret `RESEND_API_KEY` in `zxzzmrkyctbgxlgjritv` | Present and working 2026-09-29 (sends from noreply@heritagecce.com) |
| Service role for edge functions | Supabase built-in `SUPABASE_SERVICE_ROLE_KEY` inside edge functions only | Never used outside functions |

- Never commit real `.env` files. The scaffold includes ignore rules for `.env` and `.env.*`.
- Browser-exposed prefixes such as `VITE_` and `NEXT_PUBLIC_` are public, never secret.
- Do not access another business's credentials or database to fill this gap.
- Before any infrastructure operation, confirm the project identifier and secret locations with verified configuration. No infrastructure project is approved by this scaffold.

### 2.6 Build and verification commands

Run from the repository root.

| Command | What it does | Verified |
| --- | --- | --- |
| `git diff --check` | Detect whitespace errors | 2026-09-23 |
| `bash -n .claude/hooks/session-start.sh` | Validate hook shell syntax | 2026-09-23 |
| `python -m json.tool .claude/settings.json > /dev/null` | Validate hook configuration JSON | 2026-09-23 |
| `npm run build` | Generate seven routes and static assets | 2026-09-23 |
| `npm run check` | Validate route/anchor/image destinations, warranty and truck mapping | 2026-09-23 |
| `npm start` | Serve generated preview on port 4173 | Available |

**Scaffolding gate: the three validation commands above must pass before every scaffolding commit.** Compare Section 1 byte-for-byte with the source template and ensure no template placeholders remain. Application gate: `npm run build && npm run check`. UI verification remains separately required.

### 2.7 Deploy process

Verified 2026-09-23: Vercel project `heritage-cce` (`prj_QVxX0xImRE7c83nQF2OAuEmCg7mi`) under team `team_K0quIbtPFw7RIl9M7bG54yTE` / `pridefamilyrealty` is linked to `lowkeycm/Heritage-CCE`. Feature branches auto-deploy previews. `vercel.json` builds and checks the static `dist` output. Verify the deployment's Git SHA through the Vercel connector and render the actual URL.

This is a review host. `heritagecce.com` stays on the existing Hostinger site. No DNS or production-domain change was made. Do not confuse Vercel's environment label "production" on the main-branch review host with a business-domain cutover. All generated pages and response headers block indexing. Remove these only with the launch gates in `docs/migration-status.md` complete.

### 2.8 UI and design standards

**Visual verification is required for any UI change, before committing.** Load the affected page, screenshot desktop at 1440x900 and mobile at 390x844, confirm the change and that nothing else broke. If your platform cannot render a browser, say so and hand the verification back (doctrine 15).

Owner direction, 2026-09-23: mainly an aesthetic redesign. Use the current heritagecce.com navigation as the guide. Use the approved layered navy/orange design preview as the visual starting point:
https://heritage-cce-design-preview.cmallory.chatgpt.site

Preserve existing site capabilities and verified content unless a change is approved. The truck comparison must retain white as Before and black as After, with a draggable slider.

Approved design is implemented using navy #1A2A4A and orange #E67451. Marketing-Hub website-system and relevant references were read from canonical GitHub sources. Full local Hub restore was blocked by automatic approval review; the partial sibling snapshot is not a usable checkout. Pointers remain uninstalled. See migration-status.md.

### 2.9 Copy doctrine

Doctrine item 10 applies. This is mainly an aesthetic redesign, not authorization to rewrite business claims or legal text. Verify current navigation, services, contact details, warranties, and working inquiry paths before carrying them forward. Do not invent proof, credentials, turnaround times, or guarantees. Marketing-Hub must guide future design/copy work; no client brand files have been established yet.

### 2.10 Identity facts, source of truth

Current-site audited identity, sources and hours conflict are recorded in `docs/migration-status.md`. Warranty text lives in `src/content/warranty.json`; media provenance in `src/content/media-sources.json`. Legal entity and independent owner approval remain UNVERIFIED. Keep this collision business separate from Heritage Coach and Total Detailing.

### 2.11 Scope

Owner authorized active redesign implementation on 2026-09-23. Current milestone: seven-page visual review, preserving links to live inquiry and staff workflows. Production migration is incomplete.

**In scope, just do it:**
- Maintain the cross-platform instructions, operator profile, bootstrap checks, and honest handoff.
- Implement and verify the approved full-site aesthetic direction and review preview. Preserve current content and navigation routes.
- Maintain the collision lead intake described in 2.15: its tables, storage bucket, edge functions, the staff page and the estimate app at `/estimate/` (Clay, 2026-09-29). Database changes inside those objects and SQL checks are pre-approved.

**Out of scope, ask first:**
- Production cutover and domain/DNS changes. At cutover the old heritagecce.com form backend is retired (see 2.15); that happens only when Clay switches the site over.
- Changes to business scope, navigation behavior, forms, or integrations beyond the agreed aesthetic redesign.
- Schema changes, adding a dependency, secrets changes, editing identity strings, and anything touching another business's data.
- Changing hosting, production domains, DNS, or infrastructure targets without verification and authorization.

### 2.12 Bootstrap capability checklist

Run this at session start, before real work. Report anything on this list you cannot do (doctrine 15).

1. **Handoff read.** Read `HANDOFF.md`, both blocks. Apply doctrine item 12.
2. **Operator identified.** Resolve per 2.3.
3. **Git identity set.** `git config user.name` returns `lowkeycm`.
4. **Branch created.** On a `clay/...` branch, not `main`.
5. **Other branches checked.** `git branch -r --sort=-committerdate | head`.
6. **Full working tree present.** Some environments hand you a sparse checkout. If folders are missing, run `git sparse-checkout disable` before concluding anything.
7. **Dependencies installed.**
8. **Build gate runnable.** The commands in 2.6 complete.
9. **Browser rendering available.** Can you load a page and take a screenshot? Test it, do not infer it from the platform name.
10. **Live site reachable.** Separate from rendering; test it on its own.
11. **Database reachable.** Most sessions do not need it. Say so if a task depends on it.
12. **GitHub reachable.** Can you push and open a PR? Retry once on a proxy 407.

If items 8, 9, or 10 fail, you can still do useful work. You cannot describe that work as verified.

### 2.13 Repo map

```
scripts/build.mjs             Shared templates and seven-page static generator
scripts/check.mjs             Build output route/content checks
scripts/serve.mjs             Local generated-output server
src/home.html                 Approved homepage source, main content imported by build
src/content/                  Audited warranty and media provenance
public/                       CSS, progressive JavaScript, original business images
public/lead-form.js           Contact form sender (same file as js/lead-form.js in Heritage-Collision-Retail)
public/staff/                 Staff leads page (sign-in link, leads for both brands, people and alert emails)
public/estimate/              Phone estimate app (replaces the Lovable app at estimate.heritagecce.com)
public/vendor/zxing/          Pinned ZXing 0.23.0 barcode reader (Apache-2.0) for VIN scanning on iPhone
supabase/migrations/          Lead database schema applied to zxzzmrkyctbgxlgjritv
supabase/functions/           Edge functions: submit-lead (website forms), staff-login (sign-in email), estimate (estimate app)
docs/estimate-app.md          Estimate app: what it does, old app status, switch steps
vercel.json                   Review hosting, build gate and noindex guards
docs/migration-status.md      Current-site audit and production migration boundary
docs/verification.md          Actual browser QA evidence and limitations
campaigns/website-redesign/    Marketing-Hub design brief
AGENTS.md / CLAUDE.md          Cross-platform instructions
HANDOFF.md / people/clay.md    Session state and owner preferences
.claude/                      Supplied session-start hook and settings
```

### 2.14 Gotchas

- 2026-09-23: This is `lowkeycm/Heritage-CCE`, not `Heritage-Coach`, `heritage-ops`, or the separate Sites source repository.
- 2026-09-23: GitHub was completely empty. A minimal README initialized main solely to give the scaffolding PR a base; all scaffolding belongs on `clay/agent-scaffolding`.
- 2026-09-23: GitHub connector reads/writes work; private repository Git authentication is unavailable in this Work Mode shell. Local git identity uses the required noreply email, but connector-created remote commits use the connected account email. Do not claim those identities match.
- 2026-09-23: Marketing-Hub was not checked out next door. Section 2.15 was removed per the setup request. Install pointers according to the actual Hub installer README when a sibling checkout becomes available; do not fabricate pointers.
- 2026-09-23: Browser rendering was tested against the existing live site. Local application rendering remains UNVERIFIED because this repo has no application.
- 2026-09-23: Existing design-preview truck assets have reversed filenames: `before.webp` shows the finished black truck; `after.webp` shows the white truck before refinishing. Verify the actual photos when importing.

- 2026-09-23 update: application source and review deployment now exist. Earlier bootstrap-only observations above describe the initial state. Full Marketing-Hub checkout and skill-pointer installation remain incomplete after automatic approval review blocked the snapshot restore.
- 2026-09-29: The sandbox's Playwright Chromium rejects the network proxy certificate, so it cannot reach Supabase. Test the edge functions with curl and the staff page with mocked responses; the real sign-in has to be clicked by a person. Do not disable certificate checks to get around it.
- 2026-09-29: Staff sign-in does not use Supabase's own email templates or redirect settings. `staff-login` generates a one-time token and emails a link through Resend; the page exchanges it at `/auth/v1/verify`. Changing the staff page address means updating `ALLOWED_PAGES` in that function, `STAFF_PAGE` in `submit-lead` and `estimate`, and the `/admin` and `/staff` redirects for estimate.heritagecce.com in `vercel.json`.
- 2026-09-29: The estimate app only makes QR codes for addresses in `QR_ORIGINS` in the `estimate` function. A new host for the app must be added there first. On estimate.heritagecce.com, `vercel.json` shows the app at `/` and sends the old Lovable paths to it.

### 2.15 Lead database (Heritage Collision)

Decided by Clay, 2026-09-29: the old "Heritage Coach" Supabase project `zxzzmrkyctbgxlgjritv` is renamed Heritage Collision and holds the leads for both collision businesses. Heritage Coach customers stay in Pipedrive (heritage-ops) and Heritage Coach inventory stays in `tvwmxlrlpomlkcmuaptu`; neither lives here. Linking a collision lead to a Coach customer by Pipedrive organization ID and to a CCC repair order is a later step, not built.

What this repo owns in that project:

| Object | Purpose |
| --- | --- |
| `public.leads` | One row per lead. `brand` is `commercial` (this site, and company vehicles from the estimate app) or `retail` (Heritage Collision Experts, and personal vehicles from the estimate app). `source` is `website` or `estimate-app`; estimate app leads also fill `reference` (HCC-YYYY-NNNNNN), VIN, vehicle, plate, mileage, `damage_areas`, rush and needed-by. Staff may change only `status` and `staff_notes`. |
| `public.estimate_sessions` | Estimate app drafts, so a customer can start on a computer and finish on a phone. Reached only through the `estimate` function (token stored hashed); no direct access for anyone. Unsent drafts expire after 7 days and are removed with their photos. |
| `public.staff_members` | Who can sign in, by email. `can_manage_staff` lets them add or remove people and change alert emails. Started with Clay, Addaie and Tom. |
| `public.lead_alert_recipients` | Who gets the new-lead email for each brand. Addaie for both until Clay sets up a dedicated address. Editable on the staff page. |
| Storage bucket `lead-photos` | Private customer photos. Only signed-in staff can view them. |
| Edge function `submit-lead` | Public form endpoint for both sites (multipart form data, `brand` field required, up to 10 photos). Saves, stores photos, emails the alert with photos attached. Called by `public/lead-form.js` on this site's Contact page and by the identical `js/lead-form.js` on the retail site's Contact page; keep the two copies the same. |
| Edge function `staff-login` | Emails a one-time sign-in link to people on the staff list only. |
| Edge function `estimate` | Backend for `/estimate/`: start, save, load, photo upload to `lead-photos/estimate/`, QR code, status and submit. Submit creates the lead and emails the alert with photos. |
| Edge function `import-old-photos` | Retired stub (returns 410). Used once on 2026-10-09 to copy the imported old leads' photos; safe to delete from the dashboard. |
| `is_staff()`, `can_manage_staff()` | Access checks used by the row level security policies. |

Everything else in the project is legacy. The old heritagecce.com form (`estimate_requests`, `hccesettings`, bucket `estimate-photos`, functions `get-form-settings`, `submit-estimate-form`, `request-estimate`, `send-form-email`, `chatbot-handler`, and the n8n hookup) keeps serving the live site until cutover; retire it then. The old content tool tables, buckets, functions and logins are no longer needed (Clay, 2026-09-29) and can be removed once nothing points at them. The 23 old estimate requests do not need to be kept.

Old leads imported (Clay, 2026-10-09): 32 real leads were copied into `public.leads` as status `closed` with their original dates, so staff see them under Show: All. 17 came from the old form's `estimate_requests` (`source_page` "heritagecce.com old form (imported)") and 15 from the old estimate app's `damage_requests` in Lovable project `xkjqxifquyklnkuhxltk` (`source_page` "estimate.heritagecce.com old app (imported)", old reference numbers kept, Personal or None owner = `retail`). The old app's estimate amounts and statuses are in `staff_notes`. Their 126 photos were copied into `lead-photos/imported/`. Skipped: Clay's 4 test entries and 3 bot entries. The originals are untouched in both old projects.
