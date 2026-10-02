import { validateGuide } from "./guide-validate.js";

/* ---------- Fixed reading method ---------- */
const PASSES = [
  { n: 0, name: "Start" },
  { n: 1, name: "Pass 1 · Skim" },
  { n: 2, name: "Pass 2 · Understand" },
  { n: 3, name: "Pass 3 · Think" }
];
const TYPES = [
  { k: "note", name: "Note", c: "var(--t-note)", ph: "A fact or number you want to keep..." },
  { k: "question", name: "Question", c: "var(--t-question)", ph: "Something you do not understand..." },
  { k: "doubt", name: "Doubt", c: "var(--t-doubt)", ph: "A claim you do not fully believe..." },
  { k: "idea", name: "Idea", c: "var(--t-idea)", ph: "Something you could use or try..." },
  { k: "park", name: "Parking lot", c: "var(--t-park)", ph: "A distracting thought. Write it and go back to reading." }
];
const GOALS = ["Learn how the method works", "Reuse an idea in my own work", "Compare with work I know", "Only get the main idea"];
const FORMS = {
  fiveCs: { title: "The Five Cs", rows: [
    ["category", "Category", "What type of article is it? (new method, dataset, analysis, survey, system...)"],
    ["context", "Context", "Which other work is it close to? Which ideas does it build on?"],
    ["correctness", "Correctness", "Do the main assumptions look valid to you?"],
    ["contributions", "Contributions", "What are the main new things?"],
    ["clarity", "Clarity", "Is it well written? Where did you get lost?"]] },
  rebuild: { title: "Rebuild from memory", rows: [
    ["r_problem", "The problem", "What problem does the article solve? Why did older work not solve it?"],
    ["r_method", "The method in 5 steps", "Step 1 ... Step 5, in your own words."],
    ["r_evidence", "The evidence", "Which result convinces you most? Which one least?"]] },
  summary: { title: "Final summary", rows: [
    ["s_one", "One sentence", "This article shows that ..."],
    ["s_use", "What I will use", "One idea I can apply, and where."],
    ["s_open", "What is still unclear", "The biggest open question for me."],
    ["s_rate", "My rating", "How useful for my goal (1 to 5), and why."]] }
};

/* ---------- Helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/==(.+?)==/g, "<mark>$1</mark>");
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const lsGet = (k, d) => { try { const t = localStorage.getItem(k); return t ? JSON.parse(t) : d; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
function toast(t) { const el = $("#toast"); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, 2600); }
async function copyText(text, okMsg) {
  try { await navigator.clipboard.writeText(text); toast(okMsg); }
  catch (e) {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.cssText = "position:fixed;inset:10% 5%;z-index:60;height:80%;width:90%";
    document.body.appendChild(ta); ta.select();
    toast("Copy is blocked. The text is selected: press Ctrl+C or Cmd+C, then click outside.");
    ta.addEventListener("blur", () => ta.remove());
  }
}
function download(name, text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
function parseLooseJson(text) {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  else if (!t.startsWith("{")) { const a = t.indexOf("{"), b = t.lastIndexOf("}"); if (a >= 0 && b > a) t = t.slice(a, b + 1); }
  return JSON.parse(t);
}
const myGuides = () => lsGet("ar:guides", {});
const stateKey = (kind, id) => `ar:state:${kind}:${id}`;

/* ---------- Router ---------- */
const params = new URLSearchParams(location.search);
const route = params.get("guide") ? { kind: "lib", id: params.get("guide") } : params.get("mine") ? { kind: "mine", id: params.get("mine") } : null;
if (route) openReader(route); else renderHome();

/* =================================================================
   HOME
   ================================================================= */
