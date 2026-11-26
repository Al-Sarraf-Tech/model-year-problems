// Amazon search links for the Parts and tools block.
// The Associates tag comes from site.amazon_tag. Nothing here is written into
// the NHTSA cache. Air bags, seat belts, structure, and driver-assistance
// safety systems are left out: a DIY part is not an appropriate suggestion.
// A link is a search, not a claim that a part fixes a complaint or a recall.

const MAX_LINKS = 3;
// Only the highest-ranked named groups are considered, so a rare shoppable
// group does not get a link ahead of what owners actually report.
const TOP_GROUPS = 5;

// NHTSA component group → the retail search a reader might actually run.
export const PART_QUERIES = {
  "ENGINE": "engine parts",
  "ENGINE AND ENGINE COOLING": "engine cooling parts",
  "ELECTRICAL SYSTEM": "car battery",
  "POWER TRAIN": "transmission fluid",
  "STEERING": "steering parts",
  "SUSPENSION": "suspension parts",
  "SERVICE BRAKES": "brake pads",
  "SERVICE BRAKES, HYDRAULIC": "brake pads",
  "SERVICE BRAKES, AIR": "brake parts",
  "VISIBILITY/WIPER": "wiper blades",
  "EXTERIOR LIGHTING": "headlight bulb",
};

// OBD-II is a diagnostic tool, offered when engine or electrical is the top group.
const OBD_TOP = new Set(["ENGINE", "ENGINE AND ENGINE COOLING", "ELECTRICAL SYSTEM"]);

function searchLink(query, tag) {
  const href = `https://www.amazon.com/s?${new URLSearchParams({ k: query, tag }).toString()}`;
  return { href, text: query };
}

export function vehiclePartsLinks({ components, year, make, model, tag }) {
  if (!tag) return [];
  const vehicle = [year, make, model].filter((v) => v !== undefined && v !== null && String(v) !== "").join(" ");
  if (!vehicle) return [];
  const named = (components || []).filter((c) => c && c.name && c.name !== "UNKNOWN OR OTHER");
  const top = named.slice(0, TOP_GROUPS);
  const obd = top.length > 0 && OBD_TOP.has(top[0].name);
  const partLimit = obd ? MAX_LINKS - 1 : MAX_LINKS;
  const links = [];
  const seen = new Set();
  for (const c of top) {
    if (links.length >= partLimit) break;
    const phrase = PART_QUERIES[c.name];
    if (!phrase || seen.has(phrase)) continue;
    seen.add(phrase);
    links.push(searchLink(`${vehicle} ${phrase}`, tag));
  }
  if (obd && links.length < MAX_LINKS) links.push(searchLink(`${vehicle} OBD-II scanner`, tag));
  return links;
}

export function topicPartsLinks(topic, tag) {
  if (!tag || !topic?.spec || !topic?.m) return [];
  const phrase = PART_QUERIES[topic.spec.component];
  const obd = OBD_TOP.has(topic.spec.component);
  if (!phrase && !obd) return [];
  const years = (topic.years || [])
    .filter((y) => y && !y.noRecords && !y.suspectGap && !y.sparse && y.comp && y.comp.count > 0)
    .sort((a, b) => b.comp.count - a.comp.count || a.year - b.year);
  if (!years.length) return [];
  const partLimit = obd ? MAX_LINKS - 1 : MAX_LINKS;
  const links = [];
  if (phrase) {
    for (const y of years) {
      if (links.length >= partLimit) break;
      links.push(searchLink(`${y.year} ${topic.m.make} ${topic.m.model} ${phrase}`, tag));
    }
  }
  if (obd && links.length < MAX_LINKS) {
    const y = years[0];
    links.push(searchLink(`${y.year} ${topic.m.make} ${topic.m.model} OBD-II scanner`, tag));
  }
  return links.slice(0, MAX_LINKS);
}
