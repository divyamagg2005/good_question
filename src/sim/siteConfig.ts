// Single source for identity and operating limits, shared by the sim (what it sends to the
// backend) and the dashboard (what it displays). Change a value here and both stay in sync.

export const MACHINE = {
  id: 'EXC001',
  model: 'CAT 320',
  type: 'excavator',
  ageYears: 4,
} as const;

export const OPERATOR = {
  id: 'OP1001',
  // Display label only; the backend identifies the operator by id and has no name field.
  displayName: 'Site Operator',
  // Sent in shift_context. The dashboard prefers the backend profile's computed level when loaded.
  skillLevel: 'Intermediate',
} as const;

export const SITE_ID = 'SITE01';

// Realistic ranges for a ~20 t excavator (spec section 7). Used by the sim to generate values
// and by the dashboard to colour gauges; the backend decides what is actually an alert.
export const LIMITS = {
  rpmIdle: [800, 1000] as const,
  rpmWorking: [1500, 1900] as const,
  rpmOverRev: 2100,
  groundSpeedMaxKmh: 5.5,
  groundSpeedSiteMaxKmh: 6,
  tiltWarningDeg: 15,
  coolantHighC: 105,
  hydOilHighC: 95,
  swingFastDps: 55,
  payloadMaxKg: 2000,
  cabHeatStressC: 35,
  fuelLowPct: 20,
  hydPressureMaxBar: 350,
  bucketTravelMaxM: 2.5,
  // Sensor ranges: proximity is reported within 20 m, or 35 m in Storm/Fog/night.
  proximityRangeM: 20,
  proximityRangeLowVisM: 35,
} as const;

// The backend's default danger/caution radii before any weather adjustment (seen on the cab
// socket). Only used as a fallback until the first assessment arrives.
export const DEFAULT_ZONES = { dangerM: 5, cautionM: 12 } as const;

export const BAR_TO_PSI = 14.5038;
