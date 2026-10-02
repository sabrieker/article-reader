// Checks a reading guide object. Used by the web page and by tools/validate.mjs.
// Returns a list of error strings. An empty list means the guide is valid.

export const FORMS = ["purpose", "fiveCs", "rebuild", "summary"];
const ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

export function validateGuide(g) {
  const errs = [];
  const err = (path, msg) => errs.push(`${path}: ${msg}`);
  const isObj = v => v && typeof v === "object" && !Array.isArray(v);
  const str = (v, path, { min = 1, max = 4000, optional = false } = {}) => {
    if (v === undefined && optional) return;
    if (typeof v !== "string") return err(path, "must be a string");
    if (v.trim().length < min) err(path, `must have at least ${min} character(s)`);
    if (v.length > max) err(path, `must be at most ${max} characters (has ${v.length})`);
  };
  const url = (v, path) => {
    str(v, path, { max: 500 });
    if (typeof v === "string" && !/^https:\/\//.test(v)) err(path, "must start with https://");
  };

  if (!isObj(g)) return ["guide: must be a JSON object"];
  if (g.schemaVersion !== 1) err("schemaVersion", "must be 1");
  if (typeof g.id !== "string" || !ID_RE.test(g.id)) err("id", "must be lowercase letters, digits and dashes (example: codemidas)");

  if (!isObj(g.paper)) err("paper", "must be an object");
  else {
    str(g.paper.title, "paper.title", { max: 300 });
    str(g.paper.authors, "paper.authors", { max: 300 });
    str(g.paper.venue, "paper.venue", { max: 200 });
    str(g.paper.date, "paper.date", { max: 40, optional: true });
    if (!Array.isArray(g.paper.links) || !g.paper.links.length) err("paper.links", "must be a non-empty list");
    else g.paper.links.forEach((l, i) => {
      if (!isObj(l)) return err(`paper.links[${i}]`, "must be an object");
      str(l.label, `paper.links[${i}].label`, { max: 40 });
      url(l.url, `paper.links[${i}].url`);
    });
  }
  str(g.summary, "summary", { max: 600 });
  str(g.context, "context", { min: 200, max: 14000 });

  if (!isObj(g.glossary)) err("glossary", "must be an object of term: definition");
  else for (const [k, v] of Object.entries(g.glossary)) str(v, `glossary["${k}"]`, { max: 600 });

  if (!Array.isArray(g.steps)) err("steps", "must be a list");
  else {
    if (g.steps.length < 4 || g.steps.length > 30) err("steps", "must have 4 to 30 steps");
    const ids = new Set();
    let lastPass = 0;
    g.steps.forEach((s, i) => {
      const p = `steps[${i}]`;
      if (!isObj(s)) return err(p, "must be an object");
      if (typeof s.id !== "string" || !ID_RE.test(s.id)) err(`${p}.id`, "must be lowercase letters, digits and dashes");
      else if (ids.has(s.id)) err(`${p}.id`, `duplicate id "${s.id}"`);
      else ids.add(s.id);
      if (![0, 1, 2, 3].includes(s.pass)) err(`${p}.pass`, "must be 0, 1, 2 or 3");
      else { if (s.pass < lastPass) err(`${p}.pass`, "steps must be in pass order"); lastPass = s.pass; }
      str(s.title, `${p}.title`, { max: 90 });
      if (!Number.isInteger(s.minutes) || s.minutes < 1 || s.minutes > 120) err(`${p}.minutes`, "must be a whole number from 1 to 120");
      str(s.read, `${p}.read`, { max: 600 });
      str(s.goal, `${p}.goal`, { max: 400 });
      str(s.tip, `${p}.tip`, { max: 500, optional: true });
      if (!Array.isArray(s.focus) || !s.focus.length) err(`${p}.focus`, "must be a non-empty list of strings");
      else s.focus.forEach((f, j) => str(f, `${p}.focus[${j}]`, { max: 500 }));
      if (s.terms !== undefined) {
        if (!Array.isArray(s.terms)) err(`${p}.terms`, "must be a list");
        else s.terms.forEach(t => { if (!isObj(g.glossary) || !(t in g.glossary)) err(`${p}.terms`, `"${t}" is not in the glossary`); });
      }
      if (s.checks !== undefined) {
        if (!Array.isArray(s.checks)) err(`${p}.checks`, "must be a list");
        else s.checks.forEach((c, j) => {
          if (!isObj(c)) return err(`${p}.checks[${j}]`, "must be an object with q and a");
          str(c.q, `${p}.checks[${j}].q`, { max: 400 });
          str(c.a, `${p}.checks[${j}].a`, { max: 800 });
        });
      }
      if (s.form !== undefined && !FORMS.includes(s.form)) err(`${p}.form`, `must be one of ${FORMS.join(", ")}`);
      if (s.diagram !== undefined) {
        const d = s.diagram;
        if (!isObj(d) || !Array.isArray(d.boxes) || d.boxes.length < 2 || d.boxes.length > 6) err(`${p}.diagram`, "must have 2 to 6 boxes");
        else {
          d.boxes.forEach((b, j) => { str(b && b.title, `${p}.diagram.boxes[${j}].title`, { max: 28 }); str(b && b.sub, `${p}.diagram.boxes[${j}].sub`, { max: 32, optional: true }); });
          str(d.caption, `${p}.diagram.caption`, { max: 160, optional: true });
        }
      }
    });
    const nSummary = g.steps.filter(s => s && s.form === "summary").length;
    if (nSummary !== 1) err("steps", `exactly one step must have form "summary" (found ${nSummary})`);
  }
  return errs;
}
