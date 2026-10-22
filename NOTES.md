# Project notes

Status and to-dos for mervinzhao.com. Last updated 2026-10-21.

## Setting up on another machine

1. Install **Node 22+** and **git**. Optional: **gh** (GitHub CLI) and **Typst** (needed once the CV PDF exists).
2. Clone and install:
   ```
   git clone https://github.com/mervinzhao/mervinzhao.com.git
   cd mervinzhao.com
   npm install      # also turns on the leak-check pre-commit hook
   npm run dev      # http://localhost:8080, rebuilds on save
   ```
3. Copy these by hand. They are gitignored on purpose:
   - `content/private.yaml`: private overlay plus private rules. **Read its header.**
   - `photos-original/`: only needed to re-crop photos or redo the seal.
   - `HANDOFF.md`: the original design spec.
4. The first build downloads about 30 MB of font sources into `.cache/fonts/`, once.

## Branches

- `main`: deploys to mervinzhao.com on every push (GitHub Actions → Pages).
- `content-draft`: unapproved copy, not deployed. Pending as of 2026-10-22: draft Cornell and Berkeley stories (not final).

  To review it: `git checkout content-draft && npm run dev`. To ship it: merge into `main` and push.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Local preview on :8080 with rebuild on save |
| `npm run dev:private` | Private build preview on :8081 (uses `private.yaml`) |
| `npm run build` | Build `dist/` |
| `npm run check` | Leak check over `dist/` and every committable file |
| `npm run photos` | Re-crop photos from `photos-original/` (crops in `src/assets/photos/photos.yaml`). `npm run photos -- hero` redoes one entry. |
| `node scripts/seal.mjs` | Rebuild the 墨文 seal from `photos-original/seal-reference.webp` |
| `node scripts/logos.mjs` | Re-fetch org logos from official sources |

## Where things live

- `content/cv.yaml`: single source of truth for the site, card, vCard and (soon) CV PDF.
- `theme/tokens.yaml`: colors and fonts. Switch theme with `active:`.
- `src/templates/`: Nunjucks pages. `sections/` holds one file per landing section; order comes from `site.sections` in `cv.yaml`.
- `src/styles/`: `base.css` is shared, plus `landing.css` and `card.css`.
- `src/assets/`: logos, derived photos and the seal. Originals never go here.
- `scripts/`: the build and the asset pipelines.

## Done

- Repo, Pages via Actions, custom domain, HTTPS, domain verified.
- Landing page (phone layout plus desktop split layout), no JavaScript required.
- `/card/` app with URL and vCard QR toggle (v2 and v11), wake lock, offline, installable.
- vCard download with Japanese phonetic name and photo.
- Official org logos, 墨文 seal and headshot in the hero, fog photo for link previews.
- Card app icon and favicon: MZ monogram with the coral rule.
- Leak guard covering phone patterns, Gmail, private values, forbidden terms and image metadata.
- Landing leads with "Currently thinking about" (five topics); no About section, focus chips, conversation line or publication count.

## Open: content (in progress)

- [ ] Stories: a short paragraph per experience and education entry (`story:` field in `cv.yaml`, shown under the role on phone and desktop).
  - Drafted on `content-draft`, not final: Cornell and Berkeley. Still being reworked.
  - Still to write: 4C Air, Newlab, Speculative Technologies, ARPA-E (Booz Allen), ASCENT (RenPhil). Mervin sends raw notes for each; drafts come from those.
  - What we're aiming for, from the review so far:
    - First person, used sparingly ("I" to open, then "my project" or "we" for lab work).
    - Mostly professional. Say why the work mattered in the bigger picture of the field and what made it hard, not just what was done.
    - Don't oversell, and don't claim problems were solved.
    - Avoid name-dropping and speculation about named people.
  - Through-line to carry forward: molecular biology → DNA as a polymer and optical nanomaterials → solid-state physics → back to polymers at industrial scale at 4C Air (nanofibers, roll-to-roll).
  - Berkeley runs to six sentences, long on a phone. Trim it when finalizing.
- [ ] Confirm the three selected publications.
- [ ] Japanese and Chinese page text; have a Japanese colleague check 趙 墨文 and its readings. The language toggle stays hidden until these exist.

## Open: build

- [ ] **CV PDF (Typst)** from `cv.yaml`: full detail, all publications and patents. The private build adds the private overlay. Once `cv.pdf` exists, the CV buttons appear automatically.
- [x] App icon: now an MZ monogram outlined from Geist (`scripts/lib/icons.mjs`), also the site favicon. The installed app is named "Card" (full name "Mervin Zhao · Card", set in `cv.yaml` under `site.card_app`). Safe to install on a phone.
- [ ] Seal (hero only now): find the original seal file (on the desktop) and redo it at full resolution.

## Open: email and testing

- [ ] `me@mervinzhao.com` via Cloudflare Email Routing:
  - Enable routing, create `me@`, verify the destination inbox, and accept the MX and SPF records.
  - If sending through Gmail: set up "Send mail as", and add `include:_spf.google.com` to SPF.
  - Test delivery to Gmail and to a Japanese corporate address, then switch `person.email.home`.
- [ ] Scan both card QR codes on several phones. If any struggles, raise `QUIET` in `scripts/lib/qr.mjs` to 3 or 4.
- [ ] Import the `.vcf` into Google Contacts and check the phonetic fields and photo.
- [ ] Optional: AAAA records for IPv6 (`2606:50c0:8000::153` through `8003::153`).
- [ ] Optional: redirect from `mervin.ink` if purchased.

## Gotchas

- With `npm run dev` running, a manual `npm run build` can collide with its rebuild (`ENOTEMPTY`). Just rerun.
- The card's service worker caches aggressively. After changing the card, reload twice, or clear site data.
- `mervinzhao.github.io` (the user-site repo) must never get a custom domain. That would move the other project sites.
