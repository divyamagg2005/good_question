export interface ShiftRecord {
  id: string;
  operatorId: string;
  operatorName: string;
  shiftDate: string;
  durationHrs: number;
  equipmentId: string;
  operationType: string;
  
  // Safety Metrics
  safetyViolations: number;
  safetyNearMisses: number;
  readinessAvg: number; // 0-100
  
  // Fuel Metrics
  fuelConsumedLiters: number;
  expectedFuelLiters: number;
  idleTimeRatio: number; // 0.0 - 1.0
  
  // Velocity Metrics
  completedCycles: number;
  actualCycleTimeAvg: number; // minutes
  targetCycleTime: number; // minutes
}

export interface ShiftScores {
  safetyScore: number;
  fuelScore: number;
  velocityScore: number;
  overallScore: number;
  isInsufficientData: boolean;
  safetyCapped: boolean; // if safety violations occurred, velocity shouldn't boost overall significantly
}

export interface RankedShift extends ShiftRecord {
  rank: number;
  scores: ShiftScores;
}

export function calculateShiftScores(shift: ShiftRecord): ShiftScores {
  // 1. Insufficient Data Check (e.g. less than 1 hour or < 2 cycles)
  if (shift.durationHrs < 1 || shift.completedCycles < 2) {
    return {
      safetyScore: 0,
      fuelScore: 0,
      velocityScore: 0,
      overallScore: 0,
      isInsufficientData: true,
      safetyCapped: false,
    };
  }

  // 2. Safety Score (50% Weight)
  let safetyScore = shift.readinessAvg;
  const safetyPenalty = (shift.safetyViolations * 25) + (shift.safetyNearMisses * 10);
  safetyScore = Math.max(0, safetyScore - safetyPenalty);
  const safetyCapped = shift.safetyViolations > 0;

  // 3. Fuel Score (30% Weight)
  // Ratio of expected vs actual fuel. (e.g. expected 100, actual 80 = 1.25 efficiency)
  const fuelEfficiencyRatio = shift.expectedFuelLiters / (shift.fuelConsumedLiters || 1);
  const cappedFuelRatio = Math.min(1.2, fuelEfficiencyRatio); // Don't reward absurdly low fuel usage
  const idlePenalty = shift.idleTimeRatio > 0.2 ? (shift.idleTimeRatio - 0.2) * 50 : 0;
  const fuelScore = Math.min(100, Math.max(0, (cappedFuelRatio * 100) - idlePenalty));

  // 4. Velocity Score (20% Weight)
  // Ratio of target vs actual cycle. (e.g. target 5, actual 4 = 1.25 efficiency)
  const speedRatio = shift.targetCycleTime / (shift.actualCycleTimeAvg || 1);
  // Cap speed ratio at 1.1 (110%) to discourage unsafe rushing.
  // If safetyCapped is true (violations occurred), cap speed ratio at 1.0 (no bonus for rushing)
  const maxSpeedRatio = safetyCapped ? 1.0 : 1.1;
  const cappedSpeedRatio = Math.min(maxSpeedRatio, speedRatio);
  const velocityScore = Math.min(100, Math.max(0, cappedSpeedRatio * 100));

  // 5. Overall Score
  const overallScore = (safetyScore * 0.5) + (fuelScore * 0.3) + (velocityScore * 0.2);

  return {
    safetyScore: Math.round(safetyScore * 10) / 10,
    fuelScore: Math.round(fuelScore * 10) / 10,
    velocityScore: Math.round(velocityScore * 10) / 10,
    overallScore: Math.round(overallScore * 10) / 10,
    isInsufficientData: false,
    safetyCapped,
  };
}

export function rankShifts(shifts: ShiftRecord[]): RankedShift[] {
  const scoredShifts = shifts.map(shift => ({
    ...shift,
    scores: calculateShiftScores(shift)
  }));

  // Filter out insufficient data for ranking
  const validShifts = scoredShifts.filter(s => !s.scores.isInsufficientData);
  const invalidShifts = scoredShifts.filter(s => s.scores.isInsufficientData);

  // Sort by Overall > Safety > Fuel
  validShifts.sort((a, b) => {
    if (b.scores.overallScore !== a.scores.overallScore) {
      return b.scores.overallScore - a.scores.overallScore;
    }
    if (b.scores.safetyScore !== a.scores.safetyScore) {
      return b.scores.safetyScore - a.scores.safetyScore;
    }
    return b.scores.fuelScore - a.scores.fuelScore;
  });

  // Assign ranks
  const rankedValid = validShifts.map((shift, index) => ({
    ...shift,
    rank: index + 1
  }));

  const rankedInvalid = invalidShifts.map(shift => ({
    ...shift,
    rank: -1
  }));

  return [...rankedValid, ...rankedInvalid];
}
