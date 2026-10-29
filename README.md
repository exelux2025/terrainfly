# TerrainFly

TerrainFly turns GPS activities into immersive 3D terrain views and cinematic route flyover videos.

Upload a Garmin FIT, GPX, or TCX file and generate a shareable flyover of your run, hike, trek, or ride.

## What is what (plain language)

TerrainFly needs **two kinds of input**:

1. **Where you went** — from Garmin (a GPS file, or later an API).
2. **What the land looks like** — from a map company (3D mountains + satellite photos). Garmin does **not** give us the 3D landscape.

| Thing | In one sentence | Needed when |
| --- | --- | --- |
| **Garmin FIT / GPX file** | The recording of one hike/run: lat/long, time, elevation. Not a password. | **V1 now** |
| **Mapbox public token (`pk.`)** | A pass so the browser can load Mapbox 3D terrain and satellite maps. | **V1 now** |
| **Mapbox secret token (`sk.`)** | Admin key that can change your Mapbox account. | **Never give this** |
| **MapTiler API key** | Backup map company. Same job as Mapbox if we switch engines. | Optional now |
| **Cesium ion token** | Backup 3D-globe company. Same job, different library. | Optional now |
| **FFmpeg** | Free program on your Mac that turns screen frames into an MP4. Not a login. | Video export |
| **Garmin Personal API key** | Lets the app pull **your** Garmin activities from the cloud. Your data only. Not for other users. | Later (nice) |
| **Garmin Business client id/secret** | Lets **other people** connect their Garmin accounts via official OAuth. Requires Garmin to approve Exelux as a business. | V4 product |
| **S3 / AWS keys** | Cloud folder for storing videos. | **Skip.** Local files first. |

Do **not** send Garmin email, password, or 2FA. Do **not** paste keys into chat or git. Put them in `.env.local` only.

## Do these in order

1. Mapbox public token → `.env.local`
2. Export one real FIT or GPX → `samples/`
3. (Optional) MapTiler key and Cesium token → `.env.local`
4. (When we export video) install FFmpeg
5. (Later) Garmin Personal API key for your own cloud activities
6. (Much later) Garmin Starter/business access so customers can connect
7. Skip S3

Then:

```bash
cp .env.example .env.local
```

Fill only the values you created. Leave S3 blank.

---

## 1. Mapbox public token — required for V1

**What it is:** A public `pk.` string. The website sends it to Mapbox to download 3D terrain tiles and satellite imagery. Anyone who views the page can see it, so we lock it to `localhost` with URL restrictions.

**What it is not:** The `sk.` secret token. If you see `sk.`, stop. That one stays in the Mapbox dashboard only.

### Steps

