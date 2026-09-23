import { useContext, useEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { sim } from '../../sim/engine';
import { useLinkStore } from '../../sim/link';
import { HAZARDS, LANDMARKS, M_PER_UNIT, SLOPE, SPOIL_PILE_CENTER, TRENCH, ZONES, toScene, type SiteZone, type Vec2 } from '../../sim/site';
import { MODELS, SelectionContext, registerClickable, vehicleRegistry, type VehicleStats } from './sceneShared';
import { Model } from './Model';

// 3D rendering of the IronSense sim world: the controlled excavator EXC001, its NPCs and the
// site's zones and hazards. Everything here only *reads* the sim engine each frame.

const U = 1 / M_PER_UNIT; // metres -> scene units
const DEG = Math.PI / 180;
const damp = (delta: number, rate = 12) => 1 - Math.exp(-delta * rate);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
function lerpAngle(a: number, b: number, t: number) {
  const d = ((((b - a + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
  return a + d * t;
}

/** Drives the sim clock from the render loop. Mount before anything that reads the sim. */
export function SimDriver() {
  useFrame(() => sim.frame());
  return null;
}

function makeLine(points: THREE.Vector3[], color: string, opts: { dashed?: boolean; loop?: boolean; opacity?: number } = {}) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = opts.dashed
    ? new THREE.LineDashedMaterial({ color, dashSize: 0.7, gapSize: 0.45, transparent: true, opacity: opts.opacity ?? 1 })
    : new THREE.LineBasicMaterial({ color, transparent: true, opacity: opts.opacity ?? 1 });
  const line = opts.loop ? new THREE.LineLoop(geometry, material) : new THREE.Line(geometry, material);
  if (opts.dashed) line.computeLineDistances();
  return line;
}

const v3 = ([xm, ym]: Vec2, y: number) => {
  const [x, z] = toScene(xm, ym);
  return new THREE.Vector3(x, y, z);
};

// ------------------------------------------------------------------ excavator

const CAT_YELLOW = '#f2b01e';
const STEEL = '#2b2f31';

export function Excavator3D() {
  const root = useRef<THREE.Group>(null);
  const upper = useRef<THREE.Group>(null);
  const boom = useRef<THREE.Group>(null);
  const stick = useRef<THREE.Group>(null);
  const bucket = useRef<THREE.Group>(null);
  const load = useRef<THREE.Mesh>(null);
  const beacon = useRef<THREE.MeshStandardMaterial>(null);
  const display = useRef({ x: 0, y: 0, z: 0, heading: 0, swing: 0, bucket: 0.4, pitch: 0, roll: 0, init: false });
  const { selectedId, select } = useContext(SelectionContext);
  const isSelected = selectedId === 'EXC001';

  const statsRef = useRef<VehicleStats>({
    id: 'EXC001', kind: 'Excavator', state: 'IDLE', speedKmh: 0, progress: 0, position: new THREE.Vector3(), velocity: new THREE.Vector3(),
  });
  useEffect(() => {
    const stats = statsRef.current;
    vehicleRegistry.set('EXC001', stats);
    return () => { vehicleRegistry.delete('EXC001'); };
  }, []);
  useEffect(() => (root.current ? registerClickable(root.current, 'EXC001') : undefined), []);

  useFrame((state, delta) => {
    if (!root.current || !upper.current || !boom.current || !stick.current || !bucket.current) return;
    const e = sim.exc;
    const d = display.current;
    const [sx, sz] = toScene(e.x, e.y);
    const k = d.init ? damp(delta) : 1;
    d.init = true;
    const prevX = d.x;
    const prevZ = d.z;
    d.x += (sx - d.x) * k;
    d.z += (sz - d.z) * k;
    d.y += (e.height * U - d.y) * k;
    d.heading = lerpAngle(d.heading, e.headingDeg * DEG, k);
    d.swing = lerpAngle(d.swing, e.swingDeg * DEG, k);
    d.bucket += (e.bucketHeightM - d.bucket) * k;
    d.pitch += (e.pitchDeg * DEG - d.pitch) * k;
    d.roll += (e.rollDeg * DEG - d.roll) * k;

    root.current.position.set(d.x, d.y, d.z);
    root.current.rotation.set(d.pitch, -d.heading, -d.roll, 'YXZ');
    upper.current.rotation.y = -d.swing;

    // Arm pose that puts the bucket tip at the reported bucket height.
    const tip = d.bucket * U;
    const boomAngle = -0.15 + 0.85 * clamp((d.bucket + 2) / 6, 0, 1);
    const stickAbs = Math.asin(clamp((tip - 0.9 - 2.85 * Math.sin(boomAngle)) / 1.5, -1, 0.35));
    boom.current.rotation.x = boomAngle;
    stick.current.rotation.x = stickAbs - boomAngle;
    bucket.current.rotation.x = -stickAbs * 0.6 - 0.35;
    if (load.current) {
      load.current.visible = e.payloadKg > 40;
      load.current.scale.y = clamp(e.payloadKg / 1650, 0.05, 1.1);
    }
    if (beacon.current) {
      const moving = Math.abs(e.speedMs) > 0.05;
      beacon.current.emissiveIntensity = moving ? (Math.sin(state.clock.elapsedTime * 14) > 0 ? 3 : 0.2) : e.engineOn ? 0.6 : 0;
    }

    const stats = statsRef.current;
    stats.velocity.set(d.x - prevX, 0, d.z - prevZ);
    stats.position.set(d.x, d.y, d.z);
    stats.speedKmh = Math.abs(e.speedMs) * 3.6;
    stats.state = e.engineOn ? e.workMode.toUpperCase() : 'ENGINE OFF';
  });

  const onClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    select('EXC001');
  };

  return (
    <group ref={root} onClick={onClick}>
      {/* undercarriage */}
      <mesh position={[-0.62, 0.23, 0]}><boxGeometry args={[0.32, 0.46, 2.25]} /><meshStandardMaterial color={STEEL} roughness={0.9} /></mesh>
      <mesh position={[0.62, 0.23, 0]}><boxGeometry args={[0.32, 0.46, 2.25]} /><meshStandardMaterial color={STEEL} roughness={0.9} /></mesh>
      <mesh position={[0, 0.34, 0]}><boxGeometry args={[0.95, 0.28, 1.5]} /><meshStandardMaterial color="#3a3f42" /></mesh>

      <group ref={upper} position={[0, 0.5, 0]}>
        <mesh position={[0, 0.05, 0]}><cylinderGeometry args={[0.52, 0.52, 0.1, 24]} /><meshStandardMaterial color="#1f2224" /></mesh>
        {/* house + counterweight */}
        <mesh position={[0.12, 0.38, 0.22]}><boxGeometry args={[1.28, 0.56, 1.45]} /><meshStandardMaterial color={CAT_YELLOW} roughness={0.55} /></mesh>
        <mesh position={[0, 0.34, 0.98]}><boxGeometry args={[1.36, 0.5, 0.34]} /><meshStandardMaterial color="#d99a14" roughness={0.6} /></mesh>
        <mesh position={[0.28, 0.72, 0.5]}><boxGeometry args={[0.5, 0.14, 0.6]} /><meshStandardMaterial color="#2a2d2f" /></mesh>
        {/* cab */}
        <mesh position={[-0.4, 0.98, -0.34]}><boxGeometry args={[0.5, 0.78, 0.62]} /><meshStandardMaterial color={CAT_YELLOW} roughness={0.5} /></mesh>
        <mesh position={[-0.4, 1.04, -0.655]}><boxGeometry args={[0.44, 0.5, 0.02]} /><meshStandardMaterial color="#8fd0e6" emissive="#2d6f86" emissiveIntensity={0.6} transparent opacity={0.85} /></mesh>
        <mesh position={[-0.655, 1.04, -0.34]}><boxGeometry args={[0.02, 0.5, 0.5]} /><meshStandardMaterial color="#8fd0e6" emissive="#2d6f86" emissiveIntensity={0.4} transparent opacity={0.8} /></mesh>
        <mesh position={[-0.4, 1.42, -0.3]}>
          <cylinderGeometry args={[0.06, 0.06, 0.1, 12]} />
          <meshStandardMaterial ref={beacon} color="#ffb020" emissive="#ff9900" emissiveIntensity={0.6} />
        </mesh>
        {/* boom -> stick -> bucket */}
        <group ref={boom} position={[0.16, 0.55, -0.66]}>
          <mesh position={[0, 0, -1.42]}><boxGeometry args={[0.22, 0.26, 2.9]} /><meshStandardMaterial color={CAT_YELLOW} roughness={0.5} /></mesh>
          <group ref={stick} position={[0, 0, -2.85]}>
            <mesh position={[0, 0, -0.75]}><boxGeometry args={[0.17, 0.2, 1.55]} /><meshStandardMaterial color={CAT_YELLOW} roughness={0.5} /></mesh>
            <group ref={bucket} position={[0, 0, -1.5]}>
              <mesh position={[0, -0.12, -0.12]}><boxGeometry args={[0.55, 0.34, 0.36]} /><meshStandardMaterial color="#3d4144" metalness={0.4} roughness={0.5} /></mesh>
              <mesh ref={load} position={[0, 0.08, -0.12]}><boxGeometry args={[0.5, 0.22, 0.32]} /><meshStandardMaterial color="#6d5436" roughness={1} /></mesh>
            </group>
          </group>
        </group>
      </group>

      <pointLight position={[0, 2.2, 0]} color="#ffe2a8" intensity={1.4} distance={7} />
      <Text position={[0, 2.5, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.42} color={isSelected ? '#66e0ff' : '#f2b01e'}>
        EXC001 · CAT 320{isSelected ? ' ●' : ''}
      </Text>
    </group>
  );
}

// ------------------------------------------------------------------ danger / caution rings

export function SafetyRings() {
  const zones = useLinkStore((s) => s.assessment?.zones);
  const danger = (zones?.danger_radius_m ?? 5) * U;
  const caution = (zones?.caution_radius_m ?? 12) * U;
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!group.current) return;
    const e = sim.exc;
    const [x, z] = toScene(e.x, e.y);
    group.current.visible = sim.status === 'running';
    group.current.position.set(x, e.height * U + 0.07, z);
  });
  return (
    <group ref={group}>
      <mesh rotation-x={-Math.PI / 2}><circleGeometry args={[danger, 72]} /><meshBasicMaterial color="#ff3b3b" transparent opacity={0.1} depthWrite={false} /></mesh>
      <mesh rotation-x={-Math.PI / 2}><ringGeometry args={[danger - 0.08, danger, 72]} /><meshBasicMaterial color="#ff4545" transparent opacity={0.9} /></mesh>
      <mesh rotation-x={-Math.PI / 2}><ringGeometry args={[caution - 0.06, caution, 96]} /><meshBasicMaterial color="#f0b534" transparent opacity={0.7} /></mesh>
    </group>
  );
}

// ------------------------------------------------------------------ NPCs

function SimPerson({ index, id, role }: { index: number; id: string; role: string }) {
  const group = useRef<THREE.Group>(null);
  const display = useRef({ x: 0, z: 0, h: 0, init: false });
  useFrame((_, delta) => {
    const p = sim.people[index];
    if (!group.current || !p) return;
    const d = display.current;
    const [sx, sz] = toScene(p.x, p.y);
    const k = d.init ? damp(delta, 10) : 1;
    d.init = true;
    d.x += (sx - d.x) * k;
    d.z += (sz - d.z) * k;
    d.h = lerpAngle(d.h, p.headingDeg * DEG, k);
    group.current.position.set(d.x, 0, d.z);
    group.current.rotation.y = Math.PI - d.h;
  });
  return (
    <group ref={group}>
      <Model name={role === 'spotter' ? MODELS.workerWave : role === 'surveyor' ? MODELS.workerInteract : MODELS.workerWalk} targetSize={0.95} />
      <mesh rotation-x={-Math.PI / 2} position-y={0.04}><ringGeometry args={[0.45, 0.6, 24]} /><meshBasicMaterial color="#ff8a1f" transparent opacity={0.9} /></mesh>
      {/* Hi-vis marker so people stay visible from the overview camera. */}
      <mesh position-y={1.55} rotation-x={Math.PI}><coneGeometry args={[0.42, 0.75, 12]} /><meshBasicMaterial color="#ff8a1f" /></mesh>
      <Text position={[0, 2.35, 0]} fontSize={0.55} color="#ffb347" outlineWidth={0.03} outlineColor="#1a0f05">{id} · {role.toUpperCase()}</Text>
    </group>
  );
}

export function SimPeople() {
  const roster = useMemo(() => sim.people.map((p) => ({ id: p.id, role: p.role })), []);
  return <>{roster.map((p, i) => <SimPerson key={p.id} index={i} id={p.id} role={p.role} />)}</>;
}

export function SimTruck() {
  const group = useRef<THREE.Group>(null);
  const display = useRef({ x: 0, z: 0, h: 0, init: false, visible: false });
  const { selectedId, select } = useContext(SelectionContext);
  const statsRef = useRef<VehicleStats>({
    id: 'TRK02', kind: 'Haul Truck', state: 'LOADING', speedKmh: 0, progress: 0, position: new THREE.Vector3(), velocity: new THREE.Vector3(), progressLabel: 'Load',
  });
  useEffect(() => {
    const stats = statsRef.current;
    vehicleRegistry.set('TRK02', stats);
    return () => { vehicleRegistry.delete('TRK02'); };
  }, []);
  useEffect(() => (group.current ? registerClickable(group.current, 'TRK02') : undefined), []);
  useFrame((_, delta) => {
    const t = sim.truck;
    if (!group.current) return;
    const d = display.current;
    const [sx, sz] = toScene(t.x, t.y);
    // Snap (no smoothing) when the truck re-appears at the gate.
    const k = d.init && d.visible === t.visible ? damp(delta, 10) : 1;
    d.init = true;
    d.visible = t.visible;
    const prevX = d.x;
    const prevZ = d.z;
    d.x += (sx - d.x) * k;
    d.z += (sz - d.z) * k;
    d.h = lerpAngle(d.h, t.headingDeg * DEG, k);
    group.current.visible = t.visible;
    group.current.position.set(d.x, 0, d.z);
    group.current.rotation.y = -d.h;
    const stats = statsRef.current;
    stats.progress = Math.min(1, t.loadKg / 9000);
    if (!t.visible) {
      // Off-site between loads: keep the last on-site position so a follow camera doesn't fly into the void.
      stats.velocity.set(0, 0, 0);
      stats.speedKmh = 0;
      stats.state = 'OFF-SITE (HAULING)';
      return;
    }
    stats.velocity.set(d.x - prevX, 0, d.z - prevZ);
    stats.position.set(d.x, 0, d.z);
    stats.speedKmh = t.speedMs * 3.6;
    stats.state = t.state.toUpperCase();
  });
  const onClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    select('TRK02');
  };
  return (
    <group ref={group} onClick={onClick}>
      <Model name={MODELS.dumpTruck} targetSize={4.2} tint="#e7c23a" />
      <Text position={[0, 2.6, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.42} color={selectedId === 'TRK02' ? '#66e0ff' : '#c7d7c9'}>TRK02 · HAUL</Text>
    </group>
  );
}

// ------------------------------------------------------------------ site features

const ZONE_COLORS: Record<string, string> = { work_area: '#f0a51f', loading_bay: '#5cb4d6', no_go_zone: '#ff4b4b' };

function ZoneArea({ zone }: { zone: SiteZone }) {
  const color = ZONE_COLORS[zone.zone_type] ?? '#9fb3ad';
  const { shape, outline, label } = useMemo(() => {
    const pts = zone.polygon.map(([x, y]) => toScene(x, y));
    const s = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    const line = makeLine(pts.map(([x, z]) => new THREE.Vector3(x, 0.09, z)), color, { loop: true, dashed: zone.zone_type === 'no_go_zone', opacity: 0.8 });
    const minX = Math.min(...pts.map((p) => p[0]));
    const minZ = Math.min(...pts.map((p) => p[1]));
    return { shape: s, outline: line, label: [minX + 0.6, 0.3, minZ + 0.6] as [number, number, number] };
  }, [zone, color]);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={0.05}>
        <shapeGeometry args={[shape]} />
        <meshBasicMaterial color={color} transparent opacity={zone.zone_type === 'no_go_zone' ? 0.16 : 0.07} depthWrite={false} />
      </mesh>
      <primitive object={outline} />
      <Text position={label} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.8} color={color} anchorX="left" anchorY="top">
        {zone.zone_id} · {zone.zone_type.replace(/_/g, ' ').toUpperCase()}
      </Text>
    </group>
  );
}

