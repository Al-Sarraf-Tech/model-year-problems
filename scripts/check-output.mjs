#!/usr/bin/env node
// Post-build gate: internal links resolve, JSON-LD parses, every page carries the
// not-affiliated note, search index exists, no affiliate links slipped in.
import fs from "node:fs";
import path from "node:path";
import * as yaml from "js-yaml";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SITE = path.join(ROOT, "_site");
const PREFIX = (process.env.PATH_PREFIX || "/").replace(/\/?$/, "/");
const AFF = /([?&](tag|aff|affid|aff_id|affiliate|irclickid|clickid|ref_)=)|amzn\.to|sjv\.io|shareasale|awin1\.com|anrdoezrs|dpbolvw|jdoqocy|kqzyfj|tkqlhce|linksynergy/i;

const errors = [];
const files = [];
(function walk(d) { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); fs.statSync(p).isDirectory() ? walk(p) : p.endsWith(".html") && files.push(p); } })(SITE);

for (const f of files) {
  const html = fs.readFileSync(f, "utf8");
  const rel = path.relative(SITE, f);
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const url = m[1];
    if (AFF.test(url)) errors.push(`${rel}: affiliate-looking link ${url}`);
    if (url.startsWith("/") && !url.startsWith("//")) {
      if (!url.startsWith(PREFIX)) { errors.push(`${rel}: root link missing path prefix ${PREFIX}: ${url}`); continue; }
      const clean = decodeURI(url.slice(PREFIX.length).split(/[?#]/)[0]);
      const target = path.join(SITE, clean);
      const ok = fs.existsSync(target) && (fs.statSync(target).isFile() || fs.existsSync(path.join(target, "index.html")));
      if (!ok) errors.push(`${rel}: broken internal link ${url}`);
    }
  }
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch (e) { errors.push(`${rel}: JSON-LD does not parse (${e.message})`); }
  }
  if (!/not affiliated with NHTSA/.test(html)) errors.push(`${rel}: missing not-affiliated note`);
  if (/NaN|undefined|\[object Object\]/.test(html.replace(/<script[\s\S]*?<\/script>/g, ""))) errors.push(`${rel}: NaN/undefined/[object Object] in page text`);
  if (/worst year|bad year/i.test(html)) errors.push(`${rel}: worst/bad year wording`);
  if (!/noindex/.test(html)) {
    if (!/<link rel="canonical" href="https:\/\/modelyearproblems\.com\//.test(html)) errors.push(`${rel}: missing canonical`);
    if (!/<meta name="description" content="[^"]{20,}/.test(html)) errors.push(`${rel}: missing description`);
    if (/application\/ld\+json">\{/.test(html) && /"@type":"Article"/.test(html) && /"datePublished"/.test(html)) errors.push(`${rel}: Article datePublished is set`);
  }
}
const cfg = yaml.load(fs.readFileSync(path.join(ROOT, "vehicles.yaml"), "utf8"), { schema: yaml.CORE_SCHEMA });
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
for (const t of cfg.component_topics || []) {
  const rel = `${slug(t.make)}/${slug(t.model)}/${t.slug}/index.html`;
  const file = path.join(SITE, rel);
  if (!fs.existsSync(file)) { errors.push(`missing topic page ${rel}`); continue; }
  const html = fs.readFileSync(file, "utf8");
  if (!html.includes("https://www.nhtsa.gov/recalls")) errors.push(`${rel}: missing VIN recall link`);
  if (!html.includes("complaintsByVehicle")) errors.push(`${rel}: missing complaints API citation`);
  if (!html.includes("campaignNumber")) errors.push(`${rel}: missing campaignNumber citation`);
  if (!html.includes("not a reliability")) errors.push(`${rel}: missing ranking limitation`);
}
const sitemap = fs.readFileSync(path.join(SITE, "sitemap.xml"), "utf8");
const lastmods = [...sitemap.matchAll(/<lastmod>([^<]*)<\/lastmod>/g)].map((m) => m[1]);
if (!lastmods.length || lastmods.some((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d))) errors.push("sitemap lastmod is not YYYY-MM-DD");
if (sitemap.includes("/search/") || sitemap.includes("404")) errors.push("sitemap includes a noindex URL");
for (const t of cfg.component_topics || []) {
  const loc = `https://modelyearproblems.com/${slug(t.make)}/${slug(t.model)}/${t.slug}/`;
  if (!sitemap.includes(`<loc>${loc}</loc>`)) errors.push(`sitemap missing ${loc}`);
}
const robots = fs.readFileSync(path.join(SITE, "robots.txt"), "utf8");
if (!/Disallow:\s*\/pagefind\//.test(robots) || !/Sitemap:\s*https:\/\/modelyearproblems\.com\/sitemap\.xml/.test(robots)) errors.push("robots.txt missing pagefind disallow or sitemap");
if (!fs.existsSync(path.join(SITE, "pagefind", "pagefind-ui.js"))) errors.push("pagefind index missing (_site/pagefind)");
for (const f of ["robots.txt", "sitemap.xml", "llms.txt", "llms-full.txt", "CNAME"]) if (!fs.existsSync(path.join(SITE, f))) errors.push(`missing ${f}`);

if (errors.length) { console.error(`✗ Output check failed (${errors.length}):\n  - ${errors.slice(0, 50).join("\n  - ")}`); process.exit(1); }
console.log(`✓ Output check passed: ${files.length} HTML pages, internal links OK, JSON-LD valid, search index present, no affiliate links.`);
