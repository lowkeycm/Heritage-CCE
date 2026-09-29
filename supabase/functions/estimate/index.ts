// Backend for the estimate app (/estimate/ on the commercial site, estimate.heritagecce.com).
// A customer's in-progress estimate lives in public.estimate_sessions, reached only through
// this function with a random token the browser keeps (the table stores its SHA-256 hash).
// That lets someone start on a computer, scan a QR code and finish on a phone.
// Photos go to the private lead-photos bucket as they are taken. On submit the estimate
// becomes a row in public.leads (company vehicle = commercial, personal = retail) and the
// brand's alert recipients get an email with the photos attached.
// Deployed with verify_jwt = false: customers are anonymous.
import { createClient } from "npm:@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";
import QRCode from "npm:qrcode@1.5.4";

// Where staff open a lead. Change at the heritagecce.com cutover.
const STAFF_PAGE = "https://heritage-cce.vercel.app/staff/";
const BUCKET = "lead-photos";
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;
const PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};
// QR codes may only point back at the estimate app itself.
const QR_ORIGINS = [
  /^https:\/\/estimate\.heritagecce\.com\//,
  /^https:\/\/heritage-cce\.vercel\.app\/estimate[/?]/,
  /^https:\/\/heritage-[a-z0-9-]+-pridefamilyrealty\.vercel\.app\/estimate[/?]/,
  /^http:\/\/localhost:4173\/estimate[/?]/,
];

// Photo slots, in the order staff see them.
const SLOTS: [string, string, boolean][] = [
  ["corner-driver-front", "Driver side front corner", true],
  ["corner-driver-rear", "Driver side rear corner", true],
  ["corner-passenger-rear", "Passenger side rear corner", true],
  ["corner-passenger-front", "Passenger side front corner", true],
  ["damage-closeup", "Damage close-up, straight on", true],
  ["damage-angle", "Damage close-up, at an angle", true],
  ["damage-context", "Damage from about 5 feet away", true],
  ...[1, 2, 3, 4, 5, 6].map((n): [string, string, boolean] => [`extra-${n}`, `Extra photo ${n}`, false]),
];
const SLOT_LABEL = Object.fromEntries(SLOTS.map(([k, l]) => [k, l]));

const AREAS: Record<string, string> = {
  front: "Front",
  "driver-front": "Driver side front",
  "driver-rear": "Driver side rear",
  rear: "Rear",
  "passenger-rear": "Passenger side rear",
  "passenger-front": "Passenger side front",
  roof: "Roof",
  undercarriage: "Undercarriage",
};

const BRANDS: Record<string, { label: string; short: string }> = {
  commercial: { label: "Heritage Commercial Collision Experts", short: "commercial" },
  retail: { label: "Heritage Collision Experts", short: "retail" },
};