async function renderHome() {
  document.title = "Article Reader";
  $("#paperHead").innerHTML = `<div class="meta">Read research articles in three guided passes.</div>`;
  let lib = [];
  try { lib = (await (await fetch("guides/index.json", { cache: "no-cache" })).json()).guides || []; } catch (e) { lib = []; }
  const mine = myGuides();
  const progress = (kind, id, g) => {
    const st = lsGet(stateKey(kind, id), null);
    const total = g && g.steps ? g.steps.length : 0;
    const d = st ? Object.keys(st.done || {}).length : 0;
    return { d, total, pct: total ? Math.round(d / total * 100) : 0, started: !!st };
  };
  const libCards = lib.map(g => {
    const st = lsGet(stateKey("lib", g.id), null);
    const d = st ? Object.keys(st.done || {}).length : 0;
    return `<a class="guide-card" href="?guide=${encodeURIComponent(g.id)}">
      <h3>${esc(g.title)}</h3>
      <div class="row"><span>${esc(g.field || "")}</span><span class="mono">about ${Number(g.minutes) || "?"} min</span>${st ? `<span class="mono">${d}/${Number(g.steps) || "?"} done</span>` : ""}</div>
      ${st && g.steps ? `<div class="bar"><i style="width:${Math.min(100, Math.round(d / g.steps * 100))}%"></i></div>` : ""}
    </a>`;
  }).join("") || `<div class="empty">The guide list did not load. Open the page from a web server, not as a local file.</div>`;
  const mineIds = Object.keys(mine);
  const mineCards = mineIds.map(id => {
    const g = mine[id], p = progress("mine", id, g);
    return `<div class="guide-card">
      <a href="?mine=${encodeURIComponent(id)}" style="text-decoration:none;color:inherit"><h3>${esc(g.paper.title)}</h3></a>
      <div class="row"><span class="mono">${g.steps.length} steps</span>${p.started ? `<span class="mono">${p.d}/${p.total} done</span>` : ""}<span>in this browser</span></div>
      ${p.started ? `<div class="bar"><i style="width:${p.pct}%"></i></div>` : ""}
      <div class="row"><a class="btn small" href="?mine=${encodeURIComponent(id)}">Open</a>
      <button class="btn small" data-export-guide="${esc(id)}">Download guide file</button>
      <button class="btn small" data-remove-guide="${esc(id)}">Remove</button></div>
    </div>`;
  }).join("");

  $("#view").innerHTML = `<div class="home">
    <section class="hero">
      <h2>Read a research article without getting lost.</h2>
      <p>Each guide splits one article into short steps. Every step tells you what to read and what to look for. Then it checks what you understood. Your notes and questions stay next to the step they belong to.</p>
      <div class="passes-row">
        <div class="pass-card"><b>Pass 1 · Skim</b><span>15 to 25 minutes. Abstract, introduction, figures, conclusion. Get the main idea and decide if you go deeper.</span></div>
        <div class="pass-card"><b>Pass 2 · Understand</b><span>40 to 90 minutes. One section at a time, with check questions and key terms.</span></div>
        <div class="pass-card"><b>Pass 3 · Think</b><span>30 to 45 minutes. Explain it from memory, find weak points, connect it to your work.</span></div>
      </div>
    </section>

    <section>
      <div class="section-h"><h2>Guides in the library</h2><span class="label">${lib.length} guide${lib.length === 1 ? "" : "s"}</span></div>
      <div class="guide-list">${libCards}</div>
    </section>

    ${mineIds.length ? `<section><div class="section-h"><h2>My guides</h2><span class="label">saved in this browser</span></div><div class="guide-list">${mineCards}</div></section>` : ""}

    <section class="maker" id="maker">
      <div class="section-h"><h2>Make a guide for any article</h2><span class="label">works with any chatbot</span></div>
      <ol>
        <li><p><b>Copy the guide prompt.</b> Add the article link. The prompt tells the chatbot exactly how to build the guide.</p>
          <div class="field-row"><input id="artUrl" type="url" placeholder="https://arxiv.org/abs/2609.22068" aria-label="Article link">
          <button class="btn primary" id="copyPrompt">Copy prompt</button></div></li>
        <li><p><b>Paste it into a chatbot</b> (Claude, ChatGPT, Gemini...). If the chatbot cannot open the link, upload the article PDF in the same message. Wait for the JSON reply.</p></li>
        <li><p><b>Paste the reply here.</b> The page checks the guide. If something is wrong, it gives you a fix request to send back to the chatbot.</p>
          <textarea id="guideJson" rows="6" placeholder='{"schemaVersion": 1, "id": "...", ...}' aria-label="Guide JSON"></textarea>
          <div class="field-row" style="margin-top:8px">
            <button class="btn primary" id="checkGuide">Check and open</button>
            <label class="btn" for="guideFile">Load a guide file</label>
            <input id="guideFile" type="file" accept=".json,application/json" hidden>
          </div>
          <div id="checkOut" style="margin-top:10px"></div></li>
      </ol>
      <div>
        <p style="margin:0 0 6px"><b>Using Claude Code?</b> Clone the repository and run the <span class="mono">make-guide</span> skill. Claude reads the full article, writes the guide and checks it.</p>
        <div class="cli">git clone https://github.com/sabrieker/article-reader
cd article-reader
claude "/make-guide https://arxiv.org/abs/2609.22068"
# or, without an interactive session:
tools/make-guide.sh https://arxiv.org/abs/2609.22068</div>
      </div>
      <p class="foot" style="margin:0">A guide made by a chatbot can contain mistakes. Each step names the section and figure, so you can check the facts in the article. Guides you add here stay in this browser only. To share a guide with everyone, send it as a pull request to the repository.</p>
    </section>

    <p class="foot">Article Reader is open source. <a href="https://github.com/sabrieker/article-reader" target="_blank" rel="noopener">Source code and guide format on GitHub</a>. Your notes stay in your browser. Nothing is sent to a server.</p>
  </div>`;

  $("#copyPrompt").addEventListener("click", async () => {
    let p;
    try { p = await (await fetch("prompts/make-guide.md", { cache: "no-cache" })).text(); }
    catch (e) { toast("The prompt did not load. Check your connection."); return; }
    const url = $("#artUrl").value.trim();
    p += `\n\n## The article\n\n${url ? url : "The article is attached to this message."}\n\nIf you cannot open the full text of the article, say so and ask me to upload the PDF. Do not build a guide from the abstract only.`;
    copyText(p, "Prompt copied. Paste it into a chatbot.");
  });
  const accept = (g, raw) => {
    const out = $("#checkOut");
    const errs = validateGuide(g);
    if (errs.length) {
      out.innerHTML = `<div class="errors">The guide has ${errs.length} problem${errs.length === 1 ? "" : "s"}:\n${esc(errs.slice(0, 40).join("\n"))}</div>
        <div class="field-row" style="margin-top:8px"><button class="btn" id="copyFix">Copy fix request for the chatbot</button></div>`;
      $("#copyFix").addEventListener("click", () => copyText(`Your guide JSON has these problems. Fix all of them and reply with the full corrected JSON only:\n\n${errs.join("\n")}`, "Fix request copied. Paste it into the same chat."));
      return;
    }
    const all = myGuides(); all[g.id] = g;
    if (!lsSet("ar:guides", all)) { out.innerHTML = `<div class="errors">This browser does not allow saving. Turn off private mode, or allow site data.</div>`; return; }
    location.search = "?mine=" + encodeURIComponent(g.id);
  };
  $("#checkGuide").addEventListener("click", () => {
    const raw = $("#guideJson").value;
    if (!raw.trim()) { $("#checkOut").innerHTML = `<div class="errors">Paste the chatbot reply first.</div>`; return; }
    let g; try { g = parseLooseJson(raw); }
    catch (e) { $("#checkOut").innerHTML = `<div class="errors">This is not valid JSON: ${esc(e.message)}\nAsk the chatbot: "Reply with the JSON object only."</div>`; return; }
    accept(g, raw);
  });
  $("#guideFile").addEventListener("change", ev => {
    const f = ev.target.files[0]; if (!f) return;
    f.text().then(t => { try { accept(parseLooseJson(t), t); } catch (e) { $("#checkOut").innerHTML = `<div class="errors">The file is not valid JSON: ${esc(e.message)}</div>`; } });
  });
  $("#view").addEventListener("click", ev => {
    const b = ev.target.closest("button"); if (!b) return;
    if (b.dataset.exportGuide) { const g = myGuides()[b.dataset.exportGuide]; download(`${g.id}.json`, JSON.stringify(g, null, 2)); }
    if (b.dataset.removeGuide) {
      if (b.dataset.armed) { const all = myGuides(); delete all[b.dataset.removeGuide]; lsSet("ar:guides", all); renderHome(); }
      else { b.dataset.armed = "1"; b.textContent = "Click again to remove"; setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = "Remove"; } }, 3000); }
    }
  });
}

