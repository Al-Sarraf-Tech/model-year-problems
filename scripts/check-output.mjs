#!/usr/bin/env node
// Post-build gate: internal links resolve, JSON-LD parses, every page carries the
// not-affiliated note, search index exists, and the only affiliate links are
// Amazon search URLs using the tag in src/_data/site.json, plus the EpicVIN
// homepage URL in epicvin_url on model-year pages.
import fs from "node:fs";
import path from "node:path";
import * as yaml from "js-yaml";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SITE = path.join(ROOT, "_site");
const PREFIX = (process.env.PATH_PREFIX || "/").replace(/\/?$/, "/");
const siteCfg = JSON.parse(fs.readFileSync(path.join(ROOT, "src/_data/site.json"), "utf8"));
const AMAZON_TAG = String(siteCfg.amazon_tag || "");
const EPICVIN_URL = String(siteCfg.epicvin_url || "");
const IMPACT = '<meta name="impact-site-verification" value="f7c5a118-9b24-47ab-9555-7d703204ec87">';
const ASSOCIATE = "As an Amazon Associate I earn from qualifying purchases.";
const OTHER_AFF = /amzn\.to|sjv\.io|shareasale|awin1\.com|anrdoezrs|dpbolvw|jdoqocy|kqzyfj|tkqlhce|linksynergy|[?&](aff|affid|aff_id|affiliate|irclickid|clickid|ref_)=/i;
const AMAZON_MEDIA = /images-amazon|ssl-images-amazon|media-amazon|amazon-adsystem|webservices\.amazon|paapi/i;

function decodeHref(href) {
  return String(href).replace(/&amp;/g, "&").replace(/&#0*38;/g, "&");
}

function isAllowedAmazon(href) {
  if (!AMAZON_TAG) return false;
  let u;
  try { u = new URL(decodeHref(href)); } catch { return false; }
  if (u.origin !== "https://www.amazon.com" || u.pathname !== "/s" || u.hash) return false;
  const keys = [...u.searchParams.keys()];
  if (keys.length !== 2 || !keys.includes("k") || !keys.includes("tag")) return false;
  if (u.searchParams.get("tag") !== AMAZON_TAG) return false;
  const k = u.searchParams.get("k") || "";
  if (!k || /\b(air\s*bags?|seat\s*belts?|structure)\b/i.test(k)) return false;
  return true;
}

function isAllowedEpicvin(href) {
  return !!EPICVIN_URL && decodeHref(href) === EPICVIN_URL;
}

const errors = [];
const files = [];
let partsPages = 0;
let epicvinPages = 0;
(function walk(d) { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); fs.statSync(p).isDirectory() ? walk(p) : p.endsWith(".html") && files.push(p); } })(SITE);

if (siteCfg.affiliates_enabled && !AMAZON_TAG) errors.push("affiliates_enabled is true but amazon_tag is empty");
if (siteCfg.affiliates_enabled && !EPICVIN_URL) errors.push("affiliates_enabled is true but epicvin_url is empty");

