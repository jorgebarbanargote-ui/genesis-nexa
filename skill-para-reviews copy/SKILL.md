---
name: reviews-system
description: Build a complete customer reviews system for a Node/Express website — public submit form (name + 1-5 stars + comment), owner moderation (approve-first), WhatsApp notifications via CallMeBot with one-tap approve/delete links, a password-protected admin panel, persistent storage, and a bilingual (EN/ES) frontend. Deployable on EasyPanel with a persistent volume. Use when a site needs real-time reviews/testimonials that the owner approves before they go public, with WhatsApp alerts. Spanish-speaking users may call this "skill para reviews".
---

# Reviews System (reseñas con aprobación + WhatsApp)

A drop-in customer-reviews feature for a **Node.js + Express** site that serves static HTML.
Visitors submit a review → it is saved as **pending** → the owner gets a **WhatsApp** with
**Approve** / **Delete** links → approved reviews show on the site. Also includes a
password-protected **/admin** panel. Frontend is **bilingual (EN/ES)**.

## When to use
- Adding a reviews / testimonials section where real visitors submit reviews in real time.
- The owner must approve (moderate) before a review is public.
- The owner wants a WhatsApp alert per review with tap-to-approve / tap-to-delete.
- The site is (or can be) a Node/Express app that also serves the static files.

## Architecture (what gets built)
1. **Backend module** (`reviews.js`) mounted on the Express app — endpoints:
   - `POST /api/reviews` — public submit (rate-limited) → saves as `pending`, fires WhatsApp.
   - `GET /api/reviews` — public, returns only `approved` reviews (newest first).
   - `GET /r/:action/:id/:token` — one-tap **approve/delete** links used in the WhatsApp message (secured by a per-review random token, no password in the link).
   - `POST /api/admin/list|approve|delete` — password-protected admin actions.
   - `GET /admin` — serves the admin panel HTML.
