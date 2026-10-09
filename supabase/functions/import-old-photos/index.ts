// One-time copy of old lead photos into the private lead-photos bucket (Clay, 2026-10-09).
// The leads imported from the old heritagecce.com form and the old estimate app (Lovable
// "Fleet Focus") were saved with photo entries that still point at the old public storage:
// { legacy_bucket: "estimate-photos", legacy_path } or { legacy_url } on the old app's
// public damage-photos bucket. Each call copies the photos of a few such leads into
// lead-photos/imported/<lead id>/<slot>.<ext> and replaces the entries with the usual
// { path, type, size, slot, label }, so the staff page shows them like any other lead.
// Locked by a one-time key (only its SHA-256 is here). Replaced by a stub after the import.
import { createClient } from "npm:@supabase/supabase-js@2";

const KEY_SHA256 = "2af5f438501e2162588deb43c7e070b628048b67fed1228cff9930ff2bc50ca2";
const BUCKET = "lead-photos";
const OLD_FORM_BUCKET = "estimate-photos";
const OLD_APP_PREFIX = "https://xkjqxifquyklnkuhxltk.supabase.co/storage/v1/object/public/damage-photos/";
const IMPORTED_PAGES = ["heritagecce.com old form (imported)", "estimate.heritagecce.com old app (imported)"];
const MAX_BYTES = 10 * 1024 * 1024;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif" };

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

type Photo = Record<string, unknown> & { slot?: string; label?: string; legacy_bucket?: string; legacy_path?: string; legacy_url?: string; import_error?: string };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function sha256(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

// The old app named every file .jpg whatever it was, so trust the bytes, not the name.
function sniff(bytes: Uint8Array): string | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(4, 8) === "ftyp") return /^(heic|heix|heim|heis)$/.test(ascii(8, 12)) ? "image/heic" : /^(mif1|msf1)$/.test(ascii(8, 12)) ? "image/heif" : null;
  return null;
}

async function readOld(photo: Photo): Promise<Uint8Array> {
  if (photo.legacy_bucket === OLD_FORM_BUCKET && photo.legacy_path) {
    const { data, error } = await db.storage.from(OLD_FORM_BUCKET).download(photo.legacy_path);
    if (error || !data) throw new Error(`download failed: ${error?.message ?? "no data"}`);
    return new Uint8Array(await data.arrayBuffer());
  }
  if (photo.legacy_url?.startsWith(OLD_APP_PREFIX)) {
    const res = await fetch(photo.legacy_url);
    if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  }
  throw new Error("source not allowed");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if ((await sha256(req.headers.get("x-import-key") ?? "")) !== KEY_SHA256) return json({ error: "Not allowed." }, 403);
  const batch = Math.min(Math.max(Number(new URL(req.url).searchParams.get("leads")) || 3, 1), 5);

  const { data: leads, error } = await db.from("leads").select("id, photos").in("source_page", IMPORTED_PAGES).order("created_at");
  if (error) return json({ error: error.message }, 500);
  const pending = (p: Photo) => (p.legacy_path || p.legacy_url) && !p.import_error;
  const todo = (leads ?? []).filter((l) => (l.photos as Photo[]).some(pending));

  let copied = 0;
  const failed: { lead: string; slot?: string; error: string }[] = [];
  for (const lead of todo.slice(0, batch)) {
    const photos: Photo[] = [];
    for (const photo of lead.photos as Photo[]) {
      if (!pending(photo)) { photos.push(photo); continue; }
      try {
        const bytes = await readOld(photo);
        const type = sniff(bytes);
        if (!type) throw new Error("not a photo we can store");
        if (bytes.byteLength > MAX_BYTES) throw new Error(`too large (${bytes.byteLength} bytes)`);
        const path = `imported/${lead.id}/${photo.slot}.${EXT[type]}`;
        const { error: upErr } = await db.storage.from(BUCKET).upload(path, bytes, { contentType: type, upsert: true });
        if (upErr) throw new Error(`upload failed: ${upErr.message}`);
        photos.push({ path, type, size: bytes.byteLength, slot: photo.slot, label: photo.label });
        copied++;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        photos.push({ ...photo, import_error: message });
        failed.push({ lead: lead.id, slot: photo.slot, error: message });
      }
    }
    const { error: saveErr } = await db.from("leads").update({ photos }).eq("id", lead.id);
    if (saveErr) failed.push({ lead: lead.id, error: `save failed: ${saveErr.message}` });
  }
  return json({ copied, failed, remaining_leads: Math.max(todo.length - batch, 0) });
});
