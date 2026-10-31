// NHTSA joins a complaint's component groups with commas, but some group names
// contain a comma themselves ("SERVICE BRAKES, HYDRAULIC", "FUEL SYSTEM, GASOLINE").
// This splits the raw string back into whole group names.
const SUFFIXES = new Set(["HYDRAULIC", "AIR", "ELECTRIC", "GASOLINE", "DIESEL", "OTHER"]);
const PARENTS = new Set(["SERVICE BRAKES", "FUEL SYSTEM"]);
// Car-seat complaints filed against a vehicle list the seat's parts in mixed case.
const CHILD_SEAT_PARTS = new Set(["Chest Clip", "Buckle", "Harness", "Carry Handle", "Shell", "Base", "Tether", "Lower Anchor (on car seat or vehicle)", "Insert", "Padding", "I suspect the car seat is counterfeit"]);

export function splitComponents(raw) {
  const parts = String(raw || "").split(",").map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (const p of parts) {
    const head = p.split(";")[0].trim();
    if (SUFFIXES.has(head) && out.length && PARENTS.has(out[out.length - 1])) {
      out[out.length - 1] = `${out[out.length - 1]}, ${head}`;
    } else if (CHILD_SEAT_PARTS.has(p)) {
      out.push("CHILD SEAT");
    } else if (/^other/i.test(p) || p === "NONE") {
      out.push("UNKNOWN OR OTHER");
    } else {
      out.push(p.toUpperCase());
    }
  }
  return [...new Set(out)];
}

const SPECIAL = { "(ESC)": "(ESC)", "ESC": "ESC" };
export function prettyComponent(name) {
  const s = String(name).toLowerCase().replace(/(^|[\s/(])([a-z])/g, (m, a, b) => a + b.toUpperCase());
  return s.replace(/\(esc\)/i, "(ESC)").replace(/\bAnd\b/g, "and").replace(/\bOr\b/g, "or");
}

// What each NHTSA component group usually covers, in our words (for readers who
// don't know NHTSA's labels). Only groups that appear in the cache need an entry.
export const COMPONENT_NOTES = {
  "ENGINE": "the engine itself: stalling, oil use, knocking, failure",
  "ENGINE AND ENGINE COOLING": "engine and cooling parts: overheating, coolant leaks, water pumps",
  "POWER TRAIN": "transmission, axles and driveshafts: slipping, hesitation, harsh shifts",
  "STEERING": "steering column, rack and power steering: loss of assist, wander",
  "ELECTRICAL SYSTEM": "battery, wiring, alternator, lights on the dash, infotainment faults",
  "UNKNOWN OR OTHER": "owner did not pick a component group",
  "AIR BAGS": "air bag deployment, sensors and warning lights (including the Takata inflator recalls)",
  "SERVICE BRAKES": "the main brakes",
  "SERVICE BRAKES, HYDRAULIC": "the main hydraulic brakes: pedal feel, ABS, brake lines",
  "FUEL/PROPULSION SYSTEM": "fuel delivery and propulsion: fuel pumps, leaks, loss of power",
  "FUEL SYSTEM, GASOLINE": "gasoline fuel system: pumps, tanks, lines, leaks",
  "STRUCTURE": "body and frame: hood, doors, rust, mounts",
  "VEHICLE SPEED CONTROL": "throttle and cruise control: unintended acceleration or surging",
  "VISIBILITY/WIPER": "wipers, windshield and mirrors",
  "VISIBILITY": "windshield, mirrors, defrosters",
  "ELECTRONIC STABILITY CONTROL (ESC)": "stability control engaging or failing unexpectedly",
  "EXTERIOR LIGHTING": "headlights, tail lights, turn signals",
  "FORWARD COLLISION AVOIDANCE": "automatic emergency braking and collision warnings, including false braking",
  "SUSPENSION": "springs, struts, control arms",
  "WHEELS": "wheels, lug nuts, hubs",
  "SEAT BELTS": "belts, buckles and pretensioners",
  "SEATS": "seats and seat frames",
  "BACK OVER PREVENTION": "rear-view camera and rear sensors",
  "LATCHES/LOCKS/LINKAGES": "door and hood latches, locks",
  "TIRES": "tires",
  "LANE DEPARTURE": "lane-keeping assist and lane departure warning",
  "EQUIPMENT": "add-on equipment",
  "TRACTION CONTROL SYSTEM": "traction control",
  "PARKING BRAKE": "parking brake",
  "CHILD SEAT": "a child car seat used in the vehicle",
};
