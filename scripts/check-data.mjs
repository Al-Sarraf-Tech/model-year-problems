#!/usr/bin/env node
// Pre-build gate: every model-year in vehicles.yaml has a cached NHTSA file with
// source URLs, titles and a checked date, and the cached rows match NHTSA's count.
import fs from "node:fs";
import path from "node:path";
import * as yaml from "js-yaml";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const cfg = yaml.load(fs.readFileSync(path.join(ROOT, "vehicles.yaml"), "utf8"), { schema: yaml.CORE_SCHEMA });
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const errors = [];
let n = 0;
for (const m of cfg.models) {
  for (let y = Number(cfg.years[0]); y <= Number(cfg.years[1]); y++) {
    const f = path.join(ROOT, "data/nhtsa", `${slug(m.make)}-${slug(m.model)}-${y}.json`);
    if (!fs.existsSync(f)) { errors.push(`missing cache ${path.relative(ROOT, f)} (run: npm run fetch -- ${slug(m.make)}-${slug(m.model)}-${y})`); continue; }
    const d = JSON.parse(fs.readFileSync(f, "utf8"));
    n++;
    for (const k of ["complaints_source_url", "complaints_source_title", "recalls_source_url", "recalls_source_title", "checked"]) if (!d[k]) errors.push(`${path.basename(f)}: no ${k}`);
    if (!/^https:\/\/api\.nhtsa\.gov\//.test(d.complaints_source_url || "") || !/^https:\/\/api\.nhtsa\.gov\//.test(d.recalls_source_url || "")) errors.push(`${path.basename(f)}: source is not api.nhtsa.gov`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.checked || "")) errors.push(`${path.basename(f)}: checked is not YYYY-MM-DD`);
    if (d.complaints.length !== d.complaints_reported_count) errors.push(`${path.basename(f)}: ${d.complaints.length} complaint rows but NHTSA reported ${d.complaints_reported_count}`);
    if (d.recalls.length !== d.recalls_reported_count) errors.push(`${path.basename(f)}: ${d.recalls.length} recall rows but NHTSA reported ${d.recalls_reported_count}`);
    for (const r of d.recalls) if (!r.campaign) errors.push(`${path.basename(f)}: recall without campaign number`);
  }
}
if (errors.length) { console.error(`✗ Data check failed:\n  - ${errors.join("\n  - ")}`); process.exit(1); }
console.log(`✓ Data check passed: ${n} model-years cached, every one with NHTSA source URLs and a checked date.`);
