// Emails a one-time sign-in link to people on public.staff_members. Anyone else gets
// the same "check your email" response, so the staff list cannot be probed.
// The link carries a hashed token that the staff page exchanges for a session
// (POST /auth/v1/verify), so no Supabase redirect or email template settings are needed.
// Deployed with verify_jwt = false: people are not signed in yet when they ask.
import { createClient } from "npm:@supabase/supabase-js@2";

const DEFAULT_PAGE = "https://heritage-cce.vercel.app/staff/";
// Staff page addresses the link may point to. Vercel previews of heritage-cce included.
const ALLOWED_PAGES = [
  /^https:\/\/heritage-cce\.vercel\.app\/staff\/$/,
  /^https:\/\/heritage-[a-z0-9-]+-pridefamilyrealty\.vercel\.app\/staff\/$/,
  /^https:\/\/(www\.)?heritagecce\.com\/staff\/$/,
  /^http:\/\/localhost:4173\/staff\/$/,
];
const RESEND_INTERVAL_MS = 60_000;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Enter your email address." }, 400);
  const page = ALLOWED_PAGES.some((p) => p.test(String(body.page ?? ""))) ? String(body.page) : DEFAULT_PAGE;
  const sent = json({ ok: true });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: staff } = await db
    .from("staff_members")
    .select("full_name, last_login_link_at")
    .eq("email", email)
    .maybeSingle();
  if (!staff) return sent;
  if (staff.last_login_link_at && Date.now() - Date.parse(staff.last_login_link_at) < RESEND_INTERVAL_MS) return sent;

  // First sign-in for someone just added: create their login, already confirmed.
  let link = await db.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error) {
    const created = await db.auth.admin.createUser({ email, email_confirm: true });
    if (created.error) console.error("create user failed", created.error.message);
    link = await db.auth.admin.generateLink({ type: "magiclink", email });
  }
  const tokenHash = link.data?.properties?.hashed_token;
  if (link.error || !tokenHash) {
    console.error("generate link failed", link.error?.message);
    return json({ error: "We could not send a sign-in link. Please try again in a minute." }, 500);
  }

  const url = `${page}#token_hash=${encodeURIComponent(tokenHash)}`;
  const key = Deno.env.get("RESEND_API_KEY");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Heritage Collision <noreply@heritagecce.com>",
      to: [email],
      subject: "Your Heritage Collision sign-in link",
      html: `<div style="font-family:Arial,sans-serif;color:#1a2a4a;max-width:520px">
<h2 style="margin:0 0 12px">Sign in to Heritage Collision leads</h2>
<p>Hi ${staff.full_name.split(" ")[0].replace(/[<>&"]/g, "")}, use this button to sign in. It works once.</p>
<p><a href="${url}" style="display:inline-block;background:#e67451;color:#fff;padding:10px 18px;text-decoration:none;border-radius:4px;font-weight:600">Sign in</a></p>
<p style="font-size:12px;color:#6b7280">If you did not ask for this, you can ignore it.</p></div>`,
      text: `Sign in to Heritage Collision leads (works once):\n${url}\n\nIf you did not ask for this, you can ignore it.\n`,
    }),
  });
  if (!res.ok) {
    console.error("resend failed", res.status, (await res.text()).slice(0, 300));
    return json({ error: "We could not send a sign-in link. Please try again in a minute." }, 500);
  }
  await db.from("staff_members").update({ last_login_link_at: new Date().toISOString() }).eq("email", email);
  return sent;
});
