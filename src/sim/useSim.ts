import { useSyncExternalStore } from 'react';
import { sim, type SimSnapshot } from './engine';

/** Throttled (~5 Hz) React view of the sim engine. The 3D scene reads `sim` directly per frame. */
export function useSim(): SimSnapshot {
  return useSyncExternalStore(sim.subscribe, sim.getSnapshot);
}
