import { describe, it, expect } from 'vitest';
import { calculateShiftScores, rankShifts } from './scoring';
import type { ShiftRecord } from './scoring';

describe('Shift Scoring System', () => {
  const baseShift: ShiftRecord = {
    id: '1',
    operatorId: 'OP-001',
    operatorName: 'John Doe',
    shiftDate: '2026-09-23',
    durationHrs: 8,
    equipmentId: 'EXC-842',
    operationType: 'Trenching',
    safetyViolations: 0,
    safetyNearMisses: 0,
    readinessAvg: 95,
    fuelConsumedLiters: 100,
    expectedFuelLiters: 100,
    idleTimeRatio: 0.15,
    completedCycles: 40,
    actualCycleTimeAvg: 10,
    targetCycleTime: 10,
  };

  it('calculates perfect baseline scores correctly', () => {
    const scores = calculateShiftScores(baseShift);
    expect(scores.safetyScore).toBe(95); // (0.5 * 95) = 47.5
    expect(scores.fuelScore).toBe(100); // 1.0 ratio = 100 (0.3 * 100) = 30
    expect(scores.velocityScore).toBe(100); // 1.0 ratio = 100 (0.2 * 100) = 20
    expect(scores.overallScore).toBe(97.5); // 47.5 + 30 + 20 = 97.5
    expect(scores.isInsufficientData).toBe(false);
  });

  it('applies penalties for safety violations and caps velocity', () => {
    const unsafeShift = { ...baseShift, safetyViolations: 1, actualCycleTimeAvg: 5, targetCycleTime: 10 };
    const scores = calculateShiftScores(unsafeShift);
    expect(scores.safetyScore).toBe(70); // 95 - 25
    expect(scores.velocityScore).toBe(100); // capped at 1.0 ratio despite 2x speed
    expect(scores.safetyCapped).toBe(true);
    expect(scores.overallScore).toBe(35 + 30 + 20); // 85
  });

  it('handles insufficient data threshold', () => {
    const shortShift = { ...baseShift, durationHrs: 0.5 };
    const scores = calculateShiftScores(shortShift);
    expect(scores.isInsufficientData).toBe(true);
    expect(scores.overallScore).toBe(0);
  });

  it('ranks shifts deterministically with tie-breakers', () => {
    const shift1 = { ...baseShift, id: '1', readinessAvg: 90, fuelConsumedLiters: 100 }; // overall: 45 + 30 + 20 = 95
    const shift2 = { ...baseShift, id: '2', readinessAvg: 80, fuelConsumedLiters: 80 }; // overall: 40 + 30 + 20 = 90
    // shift3 ties shift1 on overall, but has higher safety
    const shift3 = { ...baseShift, id: '3', readinessAvg: 92, fuelConsumedLiters: 105 }; // safety: 92 (46). fuel: 100/105=95.2 (28.56). total = 46+28.56+20 = 94.56

    const ranked = rankShifts([shift2, shift3, shift1]);
    expect(ranked[0].id).toBe('1');
    expect(ranked[1].id).toBe('3');
    expect(ranked[2].id).toBe('2');
  });
});