/* =================================================================
   READER
   ================================================================= */
async function openReader(r) {
  let G = null, problem = "";
  if (r.kind === "mine") { G = myGuides()[r.id] || null; if (!G) problem = "This guide is not saved in this browser."; }
  else {
    try { const res = await fetch(`guides/${encodeURIComponent(r.id)}.json`, { cache: "no-cache" }); if (!res.ok) throw new Error(res.status); G = await res.json(); }
    catch (e) { problem = `The guide "${r.id}" was not found.`; }
  }
  const errs = G ? validateGuide(G) : [];
  if (!G || errs.length) {
    $("#view").innerHTML = `<div class="home"><section class="maker"><h2 style="font-family:var(--display);margin:0">This guide cannot open</h2>
      <p style="margin:0">${esc(problem || "The guide file has errors.")}</p>${errs.length ? `<div class="errors">${esc(errs.join("\n"))}</div>` : ""}
      <p style="margin:0"><a class="btn" href="./">Back to all guides</a></p></section></div>`;
    return;
  }
  startReader(G, stateKey(r.kind, r.id));
}

function startReader(G, KEY) {
  const STEPS = G.steps;
  const blank = () => ({ cur: STEPS[0].id, done: {}, checks: {}, purpose: "", firstQ: "", forms: {}, entries: [], v: 1 });
  let S = Object.assign(blank(), lsGet(KEY, {}));
  if (!STEPS.some(s => s.id === S.cur)) S.cur = STEPS[0].id;
  let capType = "note", filter = "all", editing = null, saveTimer = null;
  const stepById = id => STEPS.find(s => s.id === id) || STEPS[0];
  const stepLabel = s => s.pass === 0 ? "Start" : `P${s.pass}.${STEPS.filter(x => x.pass === s.pass).indexOf(s) + 1}`;
  const save = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      $("#saveState").textContent = lsSet(KEY, S) ? "saved " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "not saved: browser storage is off";
    }, 400);
  };

  document.title = `${G.paper.title.split(":")[0]} · Article Reader`;
  $("#paperHead").innerHTML = `<h1>${esc(G.paper.title)}</h1><div class="meta">${esc(G.paper.authors)} · ${esc(G.paper.venue)}${G.paper.date ? " · " + esc(G.paper.date) : ""}
    ${G.paper.links.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join("")}</div>`;
  $("#readerTools").hidden = false;

  $("#view").innerHTML = `<div class="app">
    <nav class="rail" aria-label="Reading path"><div class="passes" id="rail"></div>
      <div class="rail-note">Three passes. Each pass goes deeper. You can stop after any pass and still keep what you learned.</div></nav>
    <main class="main" id="main"></main>
    <aside class="book" id="book" aria-label="Notebook">
      <div class="book-h"><h2>Notebook</h2><span class="save-state" id="saveState">saved in this browser</span><button class="btn small book-toggle" id="bookClose">Close</button></div>
      <div class="filters" id="filters"></div>
      <div class="entries" id="entries"></div>
      <div class="book-foot">
        <button class="btn small" id="copyMd">Copy all as Markdown</button>
        <button class="btn small" id="exportNotes">Export notes</button>
        <label class="btn small" for="importNotes">Import notes</label><input id="importNotes" type="file" accept=".json,application/json" hidden>
      </div>
      <p class="save-state" style="margin:10px 0 0">Notes stay in this browser. Use Export to move them to another device.</p>
    </aside></div>`;

  /* ---- Rail ---- */
  function renderRail() {
    $("#rail").innerHTML = PASSES.map(p => {
      const steps = STEPS.filter(s => s.pass === p.n);
      if (!steps.length) return "";
      const mins = steps.reduce((a, s) => a + s.minutes, 0);
      return `<div class="pass"><div class="pass-h"><b>${p.name}</b><span class="label">${steps.filter(s => S.done[s.id]).length}/${steps.length} · ${mins}m</span></div>
        <ol class="steps">${steps.map((s, i) => `<li><button class="step-btn ${S.done[s.id] ? "done" : ""} ${S.cur === s.id ? "cur" : ""}" data-step="${esc(s.id)}" ${S.cur === s.id ? 'aria-current="step"' : ""}>
          <span class="dot">${S.done[s.id] ? "✓" : (p.n === 0 ? "•" : i + 1)}</span><span class="nm">${esc(s.title)}</span><span class="min">${s.minutes}m</span></button></li>`).join("")}</ol></div>`;
    }).join("");
    $("#progBar").style.width = (STEPS.filter(s => S.done[s.id]).length / STEPS.length * 100) + "%";
    const cur = $("#rail .step-btn.cur"); if (cur && innerWidth <= 780) cur.scrollIntoView({ block: "nearest", inline: "center" });
  }

  /* ---- Main ---- */
  function diagramSvg(d) {
    const n = d.boxes.length, w = 150, h = 64, gap = 24, x0 = 6, W = x0 * 2 + n * w + (n - 1) * gap;
    let g = "";
    d.boxes.forEach((b, i) => {
      const x = x0 + i * (w + gap);
      g += `<rect class="box" x="${x}" y="8" width="${w}" height="${h}" rx="6"/><text class="num" x="${x + 10}" y="27">${i + 1}</text>
        <text x="${x + 24}" y="27" font-weight="600">${esc(b.title)}</text>${b.sub ? `<text class="sm" x="${x + 10}" y="52">${esc(b.sub)}</text>` : ""}`;
      if (i < n - 1) g += `<path class="arr" d="M${x + w + 3} 40 H${x + w + gap - 4} M${x + w + gap - 9} 35 L${x + w + gap - 4} 40 L${x + w + gap - 9} 45"/>`;
    });
    return `<div class="fig"><svg viewBox="0 0 ${W} 80" style="min-width:${Math.min(W, 640)}px" role="img" aria-label="${esc(d.boxes.map(b => b.title).join(", then "))}">${g}</svg></div>${d.caption ? `<p class="fig-cap">${esc(d.caption)}</p>` : ""}`;
  }
  function formBlock(f) {
    return `<div class="sec"><h3 class="label">${f.title}</h3><div class="form-grid">${f.rows.map(([k, l, h]) =>
      `<div class="five"><label for="f_${k}">${esc(l)} <span class="hint">${esc(h)}</span></label><textarea id="f_${k}" data-form="${k}" rows="2">${esc(S.forms[k] || "")}</textarea></div>`).join("")}</div></div>`;
  }
  function renderMain() {
    const s = stepById(S.cur), idx = STEPS.indexOf(s), prev = STEPS[idx - 1], next = STEPS[idx + 1];
    const doneN = STEPS.filter(x => S.done[x.id]).length;
    let html = "";
    if (idx === 0 && doneN === 0) {
      const mins = p => STEPS.filter(x => x.pass === p).reduce((a, x) => a + x.minutes, 0);
      html += `<section class="card welcome"><h2>How this works</h2>
        <p style="margin:0;max-width:68ch">You read the article in <b>three passes</b>. Each pass has short steps. Each step tells you <b>what to read</b> and <b>what to look for</b>, and gives you <b>check questions</b>. Your notes and questions go to the <b>notebook</b>.</p>
        <ol><li><b>Pass 1 (skim, ${mins(1)} min):</b> get the main idea. You may stop after this.</li>
          <li><b>Pass 2 (understand, ${mins(2)} min):</b> read section by section. Answer the checks.</li>
          <li><b>Pass 3 (think, ${mins(3)} min):</b> rebuild it from memory, find weak points, connect it to your work.</li></ol>
        <p style="margin:12px 0 0;max-width:68ch;color:var(--muted);font-size:14px">Use the 25-minute timer. Take the 5-minute break when it ends. You do not need to finish in one day. The page remembers where you stopped.</p></section>`;
    }
    html += `<section class="card" aria-labelledby="stepTitle">
      <div class="step-head"><div style="flex:1 1 300px;min-width:0"><div class="label">${s.pass === 0 ? "Start" : `${PASSES[s.pass].name} · ${stepLabel(s)}`}</div><h2 id="stepTitle">${esc(s.title)}</h2></div>
      <span class="chip mono">${s.minutes} min</span></div>
      <div class="read-where">${md(s.read)}</div>
      <p class="goal">${md(s.goal)}</p>`;
    if (s.form === "purpose") {
      html += `<div class="sec"><h3 class="label">My reading goal</h3><div class="types" role="radiogroup" aria-label="Reading goal">${GOALS.map(g =>
        `<button class="type-btn" role="radio" aria-checked="${S.purpose === g}" aria-pressed="${S.purpose === g}" data-purpose="${esc(g)}">${esc(g)}</button>`).join("")}</div>
        <div class="five" style="margin-top:14px"><label for="firstQ">My main question <span class="hint">What do you want to know when you finish?</span></label>
        <textarea id="firstQ" rows="2">${esc(S.firstQ)}</textarea></div></div>`;
    }
    html += `<div class="sec"><h3 class="label">Look for this</h3><ul class="focus-list">${s.focus.map(f => `<li>${md(f)}</li>`).join("")}</ul></div>`;
    if (s.diagram) html += `<div class="sec"><h3 class="label">The main figure in short</h3>${diagramSvg(s.diagram)}</div>`;
    if (s.terms && s.terms.length) html += `<div class="sec"><h3 class="label">Key terms · tap to see</h3><div class="terms">${s.terms.map(t =>
      `<button class="term" aria-expanded="false" data-term="${esc(t)}">${esc(t)}</button>`).join("")}</div><div class="term-def" id="termDef" hidden></div></div>`;
    if (s.checks && s.checks.length) html += `<div class="sec"><h3 class="label">Check yourself · answer first, then reveal</h3><div class="checks">${s.checks.map((c, i) => {
      const key = s.id + "_" + i, st = S.checks[key];
      return `<div class="check"><div class="check-q"><span class="n">Q${i + 1}</span><span class="q">${md(c.q)}</span>
        <button class="btn small" data-reveal="${esc(key)}" aria-expanded="false">Reveal</button></div>
        <div class="check-a" id="ans_${esc(key)}" hidden>${md(c.a)}
        <div class="check-self"><button class="btn small ${st === "got" ? "got" : ""}" data-self="${esc(key)}" data-v="got">I knew it</button>
        <button class="btn small ${st === "miss" ? "miss" : ""}" data-self="${esc(key)}" data-v="miss">I missed it</button>
        <button class="btn small" data-askcheck="${i}">Save as question</button></div></div></div>`;
    }).join("")}</div></div>`;
    if (FORMS[s.form]) html += formBlock(FORMS[s.form]);
    if (s.tip) html += `<div class="tip">${md(s.tip)}</div>`;
    const ct = TYPES.find(t => t.k === capType);
    html += `<div class="sec"><h3 class="label">Capture a thought · saved to this step</h3><div class="capture">
      <div class="types" role="radiogroup" aria-label="Entry type">${TYPES.map(t => `<button class="type-btn" role="radio" data-ctype="${t.k}" aria-checked="${capType === t.k}" aria-pressed="${capType === t.k}"><i style="background:${t.c}"></i>${t.name}</button>`).join("")}</div>
      <div class="cap-row"><textarea id="capText" rows="2" placeholder="${esc(ct.ph)}" aria-label="New entry"></textarea><button class="btn primary" id="capAdd">Add</button></div>
      <div class="save-state">Ctrl+Enter or Cmd+Enter adds it.</div></div></div>
      <div class="nav-row">${prev ? `<button class="btn" data-step="${esc(prev.id)}">← ${esc(prev.title)}</button>` : "<span></span>"}
      <button class="btn ${S.done[s.id] ? "on" : "primary"}" id="doneBtn">${S.done[s.id] ? "Done ✓ (undo)" : (next ? "Mark done and go on →" : "Mark done")}</button></div></section>`;
    $("#main").innerHTML = html;
  }

  /* ---- Notebook ---- */
  function chatPrompt(e) {
    const st = stepById(e.step);
    return `I am reading a research article with a reading guide. Please help me.
Answer in short, simple sentences. Use common words. Keep the technical terms. At most 150 words.
If the summary below does not contain the answer, say so and tell me which section of the article to check.

ARTICLE: ${G.paper.title} (${G.paper.venue})
SUMMARY OF THE ARTICLE:
${G.context}

I am on the step "${st.title}" (${PASSES[st.pass].name}).
My ${e.type === "doubt" ? "doubt about a claim" : "question"}:
${e.text}`;
  }
  function renderBook() {
    const counts = { all: S.entries.length };
    TYPES.forEach(t => counts[t.k] = S.entries.filter(e => e.type === t.k).length);
    $("#filters").innerHTML = [["all", "All"], ...TYPES.map(t => [t.k, t.name])].map(([k, n]) =>
      `<button class="btn ${filter === k ? "on" : ""}" data-filter="${k}">${n} <span class="mono">${counts[k]}</span></button>`).join("");
    $("#bookCount").textContent = S.entries.length;
    const list = S.entries.filter(e => filter === "all" || e.type === filter).slice().reverse();
    if (!list.length) { $("#entries").innerHTML = `<div class="empty">${filter === "all" ? "Nothing yet. Use <b>Capture a thought</b> under each step." : "No entries of this type."}</div>`; return; }
    $("#entries").innerHTML = list.map(e => {
      const t = TYPES.find(x => x.k === e.type) || TYPES[0], st = stepById(e.step), ask = e.type === "question" || e.type === "doubt";
      return `<article class="entry ${e.resolved ? "resolved" : ""}" style="--tc:${t.c}">
        <div class="entry-top"><span class="entry-type">${t.name}${e.resolved ? " · resolved" : ""}</span><button class="btn ghost small" data-step="${esc(st.id)}" title="Go to this step">${stepLabel(st)}</button></div>
        <p class="entry-text">${esc(e.text)}</p>
        ${e.answer && editing !== e.id ? `<div class="answer"><span class="label">Answer</span>${esc(e.answer)}</div>` : ""}
        ${editing === e.id ? `<div class="answer-edit"><textarea id="ansEdit" rows="4" placeholder="Paste the chatbot answer, or write what you found in the article.">${esc(e.answer || "")}</textarea>
          <div class="entry-actions"><button class="btn primary" data-saveans="${e.id}">Save answer</button><button class="btn" data-cancelans="1">Cancel</button></div></div>` : ""}
        <div class="entry-actions">
          ${ask ? `<button class="btn" data-copyask="${e.id}" title="Copy a prompt with the article summary and your question">Copy prompt for chatbot</button>` : ""}
          ${ask && editing !== e.id ? `<button class="btn" data-editans="${e.id}">${e.answer ? "Edit answer" : "Add answer"}</button>` : ""}
          <button class="btn" data-resolve="${e.id}">${e.resolved ? "Reopen" : "Resolved"}</button>
          <button class="btn" data-del="${e.id}">Delete</button>
        </div></article>`;
    }).join("");
  }
  function addEntry(type, text, step) {
    text = text.trim(); if (!text) return false;
    S.entries.push({ id: uid(), type, text, step: step || S.cur, ts: Date.now(), resolved: false, answer: "" });
    save(); renderBook(); return true;
  }
  function toMarkdown() {
    const L = [`# Reading notes: ${G.paper.title}`, "", `${G.paper.authors} · ${G.paper.venue}`, ""];
    if (S.purpose) L.push(`**Goal:** ${S.purpose}`);
    if (S.firstQ) L.push(`**Main question:** ${S.firstQ}`);
    L.push(`**Progress:** ${STEPS.filter(s => S.done[s.id]).length}/${STEPS.length} steps`, "");
    Object.values(FORMS).forEach(f => {
      const rows = f.rows.filter(([k]) => (S.forms[k] || "").trim()); if (!rows.length) return;
      L.push(`## ${f.title}`, ""); rows.forEach(([k, l]) => L.push(`**${l}:** ${S.forms[k].trim()}`, ""));
    });
    TYPES.forEach(t => {
      const es = S.entries.filter(e => e.type === t.k); if (!es.length) return;
      L.push(`## ${t.name}`, "");
      es.forEach(e => { L.push(`- ${e.resolved ? "[x]" : "[ ]"} (${stepLabel(stepById(e.step))}) ${e.text.replace(/\n/g, " ")}`); if (e.answer) L.push(`  - Answer: ${e.answer.replace(/\n+/g, " ")}`); });
      L.push("");
    });
    return L.join("\n");
  }

  /* ---- Events ---- */
  const go = id => { S.cur = id; save(); renderRail(); renderMain(); scrollTo({ top: 0 }); document.body.classList.remove("book-open"); };
  document.addEventListener("click", ev => {
    const b = ev.target.closest("button"); if (!b) return;
    const d = b.dataset;
    if (d.step) return go(d.step);
    if (d.term) {
      const def = $("#termDef"), open = b.getAttribute("aria-expanded") === "true";
      document.querySelectorAll(".term").forEach(x => x.setAttribute("aria-expanded", "false"));
      if (open) def.hidden = true; else { b.setAttribute("aria-expanded", "true"); def.hidden = false; def.innerHTML = `<b>${esc(d.term)}.</b> ${esc(G.glossary[d.term] || "")}`; }
      return;
    }
    if (d.reveal) { const a = document.getElementById("ans_" + d.reveal), show = a.hidden; a.hidden = !show; b.textContent = show ? "Hide" : "Reveal"; b.setAttribute("aria-expanded", show); return; }
    if (d.self) { S.checks[d.self] = d.v; save(); b.parentElement.querySelectorAll("[data-self]").forEach(x => x.classList.remove("got", "miss")); b.classList.add(d.v); return; }
    if (d.askcheck !== undefined) { const s = stepById(S.cur); addEntry("question", s.checks[+d.askcheck].q, s.id); toast("Saved to the notebook as a question"); return; }
    if (d.purpose) { S.purpose = d.purpose; save(); document.querySelectorAll("[data-purpose]").forEach(x => { const on = x.dataset.purpose === S.purpose; x.setAttribute("aria-pressed", on); x.setAttribute("aria-checked", on); }); return; }
    if (d.ctype) {
      capType = d.ctype;
      document.querySelectorAll("[data-ctype]").forEach(x => { const on = x.dataset.ctype === capType; x.setAttribute("aria-pressed", on); x.setAttribute("aria-checked", on); });
      $("#capText").placeholder = TYPES.find(t => t.k === capType).ph; $("#capText").focus(); return;
    }
    if (b.id === "capAdd") { const t = $("#capText"); if (addEntry(capType, t.value)) { t.value = ""; toast("Added to the notebook"); } return; }
    if (b.id === "doneBtn") {
      const s = stepById(S.cur), i = STEPS.indexOf(s);
      if (S.done[s.id]) delete S.done[s.id];
      else { S.done[s.id] = true; if (STEPS[i + 1]) S.cur = STEPS[i + 1].id; else toast("You finished the article. Copy your notes from the notebook."); }
      save(); renderRail(); renderMain(); scrollTo({ top: 0 }); return;
    }
    if (d.filter) { filter = d.filter; renderBook(); return; }
    if (d.copyask) { copyText(chatPrompt(S.entries.find(x => x.id === d.copyask)), "Prompt copied. Paste it into a chatbot, then add the answer here."); return; }
    if (d.editans) { editing = d.editans; renderBook(); $("#ansEdit").focus(); return; }
    if (d.cancelans) { editing = null; renderBook(); return; }
    if (d.saveans) { const e = S.entries.find(x => x.id === d.saveans); e.answer = $("#ansEdit").value.trim(); editing = null; save(); renderBook(); return; }
    if (d.resolve) { const e = S.entries.find(x => x.id === d.resolve); e.resolved = !e.resolved; save(); renderBook(); return; }
    if (d.del) {
      if (d.armed) { S.entries = S.entries.filter(x => x.id !== d.del); save(); renderBook(); }
      else { b.dataset.armed = "1"; b.textContent = "Click again to delete"; setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = "Delete"; } }, 3000); }
      return;
    }
    if (b.id === "copyMd") { copyText(toMarkdown(), "Copied. Paste it into your notes app."); return; }
    if (b.id === "exportNotes") { download(`notes-${G.id}.json`, JSON.stringify({ guide: G.id, exported: new Date().toISOString(), state: S }, null, 2)); return; }
    if (b.id === "focusBtn") { const on = document.body.classList.toggle("focus"); b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); lsSet("ar:focus", on); return; }
    if (b.id === "bookBtn") { document.body.classList.add("book-open"); return; }
    if (b.id === "bookClose") { document.body.classList.remove("book-open"); return; }
  });
  $("#scrim").addEventListener("click", () => document.body.classList.remove("book-open"));
  document.addEventListener("input", ev => {
    const t = ev.target;
    if (t.id === "firstQ") { S.firstQ = t.value; save(); }
    else if (t.dataset && t.dataset.form) { S.forms[t.dataset.form] = t.value; save(); }
  });
  document.addEventListener("keydown", ev => {
    if (ev.target.id === "capText" && ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); $("#capAdd").click(); }
    if (ev.key === "Escape") document.body.classList.remove("book-open");
  });
  $("#importNotes").addEventListener("change", ev => {
    const f = ev.target.files[0]; if (!f) return;
    f.text().then(t => {
      let x; try { x = JSON.parse(t); } catch (e) { toast("This file is not valid JSON."); return; }
      if (!x || !x.state || x.guide !== G.id) { toast(`This file has notes for another guide${x && x.guide ? ` ("${x.guide}")` : ""}.`); return; }
      const inn = x.state, have = new Set(S.entries.map(e => e.id));
      (inn.entries || []).forEach(e => { if (e && e.id && !have.has(e.id)) S.entries.push(e); });
      Object.assign(S.done, inn.done || {});
      for (const [k, v] of Object.entries(inn.forms || {})) if (!(S.forms[k] || "").trim()) S.forms[k] = v;
      if (!S.purpose) S.purpose = inn.purpose || ""; if (!S.firstQ) S.firstQ = inn.firstQ || "";
      save(); renderRail(); renderMain(); renderBook(); toast("Notes imported and merged.");
      ev.target.value = "";
    });
  });

  /* ---- Timer ---- */
  const T = { mode: "focus", left: 25 * 60, run: false, h: null };
  const baseTitle = document.title;
  function drawTimer() {
    const m = Math.floor(T.left / 60), s = T.left % 60, txt = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    $("#timerClock").textContent = txt; $("#timerMode").textContent = T.mode === "focus" ? "FOCUS" : "BREAK";
    $("#timer").classList.toggle("break", T.mode === "break"); $("#timerGo").textContent = T.run ? "Pause" : "Start";
    document.title = T.run ? `${txt} · ${baseTitle}` : baseTitle;
  }
  $("#timerGo").addEventListener("click", () => {
    T.run = !T.run;
    if (T.run) T.h = setInterval(() => {
      if (--T.left <= 0) {
        if (T.mode === "focus") { T.mode = "break"; T.left = 5 * 60; toast("Time for a 5-minute break. Stand up and look away from the screen."); }
        else { T.mode = "focus"; T.left = 25 * 60; T.run = false; clearInterval(T.h); toast("Break is over. Start the next 25 minutes when you are ready."); }
      }
      drawTimer();
    }, 1000);
    else clearInterval(T.h);
    drawTimer();
  });
  $("#timerReset").addEventListener("click", () => { clearInterval(T.h); T.run = false; T.mode = "focus"; T.left = 25 * 60; drawTimer(); });

  if (lsGet("ar:focus", false)) { document.body.classList.add("focus"); $("#focusBtn").classList.add("on"); $("#focusBtn").setAttribute("aria-pressed", "true"); }
  renderRail(); renderMain(); renderBook(); drawTimer();
}