function PowerLine() {
  const hazard = HAZARDS.find((h) => h.hazard_id === 'PL01')!;
  const clearance = (hazard.clearance_height_m ?? 9.5) * U;
  const { poles, wires, mid } = useMemo(() => {
    const [a, b] = hazard.line;
    const span = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const count = Math.max(2, Math.round(span / 35) + 1);
    const polePts: Vec2[] = Array.from({ length: count }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / (count - 1), a[1] + ((b[1] - a[1]) * i) / (count - 1)]);
    const top = clearance + 0.45;
    const wireObjs = [-0.55, 0, 0.55].map((offset) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i < polePts.length - 1; i += 1) {
        for (let s = 0; s <= 10; s += 1) {
          const t = s / 10;
          const p = v3([polePts[i][0] + (polePts[i + 1][0] - polePts[i][0]) * t, polePts[i][1] + (polePts[i + 1][1] - polePts[i][1]) * t], top - 0.45 * 4 * t * (1 - t));
          p.z += offset;
          pts.push(p);
        }
      }
      return makeLine(pts, '#c9d3d6', { opacity: 0.85 });
    });
    return { poles: polePts, wires: wireObjs, mid: v3([(a[0] + b[0]) / 2, a[1]], clearance + 1.1) };
  }, [hazard, clearance]);
  return (
    <group>
      {poles.map((p, i) => {
        const pos = v3(p, 0);
        return (
          <group key={i} position={pos}>
            <mesh position={[0, (clearance + 0.6) / 2, 0]}><cylinderGeometry args={[0.1, 0.14, clearance + 0.6, 10]} /><meshStandardMaterial color="#5b4a3a" /></mesh>
            <mesh position={[0, clearance + 0.45, 0]}><boxGeometry args={[0.12, 0.1, 1.5]} /><meshStandardMaterial color="#4a3c30" /></mesh>
          </group>
        );
      })}
      {wires.map((w, i) => <primitive key={i} object={w} />)}
      <Text position={mid} fontSize={0.55} color="#ff6b5b" outlineWidth={0.02} outlineColor="#1a0a08">⚡ PL01 · OVERHEAD POWER · {hazard.clearance_height_m} m CLEARANCE</Text>
    </group>
  );
}

