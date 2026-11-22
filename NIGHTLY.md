# Nightly: one new useful page

Goal: every night, publish **one** new model-year page (or one new model) that answers a real
"{year} {make} {model} problems" question with NHTSA numbers. No filler, no invented numbers,
no copied text from other car-problem sites, no complaint narratives, no reviews or ratings.

## Steps (about 10 minutes)

1. `npm ci` (first run only).
2. Take the **first unchecked item** in the Priority queue, then in the model-year backlog below. A queue item that says
   "Component topic" is added under `component_topics` in `vehicles.yaml` (see "Component topics") instead of `extra_pages`.
   - A model-year item `make/model/year`: refresh its model's cache, then add it to `extra_pages`:
     ```sh
     npm run fetch -- make-model            # e.g. npm run fetch -- ford-escape  (all 11 years, ~20 s)
     # then add "  - make/model/year" under extra_pages in vehicles.yaml
     ```
   - A new-model item: add it to `models:` in `vehicles.yaml` with the exact NHTSA spelling
     (check `https://api.nhtsa.gov/complaints/complaintsByVehicle?make=X&model=Y&modelYear=2015`
     returns a plausible count first; if it returns 0 or a tiny number for a car that sold well,
     **don't publish**, note it under "Blocked" below), then `npm run fetch -- make-model`.
     The model's highest complaint-count year gets a page automatically. That count is not a
     reliability or safety ranking.
3. `npm run build` must pass all three gates (data check, Eleventy + Pagefind, output check).
4. Read the new page once in the browser (`npx http-server _site -p 8091`). Check the summary reads
   naturally and the top component isn't "Unknown or other"-dominated nonsense.
5. Tick the item here, add a line to `/workspace/model-year-problems-log.md`
   (date, URL, complaints, recalls, checked date), commit `Add <name>`, push to `main`.
6. Once a week (Sunday), refresh everything: `npm run fetch` (~3 min), rebuild, commit
   `Refresh NHTSA data <date>`. Counts will move; that is expected.

## Rules
- Every number must come from `data/nhtsa/*.json` via `src/lib/data.js`. Never hand-type a count.
- If a year is flagged as a likely API gap, don't give it a page; note it under Blocked.
- `affiliates_enabled` is `true` in `src/_data/site.json`. The Amazon Associates tag is the `amazon_tag` value in that same file. The EpicVIN link is the `epicvin_url` value in that same file: the homepage only, never a deep link, banner, price, or discount. Do not turn the flag off, do not add a second tag, and do not add another affiliate network. Do not show Amazon prices, ratings, or images. The Parts and tools block is rendered by the templates from complaint component counts. The model-year template adds one EpicVIN sentence near the summary. Do not hand-write links, and do not change the NHTSA cache format to store them. Do not imply a part fixes a recall. Recall repairs are free at a dealer. Do not link air bags, seat belts, or structure.
- Not affiliated with NHTSA or any automaker: the footer note must stay on every page (build checks it).

## Priority queue (search-demand review, 2026-11-12) — take these first, in order
Why this order: Google's autosuggest for "{year} {make} {model} problems" shows the broadest follow-on
searches ("problems and recalls", "common problems", "transmission/engine problems", "reddit") for the
Chevrolet Equinox, Cruze, Honda Accord/CR-V, Toyota Camry/RAV4 and Silverado 2020. Reddit buyer threads
also keep asking about the 2014 Explorer (steering, transmission) and the 2.4L Equinox (oil use). The pages
state NHTSA counts only; never claim a defect cause the NHTSA record does not name.
- [x] `chevrolet/equinox/2011` (2026-11-12: 783 complaints, 3 recalls; engine most named)
- [x] `chevrolet/equinox/2013` (2026-11-12: 751 complaints, 2 recalls; engine most named)
- [x] `chevrolet/equinox/2012` (2026-11-12: 685 complaints, 3 recalls; engine most named)
- [x] (2026-11-13: published; engine most named in 2010–2014, 2016–2017, 2019; 2,536 of 5,951 complaints; 0 ENGINE campaigns returned) Component topic: Chevrolet Equinox **engine**, `/chevrolet/equinox/engine/`. In the 2026-11-08 cache engine is the most-named
  group in 2010–2014 and 2016–2017 with at least 250 complaints in 2010–2013 (271, 386, 355, 412), so it meets bar item 1; re-check after
  fetching. Follow "Component topics" below to the letter, including the campaignNumber lookups. Do not call it an oil-consumption page
  unless NHTSA's own recall or complaint-component text for a matched campaign says so.
- [x] (2026-11-13: published; steering most named in 2011–2014; 3,459 of 14,362 complaints; campaigns 14V286000, 14E001000, 17V530000; 2014–2016 no steering campaign) Component topic: Ford Explorer **steering**, `/ford/explorer/steering/`. Steering is the most-named group in 2011–2014 (743, 361, 837, 500
  in the 2026-11-08 cache) with 2015 and 2016 close behind. Re-fetch Explorer first and state which years have no steering campaign.
- [x] `honda/accord/2019` (2026-11-13: 702 complaints, 6 recalls; engine most named)
- [x] `honda/cr-v/2015` (2026-11-14: 674 complaints, 3 recalls; engine most named)
- [x] `toyota/camry/2012` (2026-11-14: 646 complaints, 2 recalls; power train most named)
- [x] `toyota/rav4/2020` (2026-11-14: 642 complaints, 6 recalls; engine most named)
- [x] `chevrolet/cruze/2011` (2026-11-15: 733 complaints, 7 recalls; engine most named)
- [x] `chevrolet/cruze/2014` (2026-11-15: 705 complaints, 10 recalls; engine most named)
- [x] `chevrolet/silverado-1500/2020` (2026-11-15: 755 complaints, 12 recalls; engine most named)
- [x] `ford/explorer/2018` (2026-11-16: 735 complaints, 7 recalls; structure most named)
- [x] `chevrolet/malibu/2017` (2026-11-16: 727 complaints, 4 recalls; engine most named)
- [x] `chevrolet/malibu/2018` (2026-11-16: 702 complaints, 6 recalls; engine most named)

## Backlog: model-year pages (highest complaint counts first; the items moved to the priority queue are removed here)
- [x] `ford/escape/2014` (2014 Ford Escape: 2,089 complaints, 16 recalls on 2026-10-31)
- [x] `ford/fusion/2013` (2013 Ford Fusion: 1,957 complaints, 19 recalls on 2026-10-31)
- [x] `ford/escape/2018` (2018 Ford Escape: 1,822 complaints, 4 recalls on 2026-10-31)
- [x] `ford/fusion/2016` (2016 Ford Fusion: 1,736 complaints, 13 recalls on 2026-10-31)
- [x] `ford/explorer/2017` (2017 Ford Explorer: 1,713 complaints, 14 recalls on 2026-10-31)
- [x] `ford/explorer/2014` (2014 Ford Explorer: 1,684 complaints, 7 recalls on 2026-10-31)
- [x] `ford/escape/2020` (2020 Ford Escape: 1,548 complaints, 23 recalls on 2026-10-31)
- [x] `ford/fusion/2014` (2014 Ford Fusion: 1,435 complaints, 19 recalls on 2026-11-05)
- [x] `ford/escape/2011` (2011 Ford Escape: 1,319 complaints, 3 recalls on 2026-11-05)
- [x] `ford/explorer/2020` (2020 Ford Explorer: 1,250 complaints, 33 recalls on 2026-11-05)
- [x] `ford/explorer/2011` (2011 Ford Explorer: 1,197 complaints, 8 recalls on 2026-11-06)
- [x] `ford/focus/2016` (2016 Ford Focus: 1,196 complaints, 10 recalls on 2026-11-06)
- [x] `ford/escape/2016` (2016 Ford Escape: 1,185 complaints, 4 recalls on 2026-11-06)
- [x] `ford/escape/2015` (2015 Ford Escape: 1,142 complaints, 9 recalls on 2026-11-07)
- [x] `ford/fusion/2017` (2017 Ford Fusion: 1,115 complaints, 4 recalls on 2026-11-07)
- [x] `chevrolet/silverado-1500/2019` (2019 Chevrolet Silverado 1500: 1,104 complaints, 10 recalls on 2026-11-07)
- [x] `ford/fusion/2015` (2015 Ford Fusion: 1,066 complaints, 13 recalls on 2026-11-08)
- [x] `ford/focus/2015` (2015 Ford Focus: 1,034 complaints, 9 recalls on 2026-11-08)
- [x] `chevrolet/malibu/2011` (2011 Chevrolet Malibu: 978 complaints, 4 recalls on 2026-11-08)
- [x] `nissan/altima/2015` (2015 Nissan Altima: 956 complaints, 10 recalls on 2026-11-09)
- [x] `chevrolet/malibu/2013` (2013 Chevrolet Malibu: 924 complaints, 10 recalls on 2026-11-09)
- [x] `chevrolet/malibu/2012` (2012 Chevrolet Malibu: 907 complaints, 3 recalls on 2026-11-09)
- [x] `ford/focus/2017` (2017 Ford Focus: 906 complaints, 10 recalls on 2026-11-10)
- [x] `chevrolet/malibu/2016` (2016 Chevrolet Malibu: 865 complaints, 9 recalls on 2026-11-10)
- [x] `chevrolet/silverado-1500/2017` (2017 Chevrolet Silverado 1500: 839 complaints, 7 recalls on 2026-11-10)
- [x] `ford/focus/2018` (2018 Ford Focus: 839 complaints, 7 recalls on 2026-11-11)
- [x] `ford/explorer/2012` (2012 Ford Explorer: 831 complaints, 7 recalls on 2026-11-11)
- [x] `chevrolet/silverado-1500/2016` (2016 Chevrolet Silverado 1500: 801 complaints, 12 recalls on 2026-11-11)
- [x] `chevrolet/equinox/2015` (2015 Chevrolet Equinox: 680 complaints, 2 recalls on 2026-11-17; visibility/wiper most named)
- [x] `chevrolet/silverado-1500/2011` (2011 Chevrolet Silverado 1500: 640 complaints, 4 recalls on 2026-11-17; air bags most named)
- [x] `toyota/camry/2011` (2011 Toyota Camry: 625 complaints, 5 recalls on 2026-11-17; visibility/wiper most named, 118 unknown/other)
- [x] `toyota/camry/2010` (2010 Toyota Camry: 614 complaints, 9 recalls on 2026-11-18; vehicle speed control most named)
- Model-year backlog is empty after 2010 Camry: next nights take new models from the list below (Outback, Forester, Ram 1500 next; Elantra, Optima, Sorento done 2026-11-21), checking NHTSA spelling and counts before adding.
- 2026-11-19: Hyundai Sonata was tried in the same run but would have added two pages (2011 top year plus 2013 as a featured second year), making four new pages; it was held back. Sonata counts on 2026-11-19: 2011 3,380, 2013 1,920, 2012 1,559 complaints. Expect two Sonata pages when it is added.
- 2026-11-20: Elantra spot check: 2011 461, 2013 1,335, 2017 771 complaints (plausible; re-fetch before adding).
- Adding a new model adds its top year to the featured set and can push the lowest featured pages out of the build. On 2026-11-18
  `honda/cr-v/2019` and `nissan/altima/2014` (already live) dropped out, so they were pinned in `extra_pages`. After adding a model,
  compare the built page list with the live sitemap and pin any live page that would disappear.
  On 2026-11-19 adding Grand Cherokee and Cherokee pushed out `chevrolet/silverado-1500/2015`, `honda/accord/2013`, `honda/cr-v/2017`; all three pinned.
  On 2026-11-20 adding Sonata pushed out `ford/explorer/2015` and `jeep/cherokee/2015`; both pinned, and the three Sonata pages pinned too.
  On 2026-11-21 adding Elantra, Optima and Sorento pushed out `ford/escape/2010` and `ford/focus/2013`; both pinned. No second years entered the featured set.
  `npm run build` does not clear `_site`, so `rm -rf _site` before comparing page lists.

## Backlog: new models (check NHTSA spelling first)
- [x] Toyota Tacoma (TACOMA) (2026-11-18: page `toyota/tacoma/2016`, 325 complaints, 4 recalls; power train most named. 2010 returned 0 complaints, flagged as gap)
- [x] Toyota Highlander (HIGHLANDER) (2026-11-18: page `toyota/highlander/2019`, 514 complaints, 3 recalls; power train most named)
- [x] Jeep Grand Cherokee (GRAND CHEROKEE) (2026-11-19: page `jeep/grand-cherokee/2014`, 2,394 complaints, 19 recalls; electrical system most named, power train close behind)
- [x] Jeep Cherokee (CHEROKEE) (2026-11-19: pages `jeep/cherokee/2014` (2,652 complaints, 13 recalls) and `jeep/cherokee/2015` (1,795, 11; entered the featured set as a second year); power train most named. 2010–2013 return 0 complaints and 0 recalls: the Cherokee name returned for MY2014, so these are "no records", not gaps)
- [x] Hyundai Sonata (SONATA) (2026-11-20: pages `hyundai/sonata/2011` (3,380 complaints, 14 recalls; steering most named), `hyundai/sonata/2013` (1,920, 9; engine most named; featured second year) and `hyundai/sonata/2012` (1,559, 8; engine most named; added via extra_pages). All 11 years 2010–2020 returned plausible counts, no gaps)
- [x] Hyundai Elantra (ELANTRA) (2026-11-21: page `hyundai/elantra/2013`, 1,335 complaints, 4 recalls; steering most named. All 11 years 2010–2020 plausible, no gaps)
- [x] Kia Optima (OPTIMA) (2026-11-21: page `kia/optima/2013`, 1,388 complaints, 9 recalls; engine most named. 2010 has 75 complaints (old generation's last year), not flagged)
- [x] Kia Sorento (SORENTO) (2026-11-21: page `kia/sorento/2011`, 1,521 complaints, 8 recalls; engine most named, structure and power train close. 2010 returned 3 complaints and 2 recalls (2009: 55, 2011: 1,521); see Blocked)
- [ ] Subaru Outback (OUTBACK)
- [ ] Subaru Forester (FORESTER)
- [ ] Ram 1500 (1500, make RAM)
- [ ] GMC Sierra 1500 (SIERRA 1500)
- [ ] Dodge Grand Caravan (GRAND CARAVAN)
- [ ] Nissan Pathfinder (PATHFINDER)
- [ ] Honda Pilot (PILOT)
- [ ] Honda Odyssey (ODYSSEY)

## Component topics

A component page is one make, one model, and one NHTSA complaint component (not "Unknown or other").
Publish it only when every item below is true. Counts on the page are computed from `data/nhtsa`;
the numbers in this log are a snapshot, not the source of truth.

1. That group is the one owners named most often in at least three model years, and each of those
   years has at least 250 complaints in the group. API-gap years do not count.
2. Every year the page cites was just fetched from `complaintsByVehicle` and `recallsByVehicle`.
   Each matching recall also has a `campaignNumber` lookup.
3. A matching recall is one whose component top-level group is exactly that component. The page
   lists those notices separately from complaint counts, quotes NHTSA's text, and shows the
   campaign's model rows and potential-units figure when NHTSA provides them. That figure is for
   the whole campaign and is not a complaint count.
4. The page says the counts are not a reliability or safety ranking, and that VIN recall status
   has to be checked at https://www.nhtsa.gov/recalls.
5. The page is not a single model-year page under a new URL.

Published:
- [x] Ford Focus power train, `/ford/focus/power-train/` (fetched 2026-11-08). Power train is the
  most-named group in 2012–2018 (6,242 of 12,952 Focus complaints in years with records). The
  recalls API returned three power-train campaigns (26V376000, 18V845000, 18V169000). Their notices
  name particular engines and transmissions, and 2012–2014 — the highest power-train complaint
  counts — had no power-train campaign returned. Do not treat the complaint total as the recalled
  population.
- [x] Ford Fusion steering, `/ford/fusion/steering/` (fetched 2026-11-08). Steering is the
  most-named group in 2010–2014 (5,831 of 18,869 Fusion complaints in years with records). Five
  steering campaigns were returned. 2010 has the highest steering count and no steering campaign.
  Campaign potential-units figures (for example 15V340000) cover every model row in the campaign,
  not Fusion complaints.
- [x] Chevrolet Equinox engine, `/chevrolet/equinox/engine/` (fetched 2026-11-13). Engine is the most-named
  group in 2010–2014, 2016–2017 and 2019 (271, 386, 355, 412 in 2010–2013). The recalls API returned no
  campaign whose component is ENGINE for any 2010–2020 Equinox; the page leads with that. Not an oil-consumption page.
- [x] Ford Explorer steering, `/ford/explorer/steering/` (fetched 2026-11-13). Steering is the most-named
  group in 2011–2014 (744, 361, 837, 500). Steering campaigns returned: 14V286000 (2011–2013), 14E001000
  (2011–2012), 17V530000 (2017). 2014 (top group) and 2015–2016 returned no steering campaign.

Meets the count bar, not published:
- Ford Explorer structure. In the 2026-11-13 cache structure is top in 2015 (412), 2016 (594), 2017 (665), 2018 (288). In the 2026-11-06 cache, structure is the most-named group in 2015
  (411), 2016 (592), 2017 (665), and 2018 (288), with body recalls whose years overlap (including
  24V031000). Re-fetch Explorer before publishing. Same rules: the roof-rail and trim notices name
  the vehicles, and the complaint count is not that population.
- Ford Escape engine. Engine is the most-named group in 2013 (1,269), 2014 (728), 2017 (1,585),
  2018 (1,173), and 2019 (322) in the 2026-11-07 cache. An ENGINE-component recall was returned for
  2013 (13V583000, 1.6L). 2014, 2017, 2018, and 2019 did not return an ENGINE campaign. 2014's
  related notice (17V209000) is filed under ENGINE AND ENGINE COOLING, a different group. Do not
  publish until the page leads with that mismatch. Do not imply the 2013 recall explains later years.

Do not publish:
- A cross-model "transmission", "engine", or "steering" page. The group is too broad to mix models.
- Air bags, until each model-year's own recall notice is what names the defect. Do not add a
  supplier or a defect name that the notice does not use.
- Any best-year or worst-year list. There is no exposure-normalized denominator in this cache.

## Blocked / needs a look
- Ford F-150: on 2026-10-31 the complaints API returned 0 for model `F-150` 2012 and 2015 and 94 for
  2018, while the recalls API returned 14 recalls for 2015. That can't be the full complaint count for
  America's best-selling truck. Find the spelling NHTSA uses for F-150 complaints before adding it.
- Toyota Camry 2014: complaints API returned 14 (2013: 301, 2015: 271). Flagged on the site as a likely gap.
- Chevrolet Silverado 1500 2010: complaints API returned 0 but 3 recalls. Flagged as a likely gap.
- Toyota Tacoma 2010: on 2026-11-18 the complaints API returned 0 for TACOMA 2010 but 13 recalls (2011: 186, 2012: 295). Flagged on the site as a likely gap; no page.
- Toyota Camry 2014: re-checked 2026-11-18, complaints API now returns 15. Still flagged.
- Kia Sorento 2010: on 2026-11-21 the complaints API returned 3 (2 recalls) vs 1,521 for 2011 and 55 for 2009. Likely a model-changeover year with very few US vehicles rather than an API gap, but the gap rule only checks years with two neighbours, so the Sorento model page currently names 2010 as the "fewest" year (same as Cruze 2010 with 2). No page. Consider an edge-year rule (e.g. under 10 complaints while the only neighbour has over 100) so near-empty first years aren't ranked; don't use a 10% rule there, it would wrongly flag Explorer 2010 (115) and Grand Cherokee 2010 (118).

## Done outside the backlog
- 2026-11-15: weekly full refresh, `npm run fetch` 187/187 model-years (shipped with the Cruze/Silverado pages).
- 2026-11-12: authorized search-impressions batch (not a nightly page). Model-year pages gained computed FAQ answers: most common
  problems, recall for the top component group, listed recall campaigns, "is it reliable". Model pages gained "years should I avoid"
  (no avoid list; raw counts and caveats only) and "most common problems" answers. IndexNow added (key file at the site root, ping step in the
  Pages workflow). Sitemap `lastmod` for model-year and model pages follows the later of the data-checked date and
  `model_year_content_updated` in `src/_data/site.json`; bump that date only when the template content changes. Component-topic pages use the same date.

