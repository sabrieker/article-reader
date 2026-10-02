# Make a reading guide

You make a reading guide for one research article. Students use the guide in the
Article Reader web page. The guide leads them through the article in three passes.

Read the whole article first. Then write the guide as one JSON object.

## Accuracy rules

- Use only facts that are in the article. Do not add facts from memory.
- Copy every number exactly as the article gives it. If you are not sure of a
  number, leave it out and say which section or figure to check.
- Give section, figure and table numbers exactly as the article uses them.
- The check question answers must come from the article. An open question (one
  with no answer in the article) must say so: start the answer with "Open question."
- If the article has no Limitations section, say so in the "Doubt it" step.

## Language rules

Many students read in a second language. Write so that the guide is easy to read.

- Short sentences. One idea per sentence. Active voice.
- Common words. No idioms and no metaphors.
- Keep the real technical terms. Explain each hard term once in the glossary.
- Inline markup: `**bold**` for labels and `==text==` to highlight the key
  words of a goal. No other markup and no HTML.

## Structure

Use these passes, in this order. Adapt the step titles and content to the article.

| pass | name | steps |
|---|---|---|
| 0 | Start | 1 step, id `goal`, `form: "purpose"`: set a reading goal. |
| 1 | Skim (15 to 25 min) | Title and abstract. Introduction (first and last paragraphs). Headings and figures only (add a `diagram` if the article has a main pipeline or model figure). Conclusion and first judgment (`form: "fiveCs"`). |
| 2 | Understand (40 to 90 min) | One step per main section or pair of short sections, in article order. Each with 2 to 3 checks. |
| 3 | Think (30 to 45 min) | "Rebuild it without the article" (`form: "rebuild"`). "Doubt it": weak points and missing evidence. "Connect it to your work" (`form: "summary"`). |

Each step has:
- `read`: exactly what to read, by section, figure and table number.
- `goal`: one sentence. What the student must find. Highlight key words with `==...==`.
- `focus`: 3 to 6 short points to look for, with the key facts and numbers.
- `terms`: glossary terms used in this step (each must be a key in `glossary`).
- `checks`: questions the student answers before reading the answer.
- `tip`: one reading habit that fits this step.

## JSON format

Reply with only the JSON object. No text before or after it.

```json
{
  "schemaVersion": 1,
  "id": "short-lowercase-id",
  "paper": {
    "title": "Full article title",
    "authors": "First Author, Second Author et al. (Main affiliations)",
    "venue": "arXiv 2609.22068 · cs.AI",
    "date": "YYYY-MM-DD",
    "links": [ { "label": "Abstract", "url": "https://..." }, { "label": "PDF", "url": "https://..." } ]
  },
  "summary": "2 to 3 sentences for the guide list (at most 600 characters).",
  "context": "A dense factual summary of the whole article, section by section, with the key numbers (1,500 to 12,000 characters). A chatbot uses it to answer student questions.",
  "glossary": { "Term": "Plain definition in 1 to 3 short sentences." },
  "steps": [
    {
      "id": "p1a",
      "pass": 1,
      "title": "Title and abstract",
      "minutes": 4,
      "read": "**Read:** title and abstract only.",
      "goal": "Find the ==problem==, the ==idea== and the ==main result==.",
      "focus": ["...", "..."],
      "terms": ["Term"],
      "checks": [ { "q": "Question?", "a": "Answer from the article." } ],
      "tip": "**Tip:** ...",
      "diagram": { "boxes": [ { "title": "Step one", "sub": "short detail" }, { "title": "Step two", "sub": "short detail" } ], "caption": "Input ... Output ..." }
    }
  ],
  "generatedBy": "Model name, source used (for example arXiv HTML), date"
}
```

## Limits (the page rejects a guide that breaks them)

- `id` and step ids: lowercase letters, digits and dashes. Step ids are unique.
- 4 to 30 steps, in pass order. `pass` is 0, 1, 2 or 3. `minutes` is a whole number from 1 to 120.
- `form` is one of `purpose`, `fiveCs`, `rebuild`, `summary`. Exactly one step has `summary`.
- `diagram` is optional: 2 to 6 boxes, box `title` at most 28 characters, `sub` at most 32.
- Every link URL starts with `https://`.
- `title` at most 90 characters, `read` at most 600, `goal` at most 400, each `focus` item at most 500,
  check `q` at most 400 and `a` at most 800, `tip` at most 500, each glossary definition at most 600.