function Trench() {
  const { edge, gas } = useMemo(() => {
    const trenchEdge = makeLine([v3([TRENCH.x0, TRENCH.yEdge], 0.1), v3([TRENCH.x1, TRENCH.yEdge], 0.1)], '#ff4b4b', { dashed: true });
    const ug = HAZARDS.find((h) => h.hazard_id === 'UG02')!;
    const gasLine = makeLine(ug.line.map((p) => v3(p, 0.08)), '#ffd23f', { dashed: true });
    return { edge: trenchEdge, gas: gasLine };
  }, []);
  const [cx, cz] = toScene((TRENCH.x0 + TRENCH.x1) / 2, TRENCH.yEdge + TRENCH.width / 2);
  const ug = HAZARDS.find((h) => h.hazard_id === 'UG02')!;
  const gasLabel = v3([(ug.line[0][0] + ug.line[1][0]) / 2, ug.line[0][1]], 0.2);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[cx, 0.045, cz]}>
        <planeGeometry args={[(TRENCH.x1 - TRENCH.x0) * U, TRENCH.width * U]} />
        <meshBasicMaterial color="#0a0604" />
      </mesh>
      {/* spoil lip along the far side of the trench */}
      <mesh position={[cx, 0.15, cz - TRENCH.width * U * 0.5 - 0.25]}>
        <boxGeometry args={[(TRENCH.x1 - TRENCH.x0) * U, 0.3, 0.45]} />
        <meshStandardMaterial color="#6b5033" roughness={1} />
      </mesh>
      <primitive object={edge} />
      <Text position={[cx - 6, 0.3, cz - 1.3]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.55} color="#ff6b5b">TR01 · TRENCH EDGE</Text>
      <primitive object={gas} />
      <Text position={gasLabel} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.5} color="#ffd23f">UG02 · BURIED GAS LINE</Text>
    </group>
  );
}

