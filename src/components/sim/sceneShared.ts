import { createContext, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export type VehicleKind = 'Haul Truck' | 'Bulldozer' | 'Excavator';

export interface VehicleStats {
  id: string;
  kind: VehicleKind;
  state: string;
  speedKmh: number;
  progress: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
}

// Live vehicle telemetry lives outside React state (it changes every animation frame) — the side
// panel polls it on a slow timer instead of triggering a React re-render 60x/second.
export const vehicleRegistry = new Map<string, VehicleStats>();

// While the mouse is pointer-locked (mouse-look active), the browser freezes clientX/clientY, so
// react-three-fiber's normal pointer-position raycasting can't tell what's under the (hidden)
// cursor. Vehicles register their root object here so a screen-center raycast can hit-test them
// instead — the crosshair overlay marks that same center point so aim matches what's clickable.
export const clickableObjects: THREE.Object3D[] = [];

export interface SelectionCtx { selectedId: string | null; select: (id: string) => void }
export const SelectionContext = createContext<SelectionCtx>({ selectedId: null, select: () => {} });

const MODEL_DIR = '/models/';
export const asset = (name: string) => encodeURI(MODEL_DIR + name);

export const MODELS = {
  dumpTruck: 'Dump truck.glb',
  bulldozer: 'Bulldozer.glb',
  crane: 'Crane by J-Toastie - gCcpjaxFdv.glb',
  coal: 'coal.glb',
  quarry: 'quarry_optimized.glb',
  trailer: 'Blocks Trailer Map by Danni Bittman - 6jGuvmwkDly.glb',
  lever: 'Lever by Quaternius - guR2QhKFLT.glb',
  speedometer: 'Speedometer by Poly by Google - 17WlSF6dD-r.glb',
  workerWalk: 'worker_walk.glb',
  workerWave: 'worker_wave.glb',
  workerRun: 'worker_run.glb',
  workerInteract: 'worker_interact.glb',
} as const;

Object.values(MODELS).forEach((name) => useGLTF.preload(asset(name)));

export function useNormalizedModel(name: string, targetSize: number, tint?: string) {
  const { scene } = useGLTF(asset(name));
  return useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (tint && mesh.material) {
          const material = (mesh.material as THREE.MeshStandardMaterial).clone();
          material.color = new THREE.Color(tint);
          mesh.material = material;
        }
      }
    });
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = targetSize / maxDim;
    clone.scale.setScalar(scale);
    const scaledBox = new THREE.Box3().setFromObject(clone);
    const center = new THREE.Vector3();
    scaledBox.getCenter(center);
    clone.position.set(-center.x, -scaledBox.min.y, -center.z);
    const wrapper = new THREE.Group();
    wrapper.add(clone);
    return wrapper;
  }, [scene, targetSize, tint]);
}

/** Registers a group as a clickable/followable vehicle. Call from an effect. */
export function registerClickable(obj: THREE.Object3D, id: string) {
  obj.userData.vehicleId = id;
  clickableObjects.push(obj);
  return () => {
    const index = clickableObjects.indexOf(obj);
    if (index !== -1) clickableObjects.splice(index, 1);
  };
}