2. **Admin panel** (`admin.html`) — login with the admin password, list pending/approved, approve/delete.
3. **Frontend section** (`reviews-section.html`) — always-visible submit form (name + interactive stars + comment), dynamic grid of approved reviews, equal-height cards with **Read more / Ver más** for long text. Fully **EN/ES**.
4. **Storage**: a JSON file on a **persistent volume** (`/data/reviews.json`). Secrets live in `/data/config.json` (NOT in code, NOT in the public web).
5. **WhatsApp**: free **CallMeBot** API (one-way notifications to the owner's number).

## Files in this skill (`templates/`)
- `reviews.js` — Express backend module. `mountReviews(app, { dataDir, adminHtmlPath })`.
- `admin.html` — admin panel (self-contained).
- `reviews-section.html` — the HTML + CSS + JS to paste into the page (bilingual, self-contained).
- `config.example.json` — shape of the secret config stored on the volume.

---

## Step-by-step implementation

### 1. Backend
- Ensure the app is Node/Express and serves static files (`express.static(__dirname)`), with `express.json()` enabled. Requires **Node 18+** (uses global `fetch`) and `express-rate-limit`.
- Copy `templates/reviews.js` next to the server, then in `server.js`:
  ```js
  const express = require('express');
  const path = require('path');
  const app = express();
  app.use(express.json());

  // IMPORTANT security guard: server.js is inside the static root, so block
  // direct download of source/config before express.static:
  const BLOCKED = new Set(['/server.js','/reviews.js','/package.json','/package-lock.json','/dockerfile','/.dockerignore','/config.json','/reviews.json']);
  app.use((req,res,next)=> BLOCKED.has(req.path.toLowerCase()) ? res.status(404).send('Not found') : next());

  app.use(express.static(path.join(__dirname)));

  require('./reviews')(app, { dataDir: process.env.DATA_DIR || '/data' });
  ```
- Add dependency: `express-rate-limit` (and `express` if missing) to `package.json`.

### 2. Frontend
- Open `templates/reviews-section.html`. It has 3 parts marked with comments:
  - `<!-- HTML -->` → paste where the testimonials/reviews section should be (replace any hardcoded testimonials).
  - `<!-- CSS -->` → paste inside the page `<style>`.
  - `<!-- JS -->` → paste inside the page `<script>` (before `</script>`).
- If the site has a language switcher, call `window.ssApplyReviewLang('es'|'en')` from it (the module exposes this hook and also reads `localStorage.ss_lang`). If no switcher, it defaults to the value of `localStorage.ss_lang` or English.

### 3. Admin panel
- Copy `templates/admin.html` next to the server. `reviews.js` serves it at `/admin`.

### 4. Secrets / config (on the volume, never in code)
Create `/data/config.json` on the server (see `config.example.json`):
```json
{ "adminPassword": "<a strong password, NOT reused from server/root>",
  "callmebotPhone": "<owner phone, digits only, with country code e.g. 17863570624>",
  "callmebotApikey": "<from CallMeBot>" }
```
`reviews.js` also accepts these via env vars (`ADMIN_PASSWORD`, `CALLMEBOT_PHONE`, `CALLMEBOT_APIKEY`) as a fallback. Prefer the volume file so the secrets stay off the public web and out of the panel UI.

### 5. CallMeBot setup (free WhatsApp notifications)
The owner does this once on their phone:
1. Get the current CallMeBot WhatsApp number from https://www.callmebot.com/blog/free-api-whatsapp-messages/
2. Save it as a contact, then send it: `I allow callmebot to send me messages`
3. It replies with an **API key** → that + the owner's phone go into `config.json`.

---

## Deploying on EasyPanel (the environment this was built for)
- The service is a Node app (EasyPanel's Nixpacks auto-detects `package.json` → `npm start`; a `Dockerfile` may be ignored in favor of Nixpacks — set the port the app listens on accordingly, here `80`).
- **Persistent volume (required, or reviews vanish on every redeploy):**
  EasyPanel → service → **Storage** → **Add Volume Mount** → Name `data`, Mount Path `/data` → Save → Deploy.
  The named volume's host path is `docker volume inspect <project>_<service>_data -f '{{.Mountpoint}}'`
  (e.g. `/var/lib/docker/volumes/<project>_<service>_data/_data`). Write `config.json` there.
- Deploy can be triggered from the UI, or via the service's deploy webhook token:
  `curl -X POST http://localhost:3000/api/deploy/<TOKEN>` (token is in EasyPanel's data for the service).

## Gotchas learned building this (read before debugging)
- **CallMeBot free tier rate-limits**: messages sent within seconds of each other get silently dropped. Real reviews arrive spaced out so it's fine; when testing, wait ~20s between sends. No review is ever lost — WhatsApp is only the alert; everything is in `/admin`.
- **`server.js` is publicly served** by `express.static(__dirname)`. The BLOCKED guard (step 1) is mandatory so source/secrets aren't downloadable. Never hardcode secrets in served files — use `/data/config.json`.
- **Volume vs build dir**: EasyPanel's "code" dir is the *build source*, NOT mounted at runtime. Writes inside the container are ephemeral. Only the **volume** at `/data` persists. Put `reviews.json` + `config.json` there.
- **Approve/Delete links** use a per-review unguessable `token` (not the admin password), safe to send over WhatsApp. A deleted review's link correctly returns "invalid/no longer exists".
- **Node version**: Nixpacks may build Node 18 — global `fetch` is available there. On Node ≤16, add `node-fetch`.
- **Bilingual**: the frontend module keeps its own EN/ES dictionary and re-renders dynamic text (Read more/Ver más, thank-you/error messages) on language change via `window.ssApplyReviewLang(lang)`.

## Test checklist (end-to-end)
1. `GET /api/reviews` → `[]` initially.
2. `POST /api/reviews {name,stars,text}` → `{ok:true}`; owner gets WhatsApp.
3. `POST /api/admin/list {password}` → shows it as `pending`.
4. Open the WhatsApp **Approve** link → review becomes public; `GET /api/reviews` shows it.
5. **Delete** link or admin delete → gone.
6. `GET /server.js` and `GET /config.json` → **404** (guard works).
7. Toggle EN/ES → form, buttons, Read more all switch language.
