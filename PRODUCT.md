# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

In priority order:

1. **People met in person.** Someone who has just scanned the `/card/` QR code at a meeting or event, often in Japan, and wants to save the contact and remember who they met.
2. **Program and funding contacts.** Researchers, companies, agencies and funders checking background around ARPA-model program work (currently the ASCENT program at Renaissance Philanthropy).
3. **Readers of the "Currently thinking about" list.** People who should leave knowing which topics Mervin is working through, not only the job history.

## Product Purpose

A web CV and a digital business card. The landing page (`/`) presents current role, experience, education and selected publications, with one-tap ways to save the contact, email, or open LinkedIn. The card (`/card/`) is an installable app shown on a phone so someone else can scan it. Success: the visitor saves the contact or gets in touch, and can place Mervin's background accurately.

## Positioning

One person's record, from one source: every surface (landing page, card, vCard, and the planned CV PDF) is generated from `content/cv.yaml`, so they never disagree. The record spans molecular biology, solid-state physics, industrial nanofiber R&D, and energy technology program design.

## Operating Context

- Face-to-face exchange: the card is opened on Mervin's phone, the other person scans a QR code (URL or vCard), then often opens the site on their own phone. Phone layout is the first view many visitors get.
- Desktop visitors arrive from email signatures, LinkedIn, or links shared in program work.
- Japanese contacts are a core audience; the vCard carries the Japanese name with phonetic readings.

## Capabilities and Constraints

- Static site built with Node and Nunjucks, deployed to GitHub Pages from `main`. Every push to `main` deploys; unapproved copy lives on branches.
- `content/cv.yaml` is the single source of truth. Templates hold no content.
- The repo and its history are public. A private overlay (`content/private.yaml`, gitignored) adds private details to a separate private build; `npm run check` and the pre-commit hook block leaks.
- Landing sections and their order come from `site.sections` in `cv.yaml` (currently: thinking about, experience, education, publications).
- `/card/`: URL and vCard QR toggle, wake lock, offline, installable as "Card".
- vCard download with Japanese phonetic name and photo.
- Current behavior, not confirmed as fixed requirements: the landing page needs no JavaScript; pages are kept out of search indexes.
- Planned, not built: CV PDF (Typst) from `cv.yaml`, whose buttons appear automatically once it exists; Japanese and Chinese page text, with the language toggle hidden until then; `me@mervinzhao.com` as the home email.
- Undecided: final per-entry stories (`story:` in `cv.yaml`, drafts on `content-draft`), the three selected publications.

## Brand Commitments

- Name forms: Mervin Zhao, PhD; 趙 墨文 (family first, ruby readings ジャオ モーウェン); 赵墨文 for Chinese.
- Existing assets: the 墨文 seal (hero), the MZ monogram (app icon and favicon), the headshot and fog photo (`src/assets/photos/`), official organization logos with sources in `src/assets/logos/SOURCES.md`.
- Voice: plain and professional. No self-narrative openers ("I work on…"), no résumé clichés ("proven track record", "extensive network"). In stories, first person used sparingly; say why the work mattered and what made it hard; don't oversell or claim problems were solved; no name-dropping.
- UI must not look interactive unless it is: no chip or pill styling on items that don't link or filter.

## Evidence on Hand

- Roles, education, awards, patents and 16 publications in `content/cv.yaml`.
- Photos and seal in `src/assets/`; originals in the gitignored `photos-original/`.
- Absent, never to be invented: testimonials, endorsements, metrics of impact, or claims beyond what `cv.yaml` states.

## Product Principles

1. Contact first: saving the contact or emailing is always one tap away, on phone and desktop.
2. One source: change content in `cv.yaml`, never in a template.
3. Nothing private ships: if a detail isn't meant for the public repo, it lives in the private overlay or nowhere.
4. Understate: let the record carry the weight; the site should not read as self-promotion.
5. Built for two languages of readers: English now, Japanese and Chinese to come, with names rendered correctly in each.
