#!/usr/bin/env node
// Fetches NHTSA complaints + recalls for every model-year in vehicles.yaml and writes
// a lean cache to data/nhtsa/<make>-<model>-<year>.json (committed to the repo).
// The site build reads only this cache, so builds are reproducible and never hit the API.
//
//   node scripts/fetch-nhtsa.mjs                 # everything in vehicles.yaml
//   node scripts/fetch-nhtsa.mjs honda-accord     # one model, all years
//   node scripts/fetch-nhtsa.mjs honda-accord-2014
//
// Complaint narratives are NOT stored or published: owner reports can contain personal
// details, and the site only publishes counts. Recall records are stored in full
// (they are short NHTSA notices about the vehicle, not about people).
import fs from "node:fs";
import path from "node:path";
import * as yaml from "js-yaml";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "data/nhtsa");
const cfg = yaml.load(fs.readFileSync(path.join(ROOT, "vehicles.yaml"), "utf8"), { schema: yaml.CORE_SCHEMA });
const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const filter = process.argv[2] ? slug(process.argv[2]) : null;
const jobs = [];
for (const m of cfg.models) {
  for (let y = cfg.years[0]; y <= cfg.years[1]; y++) {
    const key = `${slug(m.make)}-${slug(m.model)}-${y}`;
    if (filter && !(key === filter || key.startsWith(filter + "-"))) continue;
    jobs.push({ ...m, year: y, key });
  }
}

async function getJson(url) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "ModelYearProblems/1.0 (+https://modelyearproblems.com/about/)" } });
      if (res.status === 400 || res.status === 404) return null; // NHTSA answers 400 when it has no records
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (attempt === 4) throw new Error(`${url}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
}

const isoFromNhtsa = (s, order) => {
  // complaints use MM/DD/YYYY, recalls use DD/MM/YYYY
  if (!s) return null;
  const [a, b, y] = s.split("/");
  const [mm, dd] = order === "mdy" ? [a, b] : [b, a];
  return `${y}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
};

async function run(job) {
  const q = `make=${encodeURIComponent(job.nhtsa_make)}&model=${encodeURIComponent(job.nhtsa_model)}&modelYear=${job.year}`;
  const complaintsUrl = `https://api.nhtsa.gov/complaints/complaintsByVehicle?${q}`;
  const recallsUrl = `https://api.nhtsa.gov/recalls/recallsByVehicle?${q}`;
  const [c, r] = await Promise.all([getJson(complaintsUrl), getJson(recallsUrl)]);
  // Compact rows (see complaints_fields) keep the committed cache small.
  const complaints = (c?.results || []).map((x) => [
    x.odiNumber,
    isoFromNhtsa(x.dateComplaintFiled, "mdy"),
    String(x.components || ""),
    x.crash ? 1 : 0,
    x.fire ? 1 : 0,
    Number(x.numberOfInjuries || 0),
    Number(x.numberOfDeaths || 0),
  ]);
  const recalls = (r?.results || []).map((x) => ({
    campaign: x.NHTSACampaignNumber,
    received: isoFromNhtsa(x.ReportReceivedDate, "dmy"),
    manufacturer: x.Manufacturer,
    component: x.Component,
    summary: x.Summary,
    consequence: x.Consequence,
    remedy: x.Remedy,
    park_it: !!x.parkIt,
    park_outside: !!x.parkOutSide,
    over_the_air: !!x.overTheAirUpdate,
  }));
  const out = {
    make: job.make,
    model: job.model,
    year: job.year,
    nhtsa_make: job.nhtsa_make,
    nhtsa_model: job.nhtsa_model,
    checked: today,
    complaints_source_url: complaintsUrl,
    complaints_source_title: "NHTSA Complaints API (complaintsByVehicle)",
    complaints_reported_count: c?.count ?? 0,
    recalls_source_url: recallsUrl,
    recalls_source_title: "NHTSA Recalls API (recallsByVehicle)",
    recalls_reported_count: r?.Count ?? 0,
    complaints_fields: ["odi_number", "date_filed", "components_raw", "crash", "fire", "injuries", "deaths"],
    complaints,
    recalls,
  };
  fs.writeFileSync(path.join(OUT, `${job.key}.json`), JSON.stringify(out) + "\n");
  return `${job.key}: ${complaints.length} complaints (API count ${out.complaints_reported_count}), ${recalls.length} recalls`;
}

fs.mkdirSync(OUT, { recursive: true });
let i = 0, failed = 0;
async function worker() {
  while (i < jobs.length) {
    const job = jobs[i++];
    try { console.log(await run(job)); } catch (e) { failed++; console.error(`✗ ${job.key}: ${e.message}`); }
    await new Promise((r) => setTimeout(r, 250));
  }
}
await Promise.all([worker(), worker(), worker()]);
console.log(`Done: ${jobs.length - failed}/${jobs.length} model-years fetched on ${today}.`);
if (failed) process.exit(1);
