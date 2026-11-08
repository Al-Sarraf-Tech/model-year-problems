# Model Year Problems

https://modelyearproblems.com · owner complaints and safety recalls by make, model and year,
counted from NHTSA's free public APIs. Static site: Eleventy + Pagefind, deployed to GitHub Pages.

Not affiliated with NHTSA, the U.S. Department of Transportation, or any automaker.

## How it works
- `vehicles.yaml`: which makes/models/years are covered, and which model-years get full pages.
- `scripts/fetch-nhtsa.mjs`: calls `api.nhtsa.gov` complaints + recalls for each model-year and writes
  `data/nhtsa/<make>-<model>-<year>.json` (committed). Complaint narratives are not stored.
- `src/lib/data.js`: turns the cache into page data. Every number on the site is computed here.
  `component_topics` in `vehicles.yaml` adds a cross-year page for one NHTSA component group.
  The evidence bar for those pages is in `NIGHTLY.md`.
- Build gates: `scripts/check-data.mjs` (each cache has NHTSA source URLs, a checked date and row counts
  matching NHTSA's count) and `scripts/check-output.mjs` (links, JSON-LD, not-affiliated note, no affiliate links).

## Commands
```sh
npm ci
npm run fetch                  # refresh all NHTSA data (~3 min)
npm run fetch -- honda-accord  # one model
npm run build                  # check + eleventy + pagefind + output check
docker compose up -d           # nginx on http://localhost:8080
```
Nightly publishing: see `NIGHTLY.md`.
