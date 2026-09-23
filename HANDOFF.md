# HANDOFF

Read both blocks below before starting work. Doctrine item 12 in `AGENTS.md` explains what to do with them: same operator, same platform, within 24 hours, pick up silently; anything else, read the Last Session block back and get acknowledgment before working.

Every session ends by updating this file, committing, and pushing. Not committed means the session did not happen.

## Last Session

- **When:** 2026-09-23
- **Who:** Clay, resolved from the sole supplied operator profile. Authenticated platform account identity was not independently exposed.
- **Platform:** Codex / ChatGPT Work Mode, branch `clay/agent-scaffolding`.
- **Request:** Set up the full clay-config agent kit, run the bootstrap checklist, merge the scaffolding PR once checks pass, add this repo to the project map in a separate PR, then stop.
- **Changed:** No customer-facing website changes. Added cross-platform instructions, operator profile, supplied Claude hook/settings, environment-file ignore rules, and this handoff. Source templates were read through the GitHub connector at clay-config commit `c3215f11490ffca53a779dc7cd6977568e6cc283`; Section 1 is unchanged.
- **Verification:** Repository was empty; initialized only a README for the PR base. Inspected the full tree and branches. Ran docs/hook/config validation. Existing site returned HTTP 200 and rendered in the cloud browser; screenshot capture worked. No application build, tests, or local dev-server verification is possible yet because no application exists.
- **Status:** Scaffolding prepared on the requested branch; remote PR and merge results must be checked in GitHub. This block is updated before the final merge.
- **Next:** Begin the first real session by auditing current-site navigation and functionality, obtaining Marketing-Hub, and inspecting the approved Sites preview source before selecting a bounded redesign milestone.

## Where We Are

The new GitHub repo was empty at bootstrap. This setup establishes instructions only. The existing production site and design preview have not been imported, changed, or deployed by this session.

**What works.** Authenticated GitHub connector reads and writes; full public repo fetch; local required git identity; canonical template retrieval. Existing https://heritagecce.com/ returned HTTP 200 and rendered in the cloud browser.

**What is in progress.** Scaffolding PR lifecycle and a separate clay-config PROJECT-MAP.md PR. No redesign implementation is in progress.

**What is broken or unresolved.** There is no app, package manifest, lockfile, test suite, CI workflow, hosting configuration, database configuration, approved identity-data file, or local Marketing-Hub checkout. This is expected for the new repo, not evidence that the live business site is broken.

**What could not be determined from here.** New repo hosting target, database/integrations, live-site source ownership/configuration, and canonical business identity facts are UNVERIFIED. Headers identify Hostinger/Horizons for the existing domain, not a confirmed deployment connection for this repo. Local dev-server rendering is UNVERIFIED. Connector commit authorship uses the account email rather than the locally configured noreply email.

**Open owner actions.** None needed to complete the docs setup. Hosting/stack choices and any inaccessible source or integration details need resolution during the first build session.

**Next concrete step.** After the required handoff acknowledgment when applicable, load the current Marketing-Hub guide and audit heritagecce.com's navigation and working flows alongside the approved design preview. Preserve the mainly aesthetic scope, brand colors, layered treatment, and white-before/black-after slider. Do not recreate source from screenshots if the approved preview source can be recovered.

## Platform capability notes

These are dated observations, not permanent truths. Retest any "cannot" older than its date before relying on it, and update when reality changes (doctrine 15).

### Codex / ChatGPT Work Mode, measured 2026-09-23

| Bootstrap item | Result |
| --- | --- |
| 1. Handoff read | PASS: read the actual template; no previous repository session existed. Created the first Last Session and Where We Are blocks. |
| 2. Operator identified | PASS: only one supplied profile, Clay. No inference from commit identity. |
| 3. Git identity set | PASS locally: lowkeycm / lowkeycm@users.noreply.github.com. Connector-generated remote commits use the connected account email; author override is unavailable. |
| 4. Branch created | PASS: clay/agent-scaffolding locally and remotely. |
| 5. Other branches checked | PASS: git branch -r --sort=-committerdate. Only main and this scaffolding branch existed. |
| 6. Full working tree present | PASS: public Git fetch plus complete tree inspection; sparse checkout disabled/not configured. Initially no files; README is the initialization base. |
| 7. Dependencies installed | N/A: no package manifest or dependency lockfile. No packages installed. |
| 8. Build gate runnable | Documentation gate passes: whitespace, hook syntax, settings JSON, unchanged Section 1, no placeholders. Application build is N/A, not passed. |
| 9. Browser rendering available | PASS for cloud browser: loaded the actual live site and captured a screenshot (31,838 bytes). Local application/dev server is UNVERIFIED, no app exists here. |
| 10. Live site reachable | PASS independently: HTTPS HEAD returned 200 for https://heritagecce.com/; cloud browser title was Heritage Commercial Collision Experts - Elite Fleet Specialists. |
| 11. Database reachable | UNVERIFIED / not required for scaffolding. No database target is configured; no unrelated database was queried. |
| 12. GitHub reachable | PASS for connector reads and writes; branch creation succeeded. PR/merge evidence is recorded below. Private Git clone authentication failed; public Git fetch works. |
| CI/test suite | None in the complete repo tree. No test suite or CI workflow to run. |
| Marketing-Hub pointers | Not installed: no ../Marketing-Hub checkout. Section 2.15 deleted as explicitly requested. Supplied hook retained. |

These checks verify scaffolding only, not the future redesigned website.

## Recovery checkpoints

Push meaningful work to the branch during long sessions, not only at the end.
Label incomplete checkpoints honestly. Track separately: local save, remote push
(with SHA), merge (PR), deployment (URL and code SHA), and verification evidence.
A later documentation commit does not imply the deployed application changed.
Keep doctrine 12's acknowledgment rule intact so work by other operators is visible.