type Form = {
  name?: string;
  ownership?: "company" | "personal";
  company?: string;
  email?: string;
  phone?: string;
  contact?: "Phone call" | "Text message" | "Email";
  vin?: string;
  vin_skipped?: boolean;
  year?: string;
  make?: string;
  model?: string;
  plate?: string;
  mileage?: string;
  areas?: string[];
  description?: string;
  rush?: boolean;
  needed_by?: string;
  insurance?: "Yes" | "No" | "Not sure";
  claim_number?: string;
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const fail = (error: string, status = 400, extra: Record<string, unknown> = {}) => json({ error, ...extra }, status);
const esc = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function sha256(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return encodeBase64(bytes).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

// Keeps only known fields, trimmed and capped, so the browser cannot store anything else.
function clean(input: unknown): Form {
  const f = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const text = (key: string, max: number) => {
    const v = typeof f[key] === "string" ? (f[key] as string).trim().slice(0, max) : "";
    return v || undefined;
  };
  const pick = <T extends string>(key: string, allowed: readonly T[]) =>
    allowed.includes(f[key] as T) ? (f[key] as T) : undefined;
  const vin = text("vin", 20)?.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 17);
  const mileage = text("mileage", 12)?.replace(/\D/g, "").slice(0, 7);
  const neededBy = text("needed_by", 10);
  return {
    name: text("name", 120),
    ownership: pick("ownership", ["company", "personal"] as const),
    company: text("company", 160),
    email: text("email", 254)?.toLowerCase(),
    phone: text("phone", 40),
    contact: pick("contact", ["Phone call", "Text message", "Email"] as const),
    vin: vin || undefined,
    vin_skipped: f.vin_skipped === true || undefined,
    year: text("year", 4)?.replace(/\D/g, "") || undefined,
    make: text("make", 60),
    model: text("model", 80),
    plate: text("plate", 20)?.toUpperCase(),
    mileage: mileage || undefined,
    areas: Array.isArray(f.areas) ? [...new Set(f.areas.filter((a): a is string => typeof a === "string" && a in AREAS))] : undefined,
    description: text("description", 4000),
    rush: f.rush === true || undefined,
    needed_by: neededBy && /^\d{4}-\d{2}-\d{2}$/.test(neededBy) ? neededBy : undefined,
    insurance: pick("insurance", ["Yes", "No", "Not sure"] as const),
    claim_number: text("claim_number", 60),
  };
}

// First problem that blocks submitting, with the step the app should send the customer back to.
function missing(form: Form, photos: Record<string, unknown>): { step: string; error: string } | null {
  if (!form.name) return { step: "you", error: "Please enter your name." };
  if (!form.ownership) return { step: "you", error: "Please choose company or personal vehicle." };
  if (form.ownership === "company" && !form.company) return { step: "you", error: "Please enter the company name." };
  if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return { step: "you", error: "Please check your email address." };
  if (!form.phone || form.phone.replace(/\D/g, "").length < 10) return { step: "you", error: "Please enter a 10-digit phone number." };
  if (!form.contact) return { step: "you", error: "Please choose how we should contact you." };
  if (!form.year || !form.make || !form.model) return { step: "vehicle", error: "Please enter the vehicle year, make and model." };
  if (!form.areas?.length) return { step: "damage", error: "Please mark where the damage is." };
  const needed = SLOTS.filter(([slot, , required]) => required && !photos[slot]);
  if (needed.length) return { step: "photos", error: `Please add the ${needed.length === 1 ? "last required photo" : `${needed.length} required photos`}.` };
  if (!form.insurance) return { step: "finish", error: "Please tell us whether this is an insurance claim." };
  return null;
}

async function signed(photos: Record<string, { path: string }>) {
  const paths = Object.values(photos).map((p) => p.path);
  if (!paths.length) return {};
  const { data } = await db.storage.from(BUCKET).createSignedUrls(paths, 7200);
  const byPath = Object.fromEntries((data ?? []).map((d) => [d.path, d.signedUrl]));
  return Object.fromEntries(Object.entries(photos).map(([slot, p]) => [slot, { url: byPath[p.path] ?? null }]));
}

type Session = {
  id: string;
  step: string | null;
  form: Form;
  photos: Record<string, { path: string; type: string; size: number }>;
  submitted_at: string | null;
  expires_at: string;
  lead_id: string | null;
};

async function findSession(token: unknown): Promise<Session | null> {
  if (typeof token !== "string" || token.length < 30 || token.length > 100) return null;
  const { data } = await db
    .from("estimate_sessions")
    .select("id, step, form, photos, submitted_at, expires_at, lead_id")
    .eq("token_hash", await sha256(token))
    .maybeSingle();
  return (data as Session) ?? null;
}

async function referenceFor(session: Session) {
  if (!session.lead_id) return null;
  const { data } = await db.from("leads").select("reference").eq("id", session.lead_id).maybeSingle();
  return data?.reference ?? null;
}

// Removes abandoned drafts and their photos, a few at a time, whenever a new estimate starts.
async function sweep() {
  const { data } = await db
    .from("estimate_sessions")
    .select("id, photos")
    .is("submitted_at", null)
    .lt("expires_at", new Date().toISOString())
    .limit(20);
  if (!data?.length) return;
  const paths = data.flatMap((s) => Object.values((s.photos ?? {}) as Record<string, { path: string }>).map((p) => p.path));
  if (paths.length) await db.storage.from(BUCKET).remove(paths);
  await db.from("estimate_sessions").delete().in("id", data.map((s) => s.id));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return fail("Method not allowed.", 405);

  try {
    // Photos arrive as multipart form data; everything else as JSON.
    if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) return await photo(await req.formData());
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return fail("The request could not be read.");
    switch (body.action) {
      case "start":
        return await start(body);
      case "save":
        return await save(body);
      case "load":
        return await load(body);
      case "remove_photo":
        return await removePhoto(body);
      case "status":
        return await status(body);
      case "qr":
        return await qr(body);
      case "submit":
        return await submit(body);
      default:
        return fail("Unknown action.");
    }
  } catch (e) {
    console.error("estimate function error", e instanceof Error ? e.message : e);
    return fail("Something went wrong on our side. Please try again, or call (610) 707-8600.", 500);
  }
});