1. Open [https://account.mapbox.com](https://account.mapbox.com) and sign up / log in (email is fine).
2. Open [Access tokens](https://account.mapbox.com/access-tokens/).
3. Click **Create a token**. Do not reuse the “Default public token” for this project.
4. Name: `terrainfly-local-dev`.
5. **Public scopes:** leave the default public/read scopes. Do not turn on secret/write scopes.
6. **URL restrictions** (required):
   - `http://localhost:3000`
   - `http://127.0.0.1:3000`
7. Create the token. Mapbox may ask for your account password.
8. Copy the value. It **must** start with `pk.`
9. In this repo, put it in `.env.local`:

```
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.paste_the_whole_token_here
```

No quotes, no spaces.

A credit card is not required to start. Add billing on Mapbox only if you outgrow the free cap.

When we deploy a real domain, create a **second** token restricted to that domain. Do not reuse the localhost token.

Docs: [tokens](https://docs.mapbox.com/accounts/guides/tokens/), [3D terrain](https://docs.mapbox.com/mapbox-gl-js/example/add-terrain/).

---

## 2. Garmin activity file — required for V1

**What it is:** One exported workout. FIT is Garmin’s original format (richest). GPX is a simpler XML track. Either works.

**What it is not:** Access to your Garmin account. No API key is involved.

### Steps (Garmin Connect website)

1. Open [https://connect.garmin.com](https://connect.garmin.com) and sign in.
2. Open **Activities** and pick a real outdoor activity. A mountain trek is best (idea doc suggests Rinjani / Senaru Crater Rim).
3. Open the activity, then the gear / more menu.
4. Prefer **Export Original** (`.fit`). **Export GPX** is the fallback.
5. Save the file into `samples/` in this project. Example: `samples/rinjani.fit`
6. Do not commit it. Those extensions are gitignored.

That file is enough to prove: parse GPS → draw route on 3D terrain.

---

## 3. MapTiler API key — optional backup

**What it is:** Same idea as Mapbox, different vendor. Used if we render with MapLibre instead of Mapbox GL.

### Steps

1. Sign up at [https://cloud.maptiler.com](https://cloud.maptiler.com).
2. Open [API keys](https://cloud.maptiler.com/account/keys/).
3. Click **New key**. Name: `terrainfly-local-dev`.
4. Under **Allowed HTTP origins**, add (one per line, no `http://`):
   - `localhost`
   - `127.0.0.1`
5. Save and copy the key.
6. Put it in `.env.local`:

```
NEXT_PUBLIC_MAPTILER_API_KEY=paste_key_here
```

Create a separate production key later, restricted to the real domain only. Never leave `localhost` on a production key.

Docs: [API key](https://docs.maptiler.com/guides/developer/credentials/api-key/).

---

## 4. Cesium ion token — optional backup

**What it is:** Access to Cesium’s 3D globe, world terrain, and imagery. Only needed if we use CesiumJS instead of (or besides) Mapbox.

### Steps

1. Sign up at [https://ion.cesium.com](https://ion.cesium.com).
2. Open [Access tokens](https://ion.cesium.com/tokens).
3. Click **Create token**. Name: `terrainfly-local-dev`.
4. Enable **only** public scopes: `assets:read` and optionally `geocode`.
5. Do **not** enable `assets:write`, `tokens:write`, `profile:read`, or other private scopes.
6. Allowed URLs:
   - `http://localhost:3000`
   - `http://127.0.0.1:3000`
7. Copy the token into `.env.local`:

```
NEXT_PUBLIC_CESIUM_ION_ACCESS_TOKEN=paste_token_here
```

Do not use the account’s default token in production.

Docs: [Cesium ion tokens](https://cesium.com/learn/ion/cesium-ion-access-tokens).

---

## 5. FFmpeg — for video export, not V1

**What it is:** A local program that encodes MP4s. No account, no key.

On this Mac:

```bash
brew install ffmpeg
which ffmpeg
```

If Homebrew is missing: [https://brew.sh](https://brew.sh). Optionally set `FFMPEG_PATH` in `.env.local` to the `which ffmpeg` path. Leave it blank until we build export.

---

## 6. Garmin Personal API key — later, your data only

**What it is:** A key from **your** Garmin Connect account so the app can list and download **your** activities without a file upload.

**What it is not:** Permission for other TerrainFly users. Garmin says Personal API is not for commercial apps that serve other people. Treat the key like a password. It is shown **once**.

**When to create it:** After V1 works with a file upload. Useful for “import my latest trek” during testing.

### Steps

1. Open [https://connect.garmin.com/app/settings/personalApiToken](https://connect.garmin.com/app/settings/personalApiToken) (or Connect → Settings → Personal API Key).
2. **Create Key**, accept terms.
3. Choose expiry (1 year is fine).
4. Copy it immediately. If you lose it, delete and create a new one (only one active key).
5. Put it in `.env.local` only. **Never** `NEXT_PUBLIC_`. **Never** paste it in chat.

```
GARMIN_PERSONAL_API_KEY=paste_key_here
```

Overview: [Garmin Connect Developer Program](https://developer.garmin.com/gc-developer-program). Personal FAQ: [personal API](https://developer.garmin.com/gc-developer-program/personal/).

---

## 7. Garmin Business / Starter — V4, other users

**What it is:** Official OAuth so a customer clicks “Connect Garmin” and Garmin sends **their** activities to TerrainFly. Garmin issues a **client id** and **client secret** after they approve the company.

**What it is not:** Your Personal API key. Do not use Personal API for other people’s accounts.

### Steps (when we are ready)

1. Read [program overview](https://developer.garmin.com/gc-developer-program).
2. Apply as the company that will own the product (Exelux), using [Starter access request](https://www.garmin.com/en-US/forms/StarterGarminConnectDeveloperAccess/).
3. Expect: company name, website, privacy policy URL, contact, how the app uses Activity API, business model, expected connected users, whether AI/ML will process Garmin data.
4. Ask only for **Activity API** at first (FIT/GPX). Skip Health / Women’s Health unless we have a real need.
5. After approval, create an app in Garmin’s portal. Copy **Client ID** and **Client Secret** into `.env.local` (server only):

```
GARMIN_CLIENT_ID=
GARMIN_CLIENT_SECRET=
GARMIN_REDIRECT_URI=http://localhost:3000/api/garmin/callback
```

Never put these in the browser. Never ask a user for their Garmin password.

---

## 8. S3 — skip

Videos stay on disk / in the browser for the prototype. No AWS keys.

---

## Safe integration rules

1. `.env.local` is gitignored. Never commit it.
2. `NEXT_PUBLIC_*` is visible in the browser. Only URL-restricted **public** map tokens go there.
3. Garmin keys, Mapbox `sk.`, and any cloud secrets stay server-side or in `.env.local` without `NEXT_PUBLIC_`.
4. Do not use unofficial Garmin scrapers or session cookies.
5. Do not commit personal `.fit` / `.gpx` / `.tcx` files.
6. One token per environment (local vs production). Rotate anything pasted in chat or a screenshot.

## What we will not ask you for

- Garmin password or 2FA
- Mapbox `sk.` secret token
- Credit-card numbers (add billing in each vendor dashboard yourself if needed)
- AWS / S3 keys

## Run V1 locally

Tokens stay in `.env` (already gitignored). The Mapbox token is restricted to port 3000.

```bash
npm install
npm test
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use **Load local sample** if `samples/` has a GPX/FIT file, or upload one. Toggle satellite/standard, then Play flyover.
