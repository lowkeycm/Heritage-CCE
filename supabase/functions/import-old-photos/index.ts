// Retired. This function copied the old leads' photos into the private lead-photos bucket
// once, on 2026-10-09 (126 photos for the 16 imported leads that had them; see
// docs/verification.md). It now refuses every request. It can be deleted from the Supabase
// dashboard (Edge Functions > import-old-photos); the import code is in git history.
Deno.serve(() =>
  new Response(JSON.stringify({ error: "This one-time import is finished." }), {
    status: 410,
    headers: { "Content-Type": "application/json" },
  })
);
