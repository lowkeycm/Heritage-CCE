# Estimate app

2026-09-29. Clay asked to rebuild the QR code estimate app at estimate.heritagecce.com, make it look better, and send its leads into the Heritage Collision lead database.

## What it is

A phone-first page at `/estimate/` on this site (`public/estimate/`). Its backend is the `estimate` edge function in `zxzzmrkyctbgxlgjritv`. Steps:

1. About you: name, company or personal vehicle (company name if company), email, phone, how to reach them.
2. Vehicle: scan the VIN barcode (the phone's own reader, or the pinned ZXing copy in `public/vendor/zxing/` on iPhone) or type it. NHTSA's free VIN decoder fills year, make and model. A bad VIN check digit shows a "may have a typo" note. "I don't have the VIN" skips it. Plate and mileage are optional.
3. Damage: tap areas on a top-down vehicle diagram, plus an optional description.
4. Photos: four corners (a diagram shows where to stand), three close-ups of the damage, and up to six extra. All seven guided photos are required. Photos are shrunk in the browser and uploaded as they are taken.
5. Timing and insurance: rush, needed-back-by date, insurance claim yes/no/not sure, claim number.
6. Review, then send. The customer gets a reference number (HCC-YYYY-NNNNNN).

Progress is saved on the server as the customer goes. On a computer, "Show the QR code" moves the estimate to the phone; the computer shows which step the phone is on and the confirmation when it is sent. Reopening the page on the same device offers "Continue my estimate". Unsent drafts expire after 7 days and are deleted with their photos.

Sending creates a row in `public.leads` with `source = 'estimate-app'`. Company vehicle becomes brand `commercial`; personal becomes `retail` (Clay's rule). The alert email goes to that brand's alert list with the photos attached, and links to the lead on the staff page.

## Compared with the old app

The old app is the Lovable project "Fleet Focus" (`751f733d-c6b1-47f9-a562-4ca51535c486`) with its own Supabase project `xkjqxifquyklnkuhxltk`. Kept: the same information, VIN scan and lookup, guided photos, damage areas, rush and needed-by, insurance, computer-to-phone handoff, reference numbers, alert emails with photos.

Dropped on purpose (Clay, 2026-09-29): the customer "check status" page and the staff estimate amount and PDF. The chat-style layout became a plain step-by-step form. The old app's open staff sign-up and its separate staff logins are replaced by the Heritage Collision staff page.

## Old app status

- 16 requests (3 in the last 90 days) stay in the old project. They were not copied.
- 2026-09-29: the old public read policy on `damage_requests` was replaced with staff and admin read only, so the public can no longer list customer records. New requests still save.
- Still open to the public until the switch, because the live old app needs them: `session_handoffs` (read and update), the public `damage-photos` bucket and public storage updates. They go away when the old app is turned off.
- The old app emails addaie@heritagecce.com and clay.mallory@heritagecoach.com.

## Switch steps

Nothing below has been done. Each needs Clay's go-ahead.

1. Try the new app at https://heritage-cce.vercel.app/estimate/ on a phone, including the VIN scan and photos.
2. Add the domain `estimate.heritagecce.com` to the Vercel project `heritage-cce`.
3. In Hostinger DNS, replace the `estimate` record that points to Lovable (A record 185.158.133.1) with the record Vercel shows for the domain.
4. Scan a printed QR code and confirm it opens the new app. `vercel.json` shows the app at `/` on that address, sends the old `/estimate/continue/...`, `/confirmation/...` and `/check-status` links to it, and sends `/admin` and `/staff` to the staff page.
5. Turn off the old app in Lovable. Its data stays in `xkjqxifquyklnkuhxltk` until Clay decides what to do with it.