for (const f of files) {
  const html = fs.readFileSync(f, "utf8");
  const rel = path.relative(SITE, f);
  let stripped = html;
  for (const m of html.matchAll(/https:\/\/www\.amazon\.com\/s\?[^"'\s<]*/g)) {
    if (isAllowedAmazon(m[0])) stripped = stripped.split(m[0]).join("");
  }
  for (const m of html.matchAll(/https:\/\/epicvin\.com\/?\?[^"'\s<]*/g)) {
    if (isAllowedEpicvin(m[0])) stripped = stripped.split(m[0]).join("");
  }
  if (OTHER_AFF.test(stripped) || /[?&]tag=/i.test(stripped) || AMAZON_MEDIA.test(stripped) || /epicvin\.com|a_aid=/i.test(stripped)) {
    errors.push(`${rel}: disallowed affiliate, short, Amazon product, or EpicVIN link`);
  }
  let amazon = 0;
  let epicvin = 0;
  for (const m of html.matchAll(/<a\b[^>]*>/gi)) {
    const tag = m[0];
    const href = tag.match(/\bhref="([^"]*)"/)?.[1];
    if (!href) continue;
    const sponsored = /\brel="sponsored nofollow noopener"/.test(tag);
    const blank = /\btarget="_blank"/.test(tag);
    if (/epicvin\.com/i.test(href)) {
      epicvin++;
      if (!isAllowedEpicvin(href)) errors.push(`${rel}: EpicVIN link is not the homepage URL ${href}`);
      if (!sponsored) errors.push(`${rel}: EpicVIN link missing rel="sponsored nofollow noopener"`);
      if (!blank) errors.push(`${rel}: EpicVIN link missing target="_blank"`);
      if (/<img\b/i.test(tag)) errors.push(`${rel}: EpicVIN link is not text-only`);
      continue;
    }
    if (!/amazon\.com/i.test(href)) continue;
    amazon++;
    if (!isAllowedAmazon(href)) errors.push(`${rel}: amazon link is not an allowed search ${href}`);
    if (!sponsored) errors.push(`${rel}: amazon link missing rel="sponsored nofollow noopener"`);
    if (!blank) errors.push(`${rel}: amazon link missing target="_blank"`);
  }
  const modelYear = /^[^/]+\/[^/]+\/\d{4}\/index\.html$/.test(rel);
  if (siteCfg.affiliates_enabled && modelYear) {
    if (epicvin !== 1) errors.push(`${rel}: expected one EpicVIN link, found ${epicvin}`);
    if (!html.includes("vehicle history report (EpicVIN)")) errors.push(`${rel}: missing EpicVIN history-report line`);
  } else if (epicvin) {
    errors.push(`${rel}: EpicVIN link is only for model-year pages`);
  }
  if (epicvin) epicvinPages++;
  if (amazon > 3) errors.push(`${rel}: ${amazon} Amazon links (max 3)`);
  if (amazon > 0) {
    partsPages++;
    if (!html.includes(ASSOCIATE)) errors.push(`${rel}: missing Amazon Associates disclosure`);
    if (!html.includes('href="/affiliate-disclosure/"')) errors.push(`${rel}: Amazon link without /affiliate-disclosure/`);
    if (!html.includes("Recall repairs are free at a dealer.")) errors.push(`${rel}: missing free-recall line near parts links`);
    if (!/<h2 id="parts">Parts and tools<\/h2>/.test(html)) errors.push(`${rel}: Amazon links outside the Parts and tools block`);
    if ((html.match(/<h2 id="parts">/g) || []).length !== 1) errors.push(`${rel}: expected one Parts and tools block`);
  }
  if (siteCfg.affiliates_enabled) {
    if (!html.includes("Some links may be affiliate links.")) errors.push(`${rel}: missing affiliate notice`);
  } else if (html.includes("Some links may be affiliate links.") || amazon || epicvin) {
    errors.push(`${rel}: affiliate notice or link while affiliates_enabled is false`);
  }
  if (!html.includes(IMPACT)) errors.push(`${rel}: missing Impact site verification`);
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const url = m[1];
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

const disclosure = fs.readFileSync(path.join(SITE, "affiliate-disclosure/index.html"), "utf8");
if (!disclosure.includes("EpicVIN")) errors.push("affiliate disclosure does not name EpicVIN");
if (!/commission/i.test(disclosure)) errors.push("affiliate disclosure does not mention a commission");
if (errors.length) { console.error(`✗ Output check failed (${errors.length}):\n  - ${errors.slice(0, 50).join("\n  - ")}`); process.exit(1); }
console.log(`✓ Output check passed: ${files.length} HTML pages, internal links OK, JSON-LD valid, search index present, ${partsPages} pages with Parts and tools links, ${epicvinPages} model-year pages with an EpicVIN link.`);
