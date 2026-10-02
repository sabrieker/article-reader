#!/usr/bin/env node
// Usage: node tools/validate.mjs guides/<id>.json [more files...]
// With no arguments, checks every guide listed in guides/index.json.
import { readFileSync } from "node:fs";
import { validateGuide } from "../js/guide-validate.js";

const root = new URL("..", import.meta.url);
let files = process.argv.slice(2);
let index = null;
try { index = JSON.parse(readFileSync(new URL("guides/index.json", root), "utf8")); }
catch (e) { console.error("guides/index.json: " + e.message); process.exit(1); }
if (!files.length) files = index.guides.map(g => `guides/${g.id}.json`);

let bad = 0;
for (const f of files) {
  let g;
  try { g = JSON.parse(readFileSync(f, "utf8")); }
  catch (e) { console.error(`FAIL ${f}\n  not valid JSON: ${e.message}`); bad++; continue; }
  const errs = validateGuide(g);
  const listed = index.guides.find(x => x.id === g.id);
  if (!listed) errs.push(`id "${g.id}" is not listed in guides/index.json`);
  if (!f.endsWith(`/${g.id}.json`) && f !== `${g.id}.json`) errs.push(`file name must be ${g.id}.json`);
  if (errs.length) { console.error(`FAIL ${f}\n  ` + errs.join("\n  ")); bad++; }
  else console.log(`OK   ${f} (${g.steps.length} steps, ${Object.keys(g.glossary).length} terms)`);
}
process.exit(bad ? 1 : 0);