function SlopeRamp() {
  const geometry = useMemo(() => {
    const rise = (SLOPE.xStart - SLOPE.xTop) * Math.tan(SLOPE.gradeDeg * DEG) * U;
    const [xStart] = toScene(SLOPE.xStart, 0);
    const [xTop] = toScene(SLOPE.xTop, 0);
    const [xEnd] = toScene(SLOPE.xEnd, 0);
    const shape = new THREE.Shape();
    shape.moveTo(xStart, 0);
    shape.lineTo(xTop, rise);
    shape.lineTo(xEnd, rise);
    shape.lineTo(xEnd, 0);
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: (SLOPE.y1 - SLOPE.y0) * U, bevelEnabled: false });
  }, []);
  const [, zNorth] = toScene(0, SLOPE.y1);
  const [labelX, labelZ] = toScene(SLOPE.xTop + 4, (SLOPE.y0 + SLOPE.y1) / 2);
  return (
    <group>
      <mesh geometry={geometry} position={[0, 0, zNorth]}>
        <meshStandardMaterial color="#6e5b44" roughness={1} />
      </mesh>
      <Text position={[labelX, 2.1, labelZ]} fontSize={0.5} color="#f0b534" outlineWidth={0.02} outlineColor="#1a1208">SL01 · {SLOPE.gradeDeg}° SLOPE</Text>
    </group>
  );
}