async function start(body: Record<string, unknown>) {
  // Hidden field that people never see; bots tend to fill it.
  if (typeof body.company_website === "string" && body.company_website.trim()) return fail("Please try again.");
  const token = newToken();
  const { error } = await db.from("estimate_sessions").insert({ token_hash: await sha256(token), form: clean(body.form) });
  if (error) throw new Error(error.message);
  sweep().catch((e) => console.error("sweep failed", e));
  return json({ token });
}

async function save(body: Record<string, unknown>) {
  const session = await findSession(body.token);
  if (!session) return fail("This estimate could not be found. Please start again.", 404, { gone: true });
  if (session.submitted_at) return json({ ok: true, submitted: true, reference: await referenceFor(session) });
  const step = typeof body.step === "string" ? body.step.slice(0, 20) : session.step;
  const { error } = await db
    .from("estimate_sessions")
    .update({ form: clean(body.form), step, updated_at: new Date().toISOString() })
    .eq("id", session.id);
  if (error) throw new Error(error.message);
  return json({ ok: true });
}

async function load(body: Record<string, unknown>) {
  const session = await findSession(body.token);
  if (!session) return fail("This estimate could not be found. Please start again.", 404, { gone: true });
  if (session.submitted_at) return json({ submitted: true, reference: await referenceFor(session) });
  if (Date.parse(session.expires_at) < Date.now()) return fail("This estimate has expired. Please start again.", 404, { gone: true });
  return json({ step: session.step, form: session.form, photos: await signed(session.photos) });
}

async function photo(form: FormData) {
  const session = await findSession(form.get("token"));
  if (!session) return fail("This estimate could not be found. Please start again.", 404, { gone: true });
  if (session.submitted_at) return fail("This estimate was already sent.", 409);
  const slot = String(form.get("slot") ?? "");
  if (!SLOT_LABEL[slot]) return fail("Unknown photo.");
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return fail("No photo was received. Please try again.");
  const ext = PHOTO_TYPES[file.type];
  if (!ext) return fail("Please use a JPG, PNG, WebP or HEIC photo.");
  if (file.size > MAX_PHOTO_BYTES) return fail("That photo is larger than 10 MB. Please choose a smaller one.");

  const path = `estimate/${session.id}/${slot}.${ext}`;
  const previous = session.photos[slot];
  const { error } = await db.storage.from(BUCKET).upload(path, new Uint8Array(await file.arrayBuffer()), {
    contentType: file.type,
    upsert: true,
  });
  if (error) throw new Error(error.message);
  if (previous && previous.path !== path) await db.storage.from(BUCKET).remove([previous.path]);

  const photos = { ...session.photos, [slot]: { path, type: file.type, size: file.size } };
  await db.from("estimate_sessions").update({ photos, updated_at: new Date().toISOString() }).eq("id", session.id);
  const { data } = await db.storage.from(BUCKET).createSignedUrl(path, 7200);
  return json({ slot, url: data?.signedUrl ?? null });
}

