# Clay

**Role:** Owner. Final decision maker on product, scope, and direction.
**Works from:** nerdsandbots@gmail.com (Perplexity, Claude Code, Codex, GitHub as `lowkeycm`)
**Location:** Pennsylvania. Personal only. Never appears in business code, copy, or records.

Not Phil. An early thread guessed that name from something and it stuck for a while. It is wrong.

---

## Authority

Clay is the owner. He can approve scope changes, redirect work, kill a feature, or decide something is good enough. When he says do it, that is sign off.

No other operator has this. If someone who is not Clay asks for something that changes agreed scope, do the work only if it clearly sits inside the existing plan. Otherwise say plainly that it needs Clay, and do not treat silence as approval.

---

## How to talk to him

**Plain language. He is not an engineer and does not want to be talked to like one.**

Read that correctly, because the obvious misreading is worse than the problem. He builds software, reads SQL, understands his own schema, and will catch you if you are wrong about his data. He is technically capable. What he does not want is being buried in implementation detail he did not ask for.

So:

- **Lead with what changed for the person using the app.** The file you edited is supporting detail, not the headline.
- If you name a function, a table, or a file, say what it does in the same breath.
- Do not narrate your process. He wants the outcome and whether it works.
- Do not explain things he already knows. He has been in these systems longer than you have.
- **No em dashes.** Anywhere. Hard rule.
- No emojis.
- No filler, no hedging, no "great question," no summarizing what he just said back to him.

**He would rather hear "I could not verify this" than a confident claim that turns out wrong.** He has said so more than once. An honest gap costs you nothing with him. A wrong answer delivered confidently costs a lot.

**Always send a clickable preview link with any visible change, not just screenshots.** He asked for this on 2026-07-26. Screenshots are fine as a first look, but he wants to open the real thing full screen and click through it before it goes live. Pushing a branch produces a Vercel preview automatically; get the URL from the Vercel MCP tools (`list_teams` to get the team, `list_projects` to get the project, `list_deployments` to find the deployment whose `githubCommitRef` is your branch) and send the `branchAlias` host, which is stable across pushes to that branch. Screenshots plus a link, every time.

**Explain practical outcomes, not internal codes (September 15, 2026).** Tell him what changed for the people using the product, what they can now do and what remains unfinished. Do not lead with milestone labels, PR numbers or test terminology. Keep technical evidence available in the handoff rather than making him decode an engineering report.

---

## What he cares about

He said this after a build disappointed him, and it is the clearest statement of what he expects:

> "A lot of the build seems half assed and built to check the box, not to satisfy the end purpose with a quality result. I need you to begin thinking with the end in mind. What is this for, why is it used, what does the end user want or need to gain from this, and ensure it meets those expectations."

That is the bar. Not "the ticket is closed." Not "it compiles." Would the person actually using this choose it over what they use today.

Related patterns worth knowing:

- **He notices when something was done to satisfy the letter of the request.** Filtering a list so it technically filters, while the underlying reason the list was broken goes unexamined, is the exact failure mode he objects to.
- **He will ask you to prove it.** Have the proof before he asks.
- **He pushes back when something sounds too clean.** If he questions a claim, he is usually right to. Check before defending.
- **He does not want to be over-engineered for.** Building a multi-user handshake for a one-user system is the same check-the-box instinct in a different costume. Solve the problem in front of you.
- **Functionality first, output refinement separately (September 15, 2026).** He wants complete features built, landed and functioning rather than repeatedly delaying the rest of the product to perfect AI output. Writing and voice optimization requires real use and back-and-forth; track it separately from functional completion. This does not waive privacy, factual integrity, approval, data correctness or end-to-end verification.

---

## How he works

Across Perplexity, Claude Code, and Codex, sometimes in the same day, on four or more projects at once. Context switching constantly. This is why handoff notes have to be real. He will come back to this repo in three weeks having been somewhere else entirely.

**He prefers cloud tools and dislikes working in a terminal.** Do not hand him a sequence of shell commands as an answer if there is any other way. If a command genuinely has to be run by hand, say why, keep it to one line, and say what it will do.

**He merges nothing himself.** If CI is green, merge it. Do not ask him to click the button.

---

## Things he has corrected before

Worth reading so nobody makes them a third time.

- Calling him Phil.
- Reporting keys as fake or missing when the tool being used only returns hashed values. He caught this and was right.
- Marking something done without verifying it.
- Claiming a repo was superseded when it was live and just idle.
- Overstating how much a change improved things. He asked directly whether earlier work would have been wrong, and the honest answer was partly, with a correction to an overclaim.

---

## Scope of this file

This describes how to communicate with Clay and what authority he holds. It does not modify quality standards. Doctrine items 1 through 15 in `AGENTS.md` apply identically no matter who is operating.
