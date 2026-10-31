// Turns the committed NHTSA cache (data/nhtsa/*.json) into the objects the templates use.
// Every number on the site is computed here from that cache; nothing is typed in by hand.
import fs from "node:fs";
import path from "node:path";
import * as yaml from "js-yaml";
import { splitComponents, prettyComponent, COMPONENT_NOTES } from "./components.js";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
export const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const median = (xs) => { const a = [...xs].sort((x, y) => x - y); if (!a.length) return 0; const m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : Math.round((a[m - 1] + a[m]) / 2); };
const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
const pctLabel = (n, d) => { const v = d ? (n / d) * 100 : 0; return n > 0 && v < 1 ? "<1" : String(Math.round(v)); };
const ordinal = (n) => { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const fmt = (n) => Number(n).toLocaleString("en-US");
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
export const prettyDate = (iso) => { if (!iso) return ""; const [y, m, d] = String(iso).split("-").map(Number); return `${MONTHS[m - 1]} ${d}, ${y}`; };

function summarize(rec) {
  const rows = rec.complaints.map((r) => Object.fromEntries(rec.complaints_fields.map((f, i) => [f, r[i]])));
  const comp = new Map();
  let crash = 0, fire = 0, injuries = 0, deaths = 0, withInjury = 0;
  const byYear = new Map();
  for (const r of rows) {
    for (const c of splitComponents(r.components_raw)) comp.set(c, (comp.get(c) || 0) + 1);
    if (r.crash) crash++;
    if (r.fire) fire++;
    injuries += r.injuries; deaths += r.deaths; if (r.injuries > 0) withInjury++;
    const y = r.date_filed ? r.date_filed.slice(0, 4) : "unknown";
    byYear.set(y, (byYear.get(y) || 0) + 1);
  }
  const total = rows.length;
  const components = [...comp.entries()]
    .map(([name, count]) => ({ name, label: prettyComponent(name), count, share: pctLabel(count, total), note: COMPONENT_NOTES[name] || "" }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  const filedByYear = [...byYear.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([year, count]) => ({ year, count }));
  const recalls = [...rec.recalls].sort((a, b) => String(b.received).localeCompare(String(a.received)));
  const recallComponents = new Map();
  for (const r of recalls) { const top = String(r.component || "").split(":")[0]; recallComponents.set(top, (recallComponents.get(top) || 0) + 1); }
  const named = components.filter((c) => c.name !== "UNKNOWN OR OTHER");
  return {
    named, total, crash, fire, injuries, deaths, withInjury, components, filedByYear, recalls,
    recallComponents: [...recallComponents.entries()].map(([name, count]) => ({ name, label: prettyComponent(name), count })).sort((a, b) => b.count - a.count),
    parkIt: recalls.filter((r) => r.park_it || r.park_outside),
    firstFiled: rows.map((r) => r.date_filed).filter(Boolean).sort()[0] || null,
    lastFiled: rows.map((r) => r.date_filed).filter(Boolean).sort().at(-1) || null,
  };
}

let cache;
export function loadAll() {
  if (cache) return cache;
  const cfg = yaml.load(fs.readFileSync(path.join(ROOT, "vehicles.yaml"), "utf8"), { schema: yaml.CORE_SCHEMA });
  const dir = path.join(ROOT, "data/nhtsa");
  const models = [];
  for (const m of cfg.models) {
    const makeSlug = slug(m.make), modelSlug = slug(m.model);
    const years = [];
    for (let y = Number(cfg.years[0]); y <= Number(cfg.years[1]); y++) {
      const f = path.join(dir, `${makeSlug}-${modelSlug}-${y}.json`);
      if (!fs.existsSync(f)) continue;
      const rec = JSON.parse(fs.readFileSync(f, "utf8"));
      years.push({ year: y, rec, s: summarize(rec) });
    }
    // Flag years whose complaint count looks like a gap in NHTSA's API rather than a
    // quiet year: zero complaints while NHTSA still lists recalls for that year, or
    // fewer than 10% of the smaller neighbouring year when both neighbours have >100.
    // Flagged years are shown with a warning and never ranked or given a page.
    for (const [i, y] of years.entries()) {
      const prev = years[i - 1], next = years[i + 1];
      y.noRecords = y.s.total === 0 && y.s.recalls.length === 0;
      y.suspectGap = (y.s.total === 0 && y.s.recalls.length > 0) ||
        (!!prev && !!next && prev.s.total > 100 && next.s.total > 100 && y.s.total < 0.1 * Math.min(prev.s.total, next.s.total));
    }
    const rankable = years.filter((y) => !y.noRecords && !y.suspectGap).sort((a, b) => b.s.total - a.s.total);
    rankable.forEach((y, i) => { y.rank = i + 1; y.rankOf = rankable.length; });
    const firstY = years.find((y) => !y.noRecords)?.year, lastY = [...years].reverse().find((y) => !y.noRecords)?.year;
    models.push({
      make: m.make, model: m.model, makeSlug, modelSlug, name: `${m.make} ${m.model}`,
      url: `/${makeSlug}/${modelSlug}/`, years, rankable, firstYear: firstY, lastYear: lastY,
      range: `${cfg.years[0]}–${cfg.years[1]}`,
      totalComplaints: years.reduce((a, y) => a + y.s.total, 0),
      totalRecalls: new Set(years.flatMap((y) => y.s.recalls.map((r) => r.campaign))).size,
      medianComplaints: median(rankable.map((y) => y.s.total)),
      checked: years.map((y) => y.rec.checked).sort().at(-1),
    });
  }
  // Featured model-years get their own page: the most-complained-about year of every
  // model, then the next-highest years overall until `featured_count` is reached.
  const featuredCount = Number(cfg.featured_count || 30);
  const featured = new Set();
  for (const m of models) if (m.rankable[0]) featured.add(m.rankable[0]);
  const seconds = models.flatMap((m) => m.rankable.slice(1, 3)).sort((a, b) => b.s.total - a.s.total);
  for (const y of seconds) { if (featured.size >= featuredCount) break; featured.add(y); }
  for (const extra of cfg.extra_pages || []) {
    const m = models.find((x) => `${x.makeSlug}/${x.modelSlug}` === extra.split("/").slice(0, 2).join("/"));
    const y = m?.years.find((v) => String(v.year) === extra.split("/")[2]);
    if (y && !y.noRecords) featured.add(y);
  }

  const modelYears = [];
  for (const m of models) {
    for (const y of m.years) {
      y.featured = featured.has(y);
      if (!y.featured) continue;
      const s = y.s, top = s.named.slice(0, 3);
      const name = `${y.year} ${m.make} ${m.model}`;
      const lines = [];
      lines.push(`NHTSA's public complaint database lists ${fmt(s.total)} owner complaints for the ${name}, and its recall database lists ${s.recalls.length} safety recall campaign${s.recalls.length === 1 ? "" : "s"} for it.`);
      if (top.length) lines.push(`Leaving out "unknown or other", the component group owners named most often is ${top[0].label.toLowerCase()} (${fmt(top[0].count)} complaints, ${top[0].share}%)${top[1] ? `, followed by ${top[1].label.toLowerCase()} (${fmt(top[1].count)})` : ""}${top[2] ? ` and ${top[2].label.toLowerCase()} (${fmt(top[2].count)})` : ""}. A complaint can name more than one group, so the shares add up to more than 100%.`);
      lines.push(`${fmt(s.crash)} complaint${s.crash === 1 ? "" : "s"} say a crash happened and ${fmt(s.fire)} mention a fire; together the complaints report ${fmt(s.injuries)} injur${s.injuries === 1 ? "y" : "ies"} and ${fmt(s.deaths)} death${s.deaths === 1 ? "" : "s"}.`);
      if (y.rank) lines.push(`Among ${m.make} ${m.model} model years ${m.range} in NHTSA's data, ${y.year} has the ${y.rank === 1 ? "most" : `${ordinal(y.rank)}-most`} complaints (${fmt(s.total)}, against a median of ${fmt(median(m.rankable.filter((o) => o !== y).map((o) => o.s.total)))} for the other years).`);
      if (s.recalls[0]) lines.push(`The newest recall is ${s.recalls[0].campaign}, received ${prettyDate(s.recalls[0].received)}, for ${prettyComponent(String(s.recalls[0].component).split(":")[0]).toLowerCase()}.`);
      if (s.parkIt.length) lines.push(`${s.parkIt.length} of these recalls carry a "park it" or "park outside" warning from NHTSA; see the recall table.`);
      const faqs = [
        { q: `How many complaints has NHTSA received about the ${name}?`, a: `${fmt(s.total)} owner complaints as of ${prettyDate(y.rec.checked)}, per NHTSA's complaints API.` },
        { q: `What is the most common problem reported for the ${name}?`, a: top[0] ? `${top[0].label} is named in ${fmt(top[0].count)} of ${fmt(s.total)} complaints (${top[0].share}%)${top[0].note ? `; NHTSA's group covers ${top[0].note}` : ""}.` : "NHTSA lists no complaints for it." },
        { q: `How many recalls does the ${name} have?`, a: `${s.recalls.length} recall campaign${s.recalls.length === 1 ? "" : "s"} in NHTSA's recall database${s.recalls[0] ? `, most recently ${s.recalls[0].campaign} (${prettyDate(s.recalls[0].received)})` : ""}. Check a specific car's open recalls by VIN at nhtsa.gov/recalls.` },
      ];
      if (y.rank) faqs.push({ q: `Is ${y.year} a bad year for the ${m.make} ${m.model}?`, a: `By complaint count, ${y.year} ranks ${ordinal(y.rank)} of ${y.rankOf} ${m.model} model years ${m.range} in NHTSA's data. Raw counts are not adjusted for how many cars were sold or how old they are.` });
      modelYears.push({
        ...y, m, name, url: `/${m.makeSlug}/${m.modelSlug}/${y.year}/`, summary: lines, faqs,
        description: `${name}: ${fmt(s.total)} NHTSA owner complaints${top[0] ? ` (top: ${top[0].label.toLowerCase()})` : ""} and ${s.recalls.length} recall${s.recalls.length === 1 ? "" : "s"}, by component, with campaign numbers. Data checked ${prettyDate(y.rec.checked)}.`,
        neighbours: m.years.filter((o) => o.featured && o !== y).map((o) => o.year),
      });
    }
  }
  const makes = [...new Set(models.map((m) => m.make))].map((make) => {
    const ms = models.filter((m) => m.make === make);
    return { make, slug: slug(make), url: `/${slug(make)}/`, models: ms, totalComplaints: ms.reduce((a, m) => a + m.totalComplaints, 0), checked: ms.map((m) => m.checked).sort().at(-1) };
  });
  const checked = models.map((m) => m.checked).sort().at(-1);
  cache = { models, makes, modelYears, checked };
  return cache;
}