async function removePhoto(body: Record<string, unknown>) {
  const session = await findSession(body.token);
  if (!session) return fail("This estimate could not be found. Please start again.", 404, { gone: true });
  if (session.submitted_at) return fail("This estimate was already sent.", 409);
  const slot = String(body.slot ?? "");
  const existing = session.photos[slot];
  if (!existing) return json({ ok: true });
  await db.storage.from(BUCKET).remove([existing.path]);
  const photos = { ...session.photos };
  delete photos[slot];
  await db.from("estimate_sessions").update({ photos, updated_at: new Date().toISOString() }).eq("id", session.id);
  return json({ ok: true });
}

async function status(body: Record<string, unknown>) {
  const session = await findSession(body.token);
  if (!session) return fail("Not found.", 404, { gone: true });
  return json({ submitted: !!session.submitted_at, reference: await referenceFor(session), step: session.step });
}

async function qr(body: Record<string, unknown>) {
  const url = typeof body.url === "string" ? body.url : "";
  if (url.length > 300 || !QR_ORIGINS.some((re) => re.test(url))) return fail("That link cannot be turned into a QR code.");
  const svg = await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 1 });
  return json({ svg });
}

async function submit(body: Record<string, unknown>) {
  const session = await findSession(body.token);
  if (!session) return fail("This estimate could not be found. Please start again.", 404, { gone: true });
  // A second tap on Submit (or the other device) gets the same answer.
  if (session.submitted_at) return json({ reference: await referenceFor(session) });

  const form = body.form ? clean(body.form) : session.form;
  const problem = missing(form, session.photos);
  if (problem) return fail(problem.error, 400, { step: problem.step });

  const brand = form.ownership === "company" ? "commercial" : "retail";
  const photos = SLOTS.filter(([slot]) => session.photos[slot]).map(([slot, label]) => ({
    slot,
    label,
    path: session.photos[slot].path,
    type: session.photos[slot].type,
    size: session.photos[slot].size,
    name: label,
  }));
  const lead = {
    brand,
    source: "estimate-app",
    name: form.name,
    phone: form.phone,
    email: form.email,
    business_name: form.ownership === "company" ? form.company : null,
    preferred_contact: form.contact,
    vehicle: [form.year, form.make, form.model].filter(Boolean).join(" "),
    vin: form.vin ?? null,
    vehicle_year: form.year,
    vehicle_make: form.make,
    vehicle_model: form.model,
    license_plate: form.plate ?? null,
    mileage: form.mileage ? Number(form.mileage) : null,
    damage_areas: form.areas ?? [],
    message: form.description ?? null,
    is_rush: !!form.rush,
    needed_by: form.needed_by ?? null,
    insurance: form.insurance,
    claim_number: form.claim_number ?? null,
    photos,
    source_page: "/estimate/",
  };

  // Random reference; retry on the rare collision.
  let row: { id: string; reference: string } | null = null;
  for (let attempt = 0; attempt < 5 && !row; attempt++) {
    const n = crypto.getRandomValues(new Uint32Array(1))[0] % 900000 + 100000;
    const reference = `HCC-${new Date().getFullYear()}-${n}`;
    const { data, error } = await db.from("leads").insert({ ...lead, reference }).select("id, reference").single();
    if (!error) row = data;
    else if (error.code !== "23505") throw new Error(error.message);
  }
  if (!row) throw new Error("Could not create a unique reference");

  await db
    .from("estimate_sessions")
    .update({ form, submitted_at: new Date().toISOString(), lead_id: row.id, updated_at: new Date().toISOString() })
    .eq("id", session.id);

  const alertError = await sendAlert(brand, row.id, row.reference, form, photos);
  await db
    .from("leads")
    .update({ alert_sent_at: alertError ? null : new Date().toISOString(), alert_error: alertError })
    .eq("id", row.id);

  return json({ reference: row.reference });
}

