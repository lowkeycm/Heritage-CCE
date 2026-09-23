# Heritage Commercial Collision Experts

Full-site design review for https://heritagecce.com. The existing business site remains live. Read `AGENTS.md` and `HANDOFF.md` before working.

Node 22 or later, no third-party dependencies:

```sh
npm run build
npm run check
npm start
```

Seven public pages use the approved navy/orange design and existing business content. The homepage includes a keyboard-accessible before/after slider; Facility includes a photo gallery. The warranty is preserved verbatim. Estimate and staff workflows link to the current site pending verified migration.

Source: `scripts/build.mjs` generates pages, `src/home.html` contains the approved homepage source, `src/content` stores audited content, `public` contains styles, progressive interactions and actual business photographs. `dist` is generated and ignored.

See `docs/migration-status.md` for the production launch boundary and unresolved integration work. This build blocks search indexing and is not ready to replace the production domain.
