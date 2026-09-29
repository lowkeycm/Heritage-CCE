// Public endpoint for the Heritage Collision website forms (commercial and retail).
// Saves the lead, stores photos in the private lead-photos bucket and emails the
// brand's alert recipients (public.lead_alert_recipients) with the photos attached.
// Deployed with verify_jwt = false: anonymous visitors submit the form.
import { createClient } from "npm:@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";

// Where staff open a lead. Change at the heritagecce.com cutover.
const STAFF_PAGE = "https://heritage-cce.vercel.app/staff/";

const BRANDS: Record<string, { label: string; short: string; from: string }> = {
  commercial: {
    label: "Heritage Commercial Collision Experts",
    short: "Commercial",
    from: "Heritage CCE Website <noreply@heritagecce.com>",
  },
  retail: {
    label: "Heritage Collision Experts",
    short: "Retail",
    from: "Heritage Collision Experts Website <noreply@heritagecce.com>",
  },
};

// Form field name -> [label, max length]. Order is the order shown in the email.
const FIELDS: Record<string, [string, number]> = {
  name: ["Name", 120],
  phone: ["Phone", 40],
  email: ["Email", 254],
  business_name: ["Business", 160],
  preferred_contact: ["Preferred contact", 40],
  best_time: ["Best time to reach", 80],
  vehicle: ["Vehicle", 160],
  vehicle_type: ["Vehicle type", 80],
  insurance: ["Insurance", 80],
  claim_number: ["Claim number", 60],
  message: ["Details", 4000],
  source_page: ["Sent from", 300],
};

const MAX_PHOTOS = 10;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;
const PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const esc = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "The form could not be read. Please try again." }, 400);
  }

  // Hidden field that people never see; bots tend to fill it. Pretend success.
  if (String(form.get("company_website") ?? "").trim()) return json({ ok: true });

  const brand = String(form.get("brand") ?? "");
  const brandInfo = BRANDS[brand];
  if (!brandInfo) return json({ error: "Unknown form." }, 400);

  const lead: Record<string, string | null> = { brand };
  for (const [key, [label, max]] of Object.entries(FIELDS)) {
    const value = String(form.get(key) ?? "").trim();
    if (value.length > max) return json({ error: `${label} is too long.` }, 400);
    lead[key] = value || null;
  }
  if (!lead.name) return json({ error: "Please enter your name." }, 400);
  if (!lead.phone && !lead.email) return json({ error: "Please enter a phone number or email address." }, 400);
  if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
    return json({ error: "Please check the email address." }, 400);
  }

  const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_PHOTOS) return json({ error: `Please attach up to ${MAX_PHOTOS} photos.` }, 400);
  for (const f of files) {
    if (!PHOTO_TYPES[f.type]) return json({ error: `${f.name} is not a JPG, PNG, WebP or HEIC photo.` }, 400);
    if (f.size > MAX_PHOTO_BYTES) return json({ error: `${f.name} is larger than 10 MB.` }, 400);
  }

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: row, error: insertError } = await db.from("leads").insert(lead).select("id").single();
  if (insertError || !row) {
    console.error("lead insert failed", insertError?.message);
    return json({ error: "We could not save your request. Please call us at (610) 707-8600." }, 500);
  }

  // Photos: private storage, plus email attachments up to a total size.
  const photos: { path: string; name: string; type: string; size: number }[] = [];
  const attachments: { filename: string; content: string }[] = [];
  let attachmentBytes = 0;
  let failedPhotos = 0;
  for (const [i, f] of files.entries()) {
    const ext = PHOTO_TYPES[f.type];
    const path = `${brand}/${row.id}/${i + 1}.${ext}`;
    const bytes = new Uint8Array(await f.arrayBuffer());
    const { error } = await db.storage.from("lead-photos").upload(path, bytes, { contentType: f.type });
    if (error) {
      console.error("photo upload failed", error.message);
      failedPhotos++;
      continue;
    }
    photos.push({ path, name: f.name.slice(0, 120), type: f.type, size: f.size });
    if (attachmentBytes + f.size <= MAX_ATTACHMENT_BYTES) {
      attachments.push({ filename: `photo-${i + 1}.${ext}`, content: encodeBase64(bytes) });
      attachmentBytes += f.size;
    }
  }

  const alertError = await sendAlert(db, brand, brandInfo, row.id, lead, photos.length, attachments, failedPhotos);
  const { error: updateError } = await db
    .from("leads")
    .update({
      photos,
      alert_sent_at: alertError ? null : new Date().toISOString(),
      alert_error: alertError,
    })
    .eq("id", row.id);
  if (updateError) console.error("lead update failed", updateError.message);

  return json({ ok: true, id: row.id, photos: photos.length, failedPhotos });
});

async function sendAlert(
  db: ReturnType<typeof createClient>,
  brand: string,
  brandInfo: { label: string; short: string; from: string },
  id: string,
  lead: Record<string, string | null>,
  photoCount: number,
  attachments: { filename: string; content: string }[],
  failedPhotos: number,
): Promise<string | null> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return "RESEND_API_KEY is not set";
  const { data: recipients } = await db.from("lead_alert_recipients").select("emails").eq("brand", brand).single();
  const to: string[] = recipients?.emails ?? [];
  if (!to.length) return "No alert recipients for " + brand;

  const rows = Object.entries(FIELDS)
    .filter(([k]) => lead[k])
    .map(([k, [label]]) => [label, lead[k] as string]);
  const link = `${STAFF_PAGE}?lead=${id}`;
  const photoLine = photoCount
    ? `${photoCount} photo${photoCount === 1 ? "" : "s"}` +
      (attachments.length < photoCount ? ` (${attachments.length} attached, all on the staff page)` : " attached")
    : "No photos";
  const failedLine = failedPhotos ? ` ${failedPhotos} photo${failedPhotos === 1 ? "" : "s"} could not be saved.` : "";
  const subject = `New ${brandInfo.short.toLowerCase()} lead: ${lead.name}${lead.business_name ? ` (${lead.business_name})` : ""}`;

  const html = `<div style="font-family:Arial,sans-serif;color:#1a2a4a;max-width:600px">
<p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;color:#e67451">${esc(brandInfo.label.toUpperCase())}</p>
<h2 style="margin:0 0 16px">New lead from ${esc(lead.name ?? "")}</h2>
<table style="border-collapse:collapse;width:100%">${rows
    .map(
      ([label, value]) =>
        `<tr><th style="text-align:left;vertical-align:top;padding:8px;background:#f3f4f6;width:32%;font-weight:600">${esc(label)}</th><td style="padding:8px;border-bottom:1px solid #e5e7eb;white-space:pre-wrap">${esc(value)}</td></tr>`,
    )
    .join("")}</table>
<p>${esc(photoLine + "." + failedLine)}</p>
<p><a href="${link}" style="display:inline-block;background:#e67451;color:#fff;padding:10px 18px;text-decoration:none;border-radius:4px;font-weight:600">Open on the staff page</a></p>
<p style="font-size:12px;color:#6b7280">Reply to this email to answer the customer directly${lead.email ? "" : " (no email given, use the phone number)"}.</p></div>`;
  const text = `${brandInfo.label}\nNew lead from ${lead.name}\n\n${rows.map(([l, v]) => `${l}: ${v}`).join("\n")}\n\n${photoLine}.${failedLine}\n\nStaff page: ${link}\n`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: brandInfo.from,
        to,
        reply_to: lead.email ?? undefined,
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
