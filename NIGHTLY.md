# Nightly: one new useful page

Goal: every night, publish **one** new model-year page (or one new model) that answers a real
"{year} {make} {model} problems" question with NHTSA numbers. No filler, no invented numbers,
no copied text from other car-problem sites, no complaint narratives, no reviews or ratings.

## Steps (about 10 minutes)

1. `npm ci` (first run only).
2. Take the **first unchecked item** in the backlog below.
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
- `affiliates_enabled` stays `false` until Jamal approves a program.
- Not affiliated with NHTSA or any automaker: the footer note must stay on every page (build checks it).

## Backlog: model-year pages (highest complaint counts first)
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
- [ ] `ford/fusion/2015` (2015 Ford Fusion: 1,066 complaints, 13 recalls on 2026-10-31)
- [ ] `ford/focus/2015` (2015 Ford Focus: 1,034 complaints, 9 recalls on 2026-10-31)
- [ ] `chevrolet/malibu/2011` (2011 Chevrolet Malibu: 978 complaints, 4 recalls on 2026-10-31)
- [ ] `nissan/altima/2015` (2015 Nissan Altima: 955 complaints, 10 recalls on 2026-10-31)
- [ ] `chevrolet/malibu/2013` (2013 Chevrolet Malibu: 924 complaints, 10 recalls on 2026-10-31)
- [ ] `chevrolet/malibu/2012` (2012 Chevrolet Malibu: 907 complaints, 3 recalls on 2026-10-31)
- [ ] `ford/focus/2017` (2017 Ford Focus: 906 complaints, 10 recalls on 2026-10-31)
- [ ] `chevrolet/malibu/2016` (2016 Chevrolet Malibu: 865 complaints, 9 recalls on 2026-10-31)
- [ ] `chevrolet/silverado-1500/2017` (2017 Chevrolet Silverado 1500: 839 complaints, 7 recalls on 2026-10-31)
- [ ] `ford/focus/2018` (2018 Ford Focus: 837 complaints, 7 recalls on 2026-10-31)
- [ ] `ford/explorer/2012` (2012 Ford Explorer: 830 complaints, 7 recalls on 2026-10-31)
- [ ] `chevrolet/silverado-1500/2016` (2016 Chevrolet Silverado 1500: 801 complaints, 12 recalls on 2026-10-31)
- [ ] `chevrolet/equinox/2011` (2011 Chevrolet Equinox: 782 complaints, 3 recalls on 2026-10-31)
- [ ] `chevrolet/equinox/2013` (2013 Chevrolet Equinox: 751 complaints, 2 recalls on 2026-10-31)
- [ ] `chevrolet/silverado-1500/2020` (2020 Chevrolet Silverado 1500: 749 complaints, 12 recalls on 2026-10-31)
- [ ] `ford/explorer/2018` (2018 Ford Explorer: 733 complaints, 7 recalls on 2026-10-31)
- [ ] `chevrolet/cruze/2011` (2011 Chevrolet Cruze: 733 complaints, 7 recalls on 2026-10-31)
- [ ] `chevrolet/malibu/2017` (2017 Chevrolet Malibu: 727 complaints, 4 recalls on 2026-10-31)
- [ ] `chevrolet/cruze/2014` (2014 Chevrolet Cruze: 703 complaints, 10 recalls on 2026-10-31)
- [ ] `chevrolet/malibu/2018` (2018 Chevrolet Malibu: 700 complaints, 6 recalls on 2026-10-31)
- [ ] `honda/accord/2019` (2019 Honda Accord: 698 complaints, 6 recalls on 2026-10-31)
- [ ] `chevrolet/equinox/2012` (2012 Chevrolet Equinox: 685 complaints, 3 recalls on 2026-10-31)
- [ ] `chevrolet/equinox/2015` (2015 Chevrolet Equinox: 680 complaints, 2 recalls on 2026-10-31)
- [ ] `honda/cr-v/2015` (2015 Honda CR-V: 673 complaints, 3 recalls on 2026-10-31)
- [ ] `toyota/camry/2012` (2012 Toyota Camry: 645 complaints, 2 recalls on 2026-10-31)
- [ ] `chevrolet/silverado-1500/2011` (2011 Chevrolet Silverado 1500: 640 complaints, 4 recalls on 2026-10-31)
- [ ] `toyota/rav4/2020` (2020 Toyota RAV4: 639 complaints, 6 recalls on 2026-10-31)
- [ ] `toyota/camry/2011` (2011 Toyota Camry: 625 complaints, 5 recalls on 2026-10-31)
- [ ] `toyota/camry/2010` (2010 Toyota Camry: 614 complaints, 9 recalls on 2026-10-31)

## Backlog: new models (check NHTSA spelling first)
- [ ] Toyota Tacoma (TACOMA)
- [ ] Toyota Highlander (HIGHLANDER)
- [ ] Jeep Grand Cherokee (GRAND CHEROKEE)
- [ ] Jeep Cherokee (CHEROKEE)
- [ ] Hyundai Sonata (SONATA)
- [ ] Hyundai Elantra (ELANTRA)
- [ ] Kia Optima (OPTIMA)
- [ ] Kia Sorento (SORENTO)
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

Meets the count bar, not published:
- Ford Explorer structure. In the 2026-11-06 cache, structure is the most-named group in 2015
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