const gate = toScene(...LANDMARKS.gate);
const office = toScene(...LANDMARKS.office);
const parking = toScene(...LANDMARKS.parking);
const fuel = toScene(...LANDMARKS.fuelStation);
const spoil = toScene(...SPOIL_PILE_CENTER);

function Landmarks() {
  const parkingLines = useMemo(
    () => Array.from({ length: 7 }, (_, i) => makeLine([new THREE.Vector3(parking[0] - 7 + i * 2.4, 0.06, parking[1] - 2.2), new THREE.Vector3(parking[0] - 7 + i * 2.4, 0.06, parking[1] + 2.2)], '#dfe7e4', { opacity: 0.6 })),
    [],
  );
  return (
    <group>
      {/* spoil pile SP01 */}
      <mesh position={[spoil[0] - 0.4, 0.55, spoil[1]]}><coneGeometry args={[1.7, 1.1, 18]} /><meshStandardMaterial color="#6b5033" roughness={1} /></mesh>
      <Text position={[spoil[0] - 0.4, 1.5, spoil[1]]} fontSize={0.38} color="#d9a45a">SP01 · SPOIL</Text>

      {/* gate */}
      <group position={[gate[0], 0, gate[1]]}>
        <mesh position={[-3, 0.8, 0]}><boxGeometry args={[0.3, 1.6, 0.3]} /><meshStandardMaterial color="#c9cfd1" /></mesh>
        <mesh position={[3, 0.8, 0]}><boxGeometry args={[0.3, 1.6, 0.3]} /><meshStandardMaterial color="#c9cfd1" /></mesh>
        <mesh position={[0, 1.3, 0]}><boxGeometry args={[6, 0.12, 0.12]} /><meshStandardMaterial color="#e34b3b" /></mesh>
        <Text position={[0, 2.2, 0]} fontSize={0.6} color="#dfe7e4">MAIN GATE</Text>
      </group>

      {/* site office */}
      <group position={[office[0], 0, office[1]]}>
        <mesh position={[0, 1, 0]}><boxGeometry args={[6, 2, 3]} /><meshStandardMaterial color="#e4e8e6" roughness={0.8} /></mesh>
        <mesh position={[0, 2.05, 0]}><boxGeometry args={[6.3, 0.12, 3.3]} /><meshStandardMaterial color="#3d6c80" /></mesh>
        <pointLight position={[0, 2.6, 2]} color="#fff2cc" intensity={1.2} distance={8} />
        <Text position={[0, 2.8, 0]} fontSize={0.6} color="#dfe7e4">SITE OFFICE</Text>
      </group>

      {/* parking */}
      {parkingLines.map((line, i) => <primitive key={i} object={line} />)}
      <Text position={[parking[0], 0.2, parking[1] + 3.2]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.6} color="#dfe7e4">PARKING</Text>

      {/* fuel station */}
      <group position={[fuel[0], 0, fuel[1]]}>
        <mesh position={[0, 2.2, 0]}><boxGeometry args={[5, 0.2, 3.4]} /><meshStandardMaterial color="#d8412f" /></mesh>
        <mesh position={[-2.2, 1.1, 0]}><boxGeometry args={[0.2, 2.2, 0.2]} /><meshStandardMaterial color="#d9dedf" /></mesh>
        <mesh position={[2.2, 1.1, 0]}><boxGeometry args={[0.2, 2.2, 0.2]} /><meshStandardMaterial color="#d9dedf" /></mesh>
        <mesh position={[0, 0.55, 0]}><boxGeometry args={[0.6, 1.1, 0.5]} /><meshStandardMaterial color="#f2b01e" /></mesh>
        <pointLight position={[0, 1.9, 0]} color="#ffe6b0" intensity={1.4} distance={7} />
        <Text position={[0, 3, 0]} fontSize={0.6} color="#ff8a6b">FUEL STATION</Text>
      </group>
    </group>
  );
}

