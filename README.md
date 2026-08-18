# Unformat

[![Tests](https://github.com/Jdka1/unformat/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/Jdka1/unformat/actions/workflows/test.yml)

Clean copy/paste artifacts into useful plain text—entirely in your browser.

**No uploads. No accounts. No rewriting.**

## What it cleans

- Unicode, odd spaces, hidden characters, line endings, and common mojibake
- Markdown headings, emphasis, links, lists, tables, and code fences
- Optional keyboard-style quotes, dashes, ellipses, and English prose spacing

Smart quotes and em dashes are valid typography; Unformat changes them only when you choose Plain Text. Code blocks and emoji joiner sequences stay protected.

## Use locally

```sh
python3 -m http.server 8000
npm test
```

Open `http://localhost:8000`.

## Publish with GitHub Pages

Push `main`, then choose **Settings → Pages → Deploy from a branch → main → /(root) → Save**. The site will be at `https://YOUR-USERNAME.github.io/unformat/`.

Every push runs the test workflow; the badge above updates with its latest result. See [GitHub’s badge documentation](https://docs.github.com/en/actions/how-tos/monitor-workflows/add-a-status-badge) and [Pages branch deployment guide](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
