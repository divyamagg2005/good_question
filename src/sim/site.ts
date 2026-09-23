// Site map for the IronSense simulation, in site-local metres. Origin (0,0) is the bottom-left
// corner of the site; x points east and y points north. The site is 400 m × 300 m.
//
// The 3D scene uses 1 scene unit = 2 m and centres the site on the scene origin. North (+y)
// runs toward scene -z, so the orbit/free camera's default view looks roughly north.

export type Vec2 = [number, number];

export const M_PER_UNIT = 2;
export const SITE_W = 400;
export const SITE_H = 300;

export const toScene = (xM: number, yM: number): Vec2 => [(xM - SITE_W / 2) / M_PER_UNIT, (SITE_H / 2 - yM) / M_PER_UNIT];
export const toSite = (sx: number, sz: number): Vec2 => [sx * M_PER_UNIT + SITE_W / 2, SITE_H / 2 - sz * M_PER_UNIT];

export interface SiteZone {
  zone_id: string;
  zone_type: string;
  polygon: Vec2[];
}

export interface SiteHazard {
  hazard_id: string;
  hazard_type: string;
  line: Vec2[];
  clearance_height_m?: number;
}

export const ZONES: SiteZone[] = [
  { zone_id: 'ZONE_B', zone_type: 'work_area', polygon: [[180, 60], [240, 60], [240, 100], [180, 100]] },
  { zone_id: 'LOAD_BAY', zone_type: 'loading_bay', polygon: [[236, 68], [256, 68], [256, 92], [236, 92]] },
  { zone_id: 'NOGO_1', zone_type: 'no_go_zone', polygon: [[320, 200], [360, 200], [360, 240], [320, 240]] },
];

export const HAZARDS: SiteHazard[] = [
  { hazard_id: 'PL01', hazard_type: 'overhead_power_line', line: [[160, 104], [300, 104]], clearance_height_m: 9.5 },
  { hazard_id: 'TR01', hazard_type: 'trench_edge', line: [[190, 88], [240, 88]] },
  { hazard_id: 'UG02', hazard_type: 'underground_utility_gas', line: [[214, 72], [250, 72]] },
  { hazard_id: 'SL01', hazard_type: 'slope', line: [[198, 62], [198, 78]] },
  { hazard_id: 'SP01', hazard_type: 'spoil_pile', line: [[222, 77], [222, 83]] },
];

// Where things sit on the site (metres).
export const MACHINE_HOME = { x: 232, y: 80, headingDeg: 0 };
export const TRUCK_BAY_SPOT: Vec2 = [241.5, 80];
export const SPOIL_PILE_CENTER: Vec2 = [224.5, 80];
export const TRENCH = { x0: 190, x1: 240, yEdge: 88, width: 3 };
export const SLOPE = { xStart: 212, xTop: 198, xEnd: 194, y0: 62, y1: 78, gradeDeg: 18 };
export const LANDMARKS = {
  gate: [200, 6] as Vec2,
  office: [168, 26] as Vec2,
  parking: [128, 26] as Vec2,
  fuelStation: [272, 30] as Vec2,
};

// Truck route: arrive from the east gate road, park in the loading bay heading north, leave north-east.
export const TRUCK_IN_PATH: Vec2[] = [[398, 40], [300, 40], [262, 48], [241.5, 60], TRUCK_BAY_SPOT];
export const TRUCK_OUT_PATH: Vec2[] = [TRUCK_BAY_SPOT, [241.5, 95], [262, 98], [310, 70], [398, 52]];

export function pointInPolygon([x, y]: Vec2, poly: Vec2[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Ground height (m) and slope grade at a site position. Only the SL01 ramp is not flat.
export function groundAt(x: number, y: number) {
  if (y < SLOPE.y0 || y > SLOPE.y1 || x > SLOPE.xStart || x < SLOPE.xEnd) return { height: 0, gradeDeg: 0 };
  const grade = Math.tan((SLOPE.gradeDeg * Math.PI) / 180);
  if (x >= SLOPE.xTop) return { height: (SLOPE.xStart - x) * grade, gradeDeg: SLOPE.gradeDeg };
  return { height: (SLOPE.xStart - SLOPE.xTop) * grade, gradeDeg: 0 };
}
