# mervinzhao.com

Personal site, web CV and installable business card, deployed to GitHub Pages from `main`.

- Status, to-dos, commands and setup: see `NOTES.md`.
- Private rules live in the header of `content/private.yaml`, which is gitignored and copied between machines by hand. Read it before editing content. If it's missing, ask before writing any new copy.
- The repo and its history are public. Never commit private data. `npm run check` and the pre-commit hook enforce it.
- Unapproved copy goes on a branch, not `main`: every push to `main` deploys.
- `content/cv.yaml` is the single source of truth. Don't hard-code content in templates.
- Never touch the `mervinzhao.github.io` repo.
