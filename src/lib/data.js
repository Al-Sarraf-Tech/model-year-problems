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
const listEnglish = (items) => {
  const a = items.map(String);
  if (a.length <= 1) return a[0] || "";
  if (a.length === 2) return `${a[0]} and ${a[1]}`;
  return `${a.slice(0, -1).join(", ")}, and ${a.at(-1)}`;
};
const yearSpan = (years) => {
  const ys = [...new Set(years)].sort((a, b) => a - b);
  if (!ys.length) return "";
  const groups = [];
  let start = ys[0], prev = ys[0];
  for (const y of ys.slice(1)) {
    if (y === prev + 1) { prev = y; continue; }
    groups.push(start === prev ? String(start) : `${start}–${prev}`);
    start = prev = y;
  }
  groups.push(start === prev ? String(start) : `${start}–${prev}`);
  return listEnglish(groups);
};
const recallTop = (r) => String(r.component || "").split(":")[0].trim().toUpperCase();

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
      const checked = prettyDate(y.rec.checked);
      const lines = [];
      if (top.length) lines.push(`Owners most often name ${top[0].label.toLowerCase()} in complaints about the ${name}: ${fmt(top[0].count)} of ${fmt(s.total)} (${top[0].share}%).${top[1] ? ` Next is ${top[1].label.toLowerCase()} (${fmt(top[1].count)})` : ""}${top[2] ? `, then ${top[2].label.toLowerCase()} (${fmt(top[2].count)})` : ""}.`);
      else lines.push(`NHTSA's complaints API lists ${fmt(s.total)} owner complaints for the ${name}.`);
      lines.push(`Checked ${checked} on NHTSA's complaints API (complaintsByVehicle) and recalls API (recallsByVehicle): ${fmt(s.total)} owner complaints and ${s.recalls.length} recall campaign${s.recalls.length === 1 ? "" : "s"}.`);
      lines.push(`Complaints are unverified allegations, not NHTSA findings, and not a reliability or safety ranking. Counts are not adjusted for how many vehicles were sold or how long they have been on the road. A complaint can name more than one component, so the shares can pass 100%. ${fmt(s.crash)} ${s.crash === 1 ? "complaint reports" : "complaints report"} a crash and ${fmt(s.fire)} ${s.fire === 1 ? "complaint reports" : "complaints report"} a fire. Together the complaints report ${fmt(s.injuries)} ${s.injuries === 1 ? "injury" : "injuries"} and ${fmt(s.deaths)} ${s.deaths === 1 ? "death" : "deaths"}, which is what owners wrote down.`);
      if (y.rank) lines.push(`By raw complaint count, ${y.year} is ${y.rank === 1 ? "the highest" : `the ${ordinal(y.rank)}-highest`} of ${y.rankOf} ${m.model} model years in ${m.range} with usable counts (median of the other years: ${fmt(median(m.rankable.filter((o) => o !== y).map((o) => o.s.total)))}). Years flagged as API gaps are not in that comparison.`);
      if (s.recalls[0]) lines.push(`The newest recall is campaign ${s.recalls[0].campaign}, received ${prettyDate(s.recalls[0].received)}, component ${prettyComponent(recallTop(s.recalls[0])).toLowerCase()}. A recall applies only to the vehicles named in its notice, which can be some cars of this model year rather than all of them. The complaint total is not the number of vehicles affected. Check a specific car by VIN at nhtsa.gov/recalls.`);
      else lines.push(`The recalls API lists no campaign for this model year as of ${checked}. A campaign can be opened later, so VIN status still has to be checked at nhtsa.gov/recalls.`);
      if (s.parkIt.length) lines.push(`${s.parkIt.length} of these recalls ${s.parkIt.length === 1 ? "carries" : "carry"} a "park it" or "park outside" warning from NHTSA; see the recall list.`);
      const faqs = [
        { q: `How many complaints has NHTSA received about the ${name}?`, a: `${fmt(s.total)} owner complaints, from the complaintsByVehicle API, checked ${checked}. These are unverified allegations, not a reliability or safety ranking.` },
        { q: `What component do owners name most often for the ${name}?`, a: top[0] ? `${top[0].label}, in ${fmt(top[0].count)} of ${fmt(s.total)} complaints (${top[0].share}%).${top[0].note ? ` On this site that NHTSA group is described as ${top[0].note}.` : ""} The label is the owner's choice, not a confirmed diagnosis.` : "NHTSA lists no complaints for it." },
        { q: `How many recalls does the ${name} have?`, a: `${s.recalls.length} recall campaign${s.recalls.length === 1 ? "" : "s"} in the recallsByVehicle API${s.recalls[0] ? `, most recently ${s.recalls[0].campaign} (${prettyDate(s.recalls[0].received)})` : ""}. A campaign covers only the vehicles its notice names, not every ${name}. Open recall status for a specific car has to be checked by VIN at nhtsa.gov/recalls.` },
      ];
      if (top.length) faqs.push({ q: `What are the most common problems with the ${name}?`, a: `Owners most often name ${top.map((c) => `${c.label.toLowerCase()} (${fmt(c.count)})`).join(", ")} in the ${fmt(s.total)} NHTSA complaints on file, checked ${checked}. A complaint can name more than one component, so the counts overlap. They are owners' unverified allegations, not diagnoses or confirmed defects.` });
      if (top[0]) {
        const sameGroup = s.recalls.filter((r) => recallTop(r) === top[0].name);
        faqs.push({ q: `Does the ${name} have a recall for ${top[0].label.toLowerCase()}?`, a: sameGroup.length ? `NHTSA's recallsByVehicle API returned ${sameGroup.length} campaign${sameGroup.length === 1 ? "" : "s"} filed under ${top[0].label.toLowerCase()} for this model year: ${sameGroup.map((r) => r.campaign).join(", ")}. A campaign covers only the vehicles its notice names, so a specific car has to be checked by VIN at nhtsa.gov/recalls.` : `The recallsByVehicle API returned no campaign filed under the same NHTSA component group (${top[0].label.toLowerCase()}) for this model year as of ${checked}, even though owners name it most often. Recalls for a related defect can be filed under a different group, so that is not proof that none exists. Check a specific car by VIN at nhtsa.gov/recalls.` });
      }
      if (s.recalls.length) faqs.push({ q: `Which NHTSA recall campaigns are listed for the ${name}?`, a: `${s.recalls.length} campaign${s.recalls.length === 1 ? "" : "s"}, newest first: ${s.recalls.slice(0, 10).map((r) => `${r.campaign} (${prettyComponent(recallTop(r)).toLowerCase()})`).join(", ")}${s.recalls.length > 10 ? `, and ${s.recalls.length - 10} more` : ""}. NHTSA's own summary, risk and remedy for each are further down this page. A recall applies only to the vehicles named in its notice.` });
      faqs.push({ q: `Is the ${name} reliable?`, a: `NHTSA does not rate reliability, and this site does not either. The ${fmt(s.total)} complaints are unverified owner allegations that are not adjusted for how many cars were sold or how old they are, so the count cannot rank this car against another. Use the VIN recall check and an independent inspection of the specific car.` });
      if (y.rank) faqs.push({ q: `How does the ${y.year} ${m.model} complaint count compare with other years?`, a: `It is the ${y.rank === 1 ? "highest" : `${ordinal(y.rank)}-highest`} raw complaint count among ${y.rankOf} ${m.model} model years in ${m.range} with usable counts. Years flagged as API gaps are left out. The comparison is not adjusted for sales or vehicle age, and it is not a reliability or safety ranking.` });
      modelYears.push({
        ...y, m, name, url: `/${m.makeSlug}/${m.modelSlug}/${y.year}/`, summary: lines, faqs,
        description: `${name}: owners most often name ${top[0] ? top[0].label.toLowerCase() : "no component"} (${top[0] ? `${fmt(top[0].count)} of ` : ""}${fmt(s.total)} NHTSA complaints). ${s.recalls.length} recall${s.recalls.length === 1 ? "" : "s"}. Allegations, not a ranking. Checked ${checked}.`,
        neighbours: m.years.filter((o) => o.featured && o !== y).map((o) => o.year),
      });
    }
  }
  const topics = [];
  for (const m of models) m.topics = [];
  for (const spec of cfg.component_topics || []) {
    const m = models.find((x) => x.make === spec.make && x.model === spec.model);
    if (!m) continue;
    const label = prettyComponent(spec.component);
    const labelLower = label.toLowerCase();
    const years = m.years.map((y) => {
      const comp = y.s.components.find((c) => c.name === spec.component) || {
        name: spec.component, label, count: 0, share: y.s.total ? "0" : "0", note: COMPONENT_NOTES[spec.component] || "",
      };
      const matchingRecalls = y.s.recalls.filter((r) => recallTop(r) === spec.component);
      return { year: y.year, featured: y.featured, noRecords: y.noRecords, suspectGap: y.suspectGap, rec: y.rec, s: y.s, comp, matchingRecalls };
    });
    const usable = years.filter((y) => !y.noRecords && !y.suspectGap);
    const topYears = usable.filter((y) => y.s.named[0]?.name === spec.component);
    const complaintNaming = usable.reduce((a, y) => a + y.comp.count, 0);
    const totalComplaints = usable.reduce((a, y) => a + y.s.total, 0);
    const highest = [...usable].sort((a, b) => b.comp.count - a.comp.count || a.year - b.year)[0] || null;
    const topWithoutRecall = topYears.filter((y) => y.matchingRecalls.length === 0);
    const topWithRecall = topYears.filter((y) => y.matchingRecalls.length > 0);
    const recallMap = new Map();
    for (const y of years) {
      for (const r of y.matchingRecalls) {
        if (!recallMap.has(r.campaign)) recallMap.set(r.campaign, { ...r, years: [] });
        const row = recallMap.get(r.campaign);
        if (!row.years.includes(y.year)) row.years.push(y.year);
      }
    }
    const recalls = [...recallMap.values()].sort((a, b) => String(b.received).localeCompare(String(a.received)) || String(a.campaign).localeCompare(String(b.campaign)));
    for (const r of recalls) {
    r.years.sort((a, b) => a - b);
    const vehicles = r.campaign_vehicles || [];
    r.sameModelCampaign = vehicles.length > 0 && !r.campaign_vehicles_truncated && r.campaign_vehicle_count === vehicles.length &&
      vehicles.every((v) => String(v.make).toUpperCase() === m.make.toUpperCase() && String(v.model).toUpperCase() === m.model.toUpperCase());
  }
    const checkedDates = [...new Set(years.map((y) => y.rec.checked).filter(Boolean))].sort();
    const checked = checkedDates.at(-1);
    const checkedOldest = checkedDates[0];
    const name = m.name;
    const note = COMPONENT_NOTES[spec.component] || "";
    const lines = [];
    if (topYears.length) lines.push(`${label} is the component group owners named most often for the ${name} in ${yearSpan(topYears.map((y) => y.year))}.`);
    else lines.push(`${label} is not the most-named component group for any ${name} model year in this cache.`);
    lines.push(`Across ${name} model years ${m.range} that have complaint records, the complaints API lists ${fmt(complaintNaming)} complaints naming ${labelLower}, out of ${fmt(totalComplaints)} complaints (${pctLabel(complaintNaming, totalComplaints)}%). Checked ${prettyDate(checked)}${checkedOldest !== checked ? ` (oldest file in this set: ${prettyDate(checkedOldest)})` : ""}.`);
    if (note) lines.push(`On this site, NHTSA's ${labelLower} label is described as ${note}. The person filing picks the group, and a complaint can name more than one. The label is not a confirmed diagnosis.`);
    lines.push(`Complaint counts are unverified allegations. They are not a reliability or safety ranking, and they are not adjusted for how many vehicles were sold or how old they are.`);
    if (highest?.comp.count) lines.push(`The highest ${labelLower} count is the ${highest.year} ${name}: ${fmt(highest.comp.count)} of ${fmt(highest.s.total)} complaints that year (${highest.comp.share}%). That is a raw count.`);
    lines.push(`Separately, the recalls API returned ${recalls.length} campaign${recalls.length === 1 ? "" : "s"} whose component is ${labelLower}. The notice text names the vehicles a campaign covers. That list is not the same thing as the complaint count.`);
    if (topWithoutRecall.length) lines.push(`${listEnglish(topWithoutRecall.map((y) => y.year))} ${topWithoutRecall.length === 1 ? "is a model year" : "are model years"} where owners named ${labelLower} most often and the recalls API returned no ${labelLower} campaign.`);
    if (topWithRecall.length) lines.push(`${listEnglish(topWithRecall.map((y) => y.year))} ${topWithRecall.length === 1 ? "has" : "have"} both: ${labelLower} is the most-named group, and at least one ${labelLower} campaign was returned. A returned campaign still may not include every car of that model year.`);
    lines.push(`Where NHTSA publishes a potential number of units affected, that figure is for the campaign as a whole and can include other models and years. It is not a complaint count. Whether a specific car is included has to be checked by VIN at nhtsa.gov/recalls.`);
    const faqs = [
      { q: `How many ${name} complaints name ${labelLower}?`, a: `${fmt(complaintNaming)} of ${fmt(totalComplaints)} owner complaints for ${name} model years ${m.range} with records in this cache, checked ${prettyDate(checked)}. These are unverified allegations, not a reliability or safety ranking.` },
      { q: `Which ${name} years have the most ${labelLower} complaints?`, a: highest?.comp.count ? `The highest raw count is ${highest.year} (${fmt(highest.comp.count)}). ${label} is the most-named group in ${yearSpan(topYears.map((y) => y.year)) || "no year"}. Counts are not adjusted for sales or vehicle age.` : `No ${name} complaints in this cache name ${labelLower}.` },
      { q: `How many ${labelLower} recalls does NHTSA list for the ${name}?`, a: `${recalls.length} campaign${recalls.length === 1 ? "" : "s"} whose component is ${labelLower}${recalls[0] ? `, most recently ${recalls[0].campaign} (${prettyDate(recalls[0].received)})` : ""}. Each notice names the vehicles it covers. That is not the complaint count, and a VIN check at nhtsa.gov/recalls is the way to see whether a specific car is included.` },
      { q: `Does a ${labelLower} complaint mean a ${name} was recalled?`, a: `No. A complaint is an owner's report. A recall is a separate campaign, and it applies only to the vehicles named in the notice. Check the VIN at nhtsa.gov/recalls.` },
    ];
    const sourceUrls = [...new Set([
      ...years.flatMap((y) => [y.rec.complaints_source_url, y.rec.recalls_source_url]),
      ...recalls.map((r) => r.potential_units_source_url).filter(Boolean),
    ])];
    const topic = {
      spec, m, years, usable, topYears, recalls, complaintNaming, totalComplaints, highest,
      topWithoutRecall, topWithRecall, label, labelLower, name, note, summary: lines, faqs, sourceUrls,
      checked, checkedOldest, url: `/${m.makeSlug}/${m.modelSlug}/${spec.slug}/`,
      title: `${name} ${labelLower} problems, complaints and recalls`,
      description: `${name} ${labelLower}: the NHTSA component group owners named most often in ${yearSpan(topYears.map((y) => y.year)) || "no year"}. ${fmt(complaintNaming)} complaints and ${recalls.length} matching recall${recalls.length === 1 ? "" : "s"}, kept separate. Checked ${prettyDate(checked)}.`,
    };
    topics.push(topic);
    m.topics.push(topic);
  }
  for (const m of models) {
    const byComponent = new Map(m.topics.map((t) => [t.spec.component, t.url]));
    for (const y of m.years) {
      for (const c of y.s.components) if (byComponent.has(c.name)) c.topicUrl = byComponent.get(c.name);
      for (const r of y.s.recalls) {
        const url = byComponent.get(recallTop(r));
        if (url) r.topicUrl = url;
      }
    }
  }

  const makes = [...new Set(models.map((m) => m.make))].map((make) => {
    const ms = models.filter((m) => m.make === make);
    return { make, slug: slug(make), url: `/${slug(make)}/`, models: ms, totalComplaints: ms.reduce((a, m) => a + m.totalComplaints, 0), checked: ms.map((m) => m.checked).sort().at(-1) };
  });
  const checked = models.map((m) => m.checked).sort().at(-1);
  cache = { models, makes, modelYears, topics, checked };
  return cache;
}
