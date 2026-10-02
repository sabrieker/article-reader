# Article Reader

Article Reader helps you read a research article without getting bored, distracted or lost.

**Open it:** https://sabrieker.github.io/article-reader/

A **guide** splits one article into short steps across three passes:

| Pass | Time | What you do |
|---|---|---|
| 1 · Skim | 15 to 25 min | Abstract, introduction, figures, conclusion. Get the main idea. Decide if you go deeper. |
| 2 · Understand | 40 to 90 min | One section at a time, with check questions and key terms. |
| 3 · Think | 30 to 45 min | Explain it from memory, find weak points, connect it to your work. |

Every step tells you what to read and what to look for. Then it asks check questions. You answer
them first and reveal the answers after.

The page also has:

- A 25-minute focus timer with 5-minute breaks, and a focus mode that hides everything except the current step.
- A notebook with five entry types: Note, Question, Doubt, Idea and Parking lot (for distracting thoughts).
- A "Copy prompt for chatbot" button on questions. It copies the article summary and your question for any chatbot.
- Export and import of notes, and "Copy all as Markdown".

Your notes stay in your browser. Nothing is sent to a server.

## Make a guide for a new article

There are three ways. All of them use the same specification: [`prompts/make-guide.md`](prompts/make-guide.md).

### 1. Any chatbot, in the web page

1. Open the home page and go to **Make a guide for any article**.
2. Enter the article link and press **Copy prompt**.
3. Paste the prompt into a chatbot (Claude, ChatGPT, Gemini...). Attach the PDF if the chatbot cannot open the link.
4. Paste the JSON reply back into the page and press **Check and open**.

The page checks the guide. If it finds errors, it gives you a fix request to send back to the chatbot.
The guide is saved in your browser only.

### 2. Claude Code skill

```sh
git clone https://github.com/sabrieker/article-reader
cd article-reader
claude "/make-guide https://arxiv.org/abs/2609.22068"
```

The skill ([`.claude/skills/make-guide/SKILL.md`](.claude/skills/make-guide/SKILL.md)) fetches the full article.
Then it writes `guides/<id>.json`, adds the guide to `guides/index.json`, runs the validator and checks the numbers.

### 3. Command line, without an interactive session

```sh
tools/make-guide.sh https://arxiv.org/abs/2609.22068
```

This runs `claude -p` with the same skill. It is useful for many articles at once.

## Add a guide to the library

1. Make the guide with one of the ways above.
2. Run `node tools/validate.mjs`. It must print `OK` for every guide.
3. Open a pull request with `guides/<id>.json` and the new line in `guides/index.json`.

Before you send it, check the guide against the article. A model can get facts or numbers wrong.
A guide contains a summary and questions, never the article text itself.

## Run it on your computer

The page loads the guide files with `fetch`, so it needs a web server. Opening `index.html` directly as a file does not work.

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Files

| Path | What it is |
|---|---|
| `index.html`, `css/`, `js/app.js` | The reader page. No build step and no dependencies. |
| `js/guide-validate.js` | The guide checker. The page and `tools/validate.mjs` both use it. |
| `guides/` | The library: one JSON file per article, and `index.json` to list them. |
| `prompts/make-guide.md` | The guide specification and the prompt for chatbots. |
| `.claude/skills/make-guide/` | The Claude Code skill. |
| `tools/` | `validate.mjs` (check guides) and `make-guide.sh` (make a guide with `claude -p`). |

## License

MIT. See [LICENSE](LICENSE). The articles belong to their authors. The guides only summarize them and link to them.