async function sendAlert(
  brand: string,
  id: string,
  reference: string,
  form: Form,
  photos: { slot: string; label: string; path: string; type: string; size: number }[],
): Promise<string | null> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return "RESEND_API_KEY is not set";
  const { data: recipients } = await db.from("lead_alert_recipients").select("emails").eq("brand", brand).single();
  const to: string[] = recipients?.emails ?? [];
  if (!to.length) return "No alert recipients for " + brand;

  // Attach the photos (already shrunk by the browser) up to a total size.
  const attachments: { filename: string; content: string }[] = [];
  let total = 0;
  for (const p of photos) {
    if (total + p.size > MAX_ATTACHMENT_BYTES) break;
    const { data } = await db.storage.from(BUCKET).download(p.path);
    if (!data) continue;
    const bytes = new Uint8Array(await data.arrayBuffer());
    attachments.push({ filename: `${p.slot}.${p.path.split(".").pop()}`, content: encodeBase64(bytes) });
    total += bytes.length;
  }

  const info = BRANDS[brand];
  const rows: [string, string | undefined][] = [
    ["Reference", reference],
    ["Name", form.name],
    ["Company", form.ownership === "company" ? form.company : "Personal vehicle"],
    ["Phone", form.phone],
    ["Email", form.email],
    ["Preferred contact", form.contact],
    ["Vehicle", [form.year, form.make, form.model].filter(Boolean).join(" ")],
    ["VIN", form.vin ?? "Not provided"],
    ["License plate", form.plate],
    ["Mileage", form.mileage ? Number(form.mileage).toLocaleString("en-US") : undefined],
    ["Damage", (form.areas ?? []).map((a) => AREAS[a]).join(", ")],
    ["What happened", form.description],
    ["Rush", form.rush ? "Yes, rush repair" : undefined],
    ["Needed by", form.needed_by],
    ["Insurance claim", form.insurance],
    ["Claim number", form.claim_number],
  ];
  const shown = rows.filter((r): r is [string, string] => !!r[1]);
  const link = `${STAFF_PAGE}?lead=${id}`;
  const photoLine = `${photos.length} photos${attachments.length < photos.length ? ` (${attachments.length} attached, all on the staff page)` : " attached"}.`;
  const subject = `${form.rush ? "RUSH: " : ""}New ${info.short} estimate request ${reference}: ${form.name}${form.ownership === "company" && form.company ? ` (${form.company})` : ""}`;
  const html = `<div style="font-family:Arial,sans-serif;color:#1a2a4a;max-width:600px">
<p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;color:#e67451">${esc(info.label.toUpperCase())} / ESTIMATE APP</p>
<h2 style="margin:0 0 16px">${form.rush ? '<span style="color:#b3261e">Rush. </span>' : ""}Estimate request from ${esc(form.name ?? "")}</h2>
<table style="border-collapse:collapse;width:100%">${shown
    .map(([label, value]) =>
      `<tr><th style="text-align:left;vertical-align:top;padding:8px;background:#f3f4f6;width:32%;font-weight:600">${esc(label)}</th><td style="padding:8px;border-bottom:1px solid #e5e7eb;white-space:pre-wrap">${esc(value)}</td></tr>`
    )
    .join("")}</table>
<p>${esc(photoLine)}</p>
<p><a href="${link}" style="display:inline-block;background:#e67451;color:#fff;padding:10px 18px;text-decoration:none;border-radius:4px;font-weight:600">Open on the staff page</a></p>
<p style="font-size:12px;color:#6b7280">Reply to this email to answer the customer directly.</p></div>`;
  const text = `${info.label} / estimate app\nEstimate request from ${form.name}\n\n${shown.map(([l, v]) => `${l}: ${v}`).join("\n")}\n\n${photoLine}\n\nStaff page: ${link}\n`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Heritage Estimate App <noreply@heritagecce.com>",
        to,
        reply_to: form.email,
        subject,
        html,
        text,
        attachments: attachments.length ? attachments : undefined,
      }),
    });
    if (!res.ok) return `Resend ${res.status}: ${(await res.text()).slice(0, 300)}`;
    return null;
  } catch (e) {
    return `Resend request failed: ${e instanceof Error ? e.message : String(e)}`;
  }
}
