---
name: make-guide
description: Make a new Article Reader reading guide from an article URL or PDF. Use when the user says "make a guide for <url>", "/make-guide <url>", or wants to add an article to the reader.
---

# Make a reading guide

Input: an article URL (arXiv abstract, HTML or PDF link, or another open web page) or a local PDF path.
Output: `guides/<id>.json`, a new entry in `guides/index.json`, and a passing validation.

## Steps

1. Read `prompts/make-guide.md`. It is the full specification of the guide: accuracy rules, language rules, structure and JSON format. Follow it exactly.
2. Get the full article text.
   - arXiv: use `https://arxiv.org/html/<id>` first. If it does not exist, use `https://arxiv.org/pdf/<id>`. Also read `https://arxiv.org/abs/<id>` for title, authors, date and category.
   - A local PDF: read it with the Read tool, in page ranges.
   - If you cannot get the full text (paywall, error), stop and tell the user. Do not make a guide from the abstract only.
3. Choose a short `id` (lowercase, dashes), for example the system name or first author plus year. Check that `guides/<id>.json` does not exist yet.
4. Write `guides/<id>.json`.
5. Add an entry to `guides/index.json`: `id`, `title`, `field` (short subject area), `minutes` (sum of step minutes), `steps` (number of steps).
6. Run `node tools/validate.mjs guides/<id>.json`. Fix every error and run it again until it prints `OK`.
7. Check the numbers. Pick 5 numbers from the guide and find each one in the article text. Fix any that do not match.
8. Tell the user: the file path, the number of steps, the total minutes, and anything you could not check. Do not commit or push unless the user asks.