export function SiteFeatures() {
  return (
    <group>
      {ZONES.map((zone) => <ZoneArea key={zone.zone_id} zone={zone} />)}
      <PowerLine />
      <Trench />
      <SlopeRamp />
      <Landmarks />
    </group>
  );
}

// ------------------------------------------------------------------ weather / light

const FOG_BY_WEATHER: Record<string, { near: number; far: number; color: string }> = {
  Sunny: { near: 60, far: 150, color: '#0b151b' },
  Cloudy: { near: 50, far: 130, color: '#0d161b' },
  Rainy: { near: 26, far: 90, color: '#0e171c' },
  Windy: { near: 50, far: 130, color: '#0d161b' },
  Storm: { near: 14, far: 62, color: '#0a1014' },
  Fog: { near: 4, far: 34, color: '#56626a' },
  'Extreme Heat': { near: 55, far: 140, color: '#1a1410' },
  Dust: { near: 8, far: 46, color: '#5a4630' },
};

const RAIN_COUNT = 2200;

export function WeatherFx() {
  const rain = useRef<THREE.Points>(null);
  const daylight = useRef<THREE.DirectionalLight>(null);
  const skyFill = useRef<THREE.AmbientLight>(null);
  const flash = useRef({ until: 0, next: 0 });
  const fogColor = useMemo(() => new THREE.Color(), []);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(RAIN_COUNT * 3);
    // Deterministic hash scatter (no Math.random in render) that doesn't line up into columns.
    const hash = (n: number) => {
      const x = Math.sin(n * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    };
    for (let i = 0; i < RAIN_COUNT; i += 1) {
      positions[i * 3] = hash(i + 0.1) * 60 - 30;
      positions[i * 3 + 1] = hash(i + 0.5) * 26;
      positions[i * 3 + 2] = hash(i + 0.9) * 60 - 30;
    }
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);

  useFrame((state, delta) => {
    const weather = sim.weather;
    const fog = state.scene.fog as THREE.Fog | null;
    const target = FOG_BY_WEATHER[weather] ?? FOG_BY_WEATHER.Sunny;
    const k = damp(delta, 1.5);
    if (fog) {
      fog.near += (target.near - fog.near) * k;
      fog.far += (target.far - fog.far) * k;
      fogColor.set(target.color);
      fog.color.lerp(fogColor, k);
      if (state.scene.background instanceof THREE.Color) state.scene.background.lerp(fogColor, k);
    }

    const light = sim.light;
    const clouds = weather === 'Storm' || weather === 'Rainy' || weather === 'Fog' ? 0.45 : weather === 'Cloudy' ? 0.7 : 1;
    const dayLevel = (light === 'day' ? 1 : light === 'dusk' ? 0.45 : 0) * clouds;
    if (daylight.current) daylight.current.intensity += (dayLevel * 1.3 - daylight.current.intensity) * k;
    if (skyFill.current) skyFill.current.intensity += (dayLevel * 0.9 - skyFill.current.intensity) * k;

    // Lightning flashes during a storm.
    const now = state.clock.elapsedTime;
    if (weather === 'Storm') {
      if (now > flash.current.next) {
        flash.current.until = now + 0.12;
        flash.current.next = now + 3 + Math.random() * 6;
      }
      if (skyFill.current && now < flash.current.until) skyFill.current.intensity = 4;
    }

    if (rain.current) {
      const raining = weather === 'Rainy' || weather === 'Storm';
      rain.current.visible = raining;
      if (raining) {
        const cam = state.camera.position;
        rain.current.position.set(cam.x, 0, cam.z);
        const pos = rain.current.geometry.attributes.position as THREE.BufferAttribute;
        const fall = (weather === 'Storm' ? 34 : 24) * delta;
        for (let i = 0; i < RAIN_COUNT; i += 1) {
          let y = pos.getY(i) - fall;
          if (y < 0) y += 26;
          pos.setY(i, y);
        }
        pos.needsUpdate = true;
      }
    }
  });

  return (
    <>
      <directionalLight ref={daylight} position={[30, 60, 20]} intensity={0} color="#fff4de" />
      <ambientLight ref={skyFill} intensity={0} color="#cfe0ea" />
      <points ref={rain} geometry={geometry} visible={false}>
        <pointsMaterial color="#b8d8ea" size={2} sizeAttenuation={false} transparent opacity={0.7} depthWrite={false} />
      </points>
    </>
  );
}

export function SimWorld() {
  return (
    <>
      <SimDriver />
      <SiteFeatures />
      <SafetyRings />
      <Excavator3D />
      <SimTruck />
      <SimPeople />
      <WeatherFx />
    </>
  );
}
