import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, Text, Stars, useGLTF, useProgress } from '@react-three/drei';
import * as THREE from 'three';

type Point = [number, number];
type VehicleState = 'MOVING' | 'LOADING' | 'UNLOADING';

const MODEL_DIR = '/models/';
const asset = (name: string) => encodeURI(MODEL_DIR + name);

const MODELS = {
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

// Single smooth haul-road loop threading every zone in order: pit -> corridor -> stockpile -> processing -> maintenance -> pit.
const ROUTE_WAYPOINTS: Point[] = [
  [-32, -18], [-18, -15], [-2, -9], [14, -4], [26, 4], [33, 14],
  [26, 20], [12, 20], [-4, 17], [-20, 19], [-31, 12], [-36, -4],
];
const ROUTE_CURVE = new THREE.CatmullRomCurve3(
  ROUTE_WAYPOINTS.map(([x, z]) => new THREE.Vector3(x, 0, z)),
  true,
  'catmullrom',
  0.55,
);

const PIT_CENTER: Point = [-26, -14];
const PIT_RADIUS = 10;
const STOCKPILE_CENTER: Point = [27, 15];
const STOCKPILE_RADIUS = 9;

const truckStarts = [0.02, 0.18, 0.34, 0.5, 0.66, 0.82];
const truckColors = ['#f4b41a', '#e8edf2', '#d85d39', '#f4b41a', '#7ba6b8', '#f4b41a'];

function useNormalizedModel(name: string, targetSize: number, tint?: string) {
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

function Model({ name, targetSize, tint }: { name: string; targetSize: number; tint?: string }) {
  const model = useNormalizedModel(name, targetSize, tint);
  return <primitive object={model} />;
}

function buildRoadGeometry(curve: THREE.CatmullRomCurve3, width: number, segments: number) {
  const points = curve.getSpacedPoints(segments);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const point = points[i];
    const tangent = curve.getTangentAt(t % 1);
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const left = point.clone().addScaledVector(normal, width / 2);
    const right = point.clone().addScaledVector(normal, -width / 2);
    positions.push(left.x, 0, left.z, right.x, 0, right.z);
    uvs.push(0, t * segments * 0.2, 1, t * segments * 0.2);
    if (i < segments) {
      const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
      indices.push(a, b, c, b, d, c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function HaulRoad() {
  const { roadGeometry, centerPoints, edgeLeft, edgeRight } = useMemo(() => {
    const segments = 160;
    const geometry = buildRoadGeometry(ROUTE_CURVE, 4.6, segments);
    const points = ROUTE_CURVE.getSpacedPoints(segments);
    const left: THREE.Vector3[] = [];
    const right: THREE.Vector3[] = [];
    points.forEach((point, i) => {
      const t = i / segments;
      const tangent = ROUTE_CURVE.getTangentAt(t % 1);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      left.push(point.clone().addScaledVector(normal, 2.35).setY(0.12));
      right.push(point.clone().addScaledVector(normal, -2.35).setY(0.12));
    });
    return { roadGeometry: geometry, centerPoints: points.map((p) => p.clone().setY(0.1)), edgeLeft: left, edgeRight: right };
  }, []);

  return (
    <group>
      <mesh geometry={roadGeometry} position={[0, 0.08, 0]} receiveShadow>
        <meshStandardMaterial color="#4a5450" roughness={0.95} />
      </mesh>
      <Line3D points={centerPoints} color="#f4c542" dashed />
      <Line3D points={edgeLeft} color="#8fa39c" opacity={0.65} />
      <Line3D points={edgeRight} color="#8fa39c" opacity={0.65} />
    </group>
  );
}

function Line3D({ points, color, opacity = 1, dashed = false }: { points: THREE.Vector3[]; color: string; opacity?: number; dashed?: boolean }) {
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
  const lineRef = useRef<THREE.Line>(null);
  useMemo(() => {
    if (dashed) geometry.computeBoundingBox();
  }, [dashed, geometry]);
  return (
    <primitive
      object={(() => {
        const material = dashed
          ? new THREE.LineDashedMaterial({ color, transparent: true, opacity, dashSize: 1.4, gapSize: 0.9 })
          : new THREE.LineBasicMaterial({ color, transparent: true, opacity });
        const line = new THREE.LineLoop(geometry, material);
        if (dashed) line.computeLineDistances();
        return line;
      })()}
      ref={lineRef}
    />
  );
}

function Ground() {
  const texture = useMemo(() => {
    const map = new THREE.TextureLoader().load(encodeURI('/textures/mining_ground.jpg'));
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(12, 8);
    map.anisotropy = 8;
    return map;
  }, []);
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[100, 68]} />
        <meshStandardMaterial map={texture} color="#525f57" roughness={0.98} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <planeGeometry args={[100, 68]} />
        <meshBasicMaterial color="#050d0f" transparent opacity={0.36} />
      </mesh>
      <gridHelper args={[100, 25, '#30413d', '#1c2a27']} position={[0, 0.03, 0]} />
    </>
  );
}

function Zone({ position, size, label, color = '#d89825' }: { position: Point; size: [number, number]; label: string; color?: string }) {
  return (
    <group position={[position[0], 0.2, position[1]]}>
      <mesh rotation-x={-Math.PI / 2}><planeGeometry args={size} /><meshBasicMaterial color={color} transparent opacity={0.08} /></mesh>
      <lineSegments rotation-x={-Math.PI / 2}><edgesGeometry args={[new THREE.PlaneGeometry(size[0], size[1])]} /><lineBasicMaterial color={color} transparent opacity={0.55} /></lineSegments>
      <Text position={[-size[0] / 2 + 1, 0.35, -size[1] / 2 + 1]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.7} color={color} anchorX="left" anchorY="top">{label}</Text>
    </group>
  );
}

function Truck({ id, start, color }: { id: string; start: number; color: string }) {
  const group = useRef<THREE.Group>(null);
  const [vehicleState, setVehicleState] = useState<VehicleState>('MOVING');
  const progress = useRef(start);
  useFrame((_, delta) => {
    const point = ROUTE_CURVE.getPointAt(progress.current % 1);
    const distPit = Math.hypot(point.x - PIT_CENTER[0], point.z - PIT_CENTER[1]);
    const distStockpile = Math.hypot(point.x - STOCKPILE_CENTER[0], point.z - STOCKPILE_CENTER[1]);
    const nextState: VehicleState = distPit < PIT_RADIUS ? 'LOADING' : distStockpile < STOCKPILE_RADIUS ? 'UNLOADING' : 'MOVING';
    const speedFactor = nextState === 'MOVING' ? 1 : 0.3;
    progress.current = (progress.current + delta * 0.0075 * speedFactor) % 1;
    if (nextState !== vehicleState) setVehicleState(nextState);
    const tangent = ROUTE_CURVE.getTangentAt(progress.current % 1);
    if (group.current) {
      group.current.position.set(point.x, 0, point.z);
      group.current.rotation.y = Math.atan2(tangent.x, tangent.z) + Math.PI;
    }
  });
  return (
    <group ref={group}>
      <Model name={MODELS.dumpTruck} targetSize={4.2} tint={color} />
      <pointLight position={[0, 1.4, -1.6]} color="#e9f4d1" intensity={1.1} distance={5} />
      <Text position={[0, 2.6, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.42} color={vehicleState === 'MOVING' ? '#c7d7c9' : '#f3a92b'}>{id} / {vehicleState}</Text>
    </group>
  );
}

function Bulldozer({ position, phase, label }: { position: Point; phase: number; label: string }) {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!group.current) return;
    const x = position[0] + Math.sin(state.clock.elapsedTime * 0.32 + phase) * 2.1;
    const z = position[1] + Math.cos(state.clock.elapsedTime * 0.25 + phase) * 1.3;
    group.current.position.set(x, 0, z);
    group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.32 + phase) > 0 ? 0.7 : -0.7;
  });
  return (
    <group ref={group}>
      <Model name={MODELS.bulldozer} targetSize={3.6} />
      <pointLight position={[0, 1.2, -0.8]} color="#ffeab0" intensity={1.2} distance={4} />
      <Text position={[0, 2.4, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.4} color="#f2b62e">{label} / WORKING</Text>
    </group>
  );
}

function Worker({ position, phase, label, variant = MODELS.workerWalk }: { position: Point; phase: number; label: string; variant?: string }) {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!group.current) return;
    const x = position[0] + Math.sin(state.clock.elapsedTime * 0.18 + phase) * 1.5;
    const z = position[1] + Math.cos(state.clock.elapsedTime * 0.22 + phase) * 1.1;
    group.current.position.set(x, 0, z);
  });
  return (
    <group ref={group}>
      <Model name={variant} targetSize={1.7} />
      <pointLight color="#ffb52e" intensity={0.35} distance={2.2} position={[0, 1.1, 0]} />
      <Text position={[0, 2.1, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.35} color="#c5d5d0">{label}</Text>
    </group>
  );
}

const SITE_BOUNDS = { minX: -42, maxX: 42, minZ: -27, maxZ: 27 };
const randRange = (min: number, max: number) => min + Math.random() * (max - min);
const roamVariants = [MODELS.workerWalk, MODELS.workerWalk, MODELS.workerWalk, MODELS.workerRun];
const pickVariant = () => roamVariants[Math.floor(Math.random() * roamVariants.length)];

function RoamingWorker() {
  const group = useRef<THREE.Group>(null);
  const variant = useMemo(() => pickVariant(), []);
  const speed = useMemo(() => randRange(1.4, 2.6), []);
  const pos = useRef(new THREE.Vector3(randRange(SITE_BOUNDS.minX, SITE_BOUNDS.maxX), 0, randRange(SITE_BOUNDS.minZ, SITE_BOUNDS.maxZ)));
  const target = useRef(new THREE.Vector3(randRange(SITE_BOUNDS.minX, SITE_BOUNDS.maxX), 0, randRange(SITE_BOUNDS.minZ, SITE_BOUNDS.maxZ)));
  const pauseUntil = useRef(0);
  useFrame((state, delta) => {
    if (!group.current) return;
    if (state.clock.elapsedTime < pauseUntil.current) return;
    const toTarget = target.current.clone().sub(pos.current);
    const dist = toTarget.length();
    if (dist < 0.7) {
      target.current.set(randRange(SITE_BOUNDS.minX, SITE_BOUNDS.maxX), 0, randRange(SITE_BOUNDS.minZ, SITE_BOUNDS.maxZ));
      pauseUntil.current = state.clock.elapsedTime + randRange(0.5, 3);
      return;
    }
    toTarget.normalize().multiplyScalar(Math.min(dist, speed * delta));
    pos.current.add(toTarget);
    group.current.position.set(pos.current.x, 0, pos.current.z);
    group.current.rotation.y = Math.atan2(toTarget.x, toTarget.z);
  });
  return (
    <group ref={group}>
      <Model name={variant} targetSize={1.6} />
    </group>
  );
}

const MIN_EYE_HEIGHT = 2.2;

function FreeFlyCamera() {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  useEffect(() => {
    camera.lookAt(0, 0, 0);
    const down = (event: KeyboardEvent) => { keys.current[event.code] = true; };
    const up = (event: KeyboardEvent) => { keys.current[event.code] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const move = useRef(new THREE.Vector3());
  useFrame((_, delta) => {
    const k = keys.current;
    const speed = (k['ShiftLeft'] || k['ShiftRight'] ? 34 : 16) * delta;

    // Minecraft-style: horizontal movement follows look YAW only, pitch (looking up/down) never tilts walk direction.
    forward.current.set(0, 0, -1).applyQuaternion(camera.quaternion).setY(0);
    if (forward.current.lengthSq() > 0.0001) forward.current.normalize();
    right.current.set(1, 0, 0).applyQuaternion(camera.quaternion).setY(0);
    if (right.current.lengthSq() > 0.0001) right.current.normalize();

    move.current.set(0, 0, 0);
    if (k['KeyW'] || k['ArrowUp']) move.current.add(forward.current);
    if (k['KeyS'] || k['ArrowDown']) move.current.sub(forward.current);
    if (k['KeyD'] || k['ArrowRight']) move.current.add(right.current);
    if (k['KeyA'] || k['ArrowLeft']) move.current.sub(right.current);
    if (move.current.lengthSq() > 0) move.current.normalize();
    if (k['Space']) move.current.setY(1);
    if (k['ControlLeft'] || k['KeyC']) move.current.setY(-1);
    move.current.multiplyScalar(speed);

    camera.position.add(move.current);
    camera.position.setY(Math.max(camera.position.y, MIN_EYE_HEIGHT));
  });
  return <PointerLockControls selector="#simulation-canvas-root" minPolarAngle={0.05} maxPolarAngle={Math.PI - 0.05} />;
}

function Crane({ position }: { position: Point }) {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => { if (group.current) group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.22) * 0.6; });
  return (
    <group position={[position[0], 0, position[1]]}>
      <group ref={group}><Model name={MODELS.crane} targetSize={11} /></group>
      <pointLight position={[0, 6.5, 0]} color="#ffd37a" intensity={2.3} distance={9} />
      <Text position={[0, 8.5, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.46} color="#f4b42a">CRANE / LIFT ACTIVE</Text>
    </group>
  );
}

function SiteProps() {
  return (
    <>
      <group position={[27, 0, 15]}>
        <Model name={MODELS.coal} targetSize={7} />
      </group>
      <group position={[32, 0, 18]}>
        <Model name={MODELS.coal} targetSize={4.5} />
      </group>
      <group position={[-30, 0, -12]}>
        <Model name={MODELS.coal} targetSize={5} />
      </group>

      {/* Decorative backdrop only — bounded, normalized single instance, not used as terrain. */}
      <group position={[-26, 0, -14]}>
        <Model name={MODELS.quarry} targetSize={30} />
      </group>

      <Crane position={[14, 17]} />
      <group position={[14, 0, 17]}><Model name={MODELS.trailer} targetSize={7} /></group>

      <group position={[-27, 0, 18]}><Model name={MODELS.trailer} targetSize={5.5} /></group>
      <group position={[-24, 0, 16]}><Model name={MODELS.lever} targetSize={1.8} /></group>
      <group position={[-22, 0.9, 15.4]} rotation-y={0.4}><Model name={MODELS.speedometer} targetSize={1.1} /></group>

      {Array.from({ length: 8 }, (_, index) => (
        <pointLight key={index} position={[-20 + index * 5.5, 3, -19]} color="#d99829" intensity={0.65} distance={4.5} />
      ))}
    </>
  );
}

function SimulationScene({ onContextLost }: { onContextLost: () => void }) {
  return (
    <>
      <color attach="background" args={['#071016']} />
      <fog attach="fog" args={['#071016', 48, 98]} />
      <ambientLight intensity={1.4} color="#a6bbc6" />
      <directionalLight position={[-20, 30, 10]} intensity={1.9} color="#b3c8d1" castShadow />
      <directionalLight position={[24, 18, -22]} intensity={0.5} color="#f0a562" />
      <hemisphereLight args={['#3a5560', '#0c1416', 0.55]} />
      <Stars radius={140} depth={40} count={2200} factor={2.4} fade speed={0.4} />
      <Ground />
      <HaulRoad />
      <Zone position={[-26, -14]} size={[18, 14]} label="01  OPEN PIT / EXCAVATION" color="#f0a51f" />
      <Zone position={[0, 0]} size={[48, 25]} label="02  HAUL CORRIDOR" color="#5c9db4" />
      <Zone position={[27, 15]} size={[17, 12]} label="03  STOCKPILE" color="#d69a23" />
      <Zone position={[13, 17]} size={[13, 9]} label="04  PROCESSING" color="#77a9a0" />
      <Zone position={[-28, 17]} size={[12, 8]} label="05  MAINTENANCE" color="#b77d32" />
      <SiteProps />
      {truckStarts.map((start, index) => (
        <Truck key={index} id={`TRK-0${index + 1}`} start={start} color={truckColors[index]} />
      ))}
      <Bulldozer position={[-26, -11]} phase={0} label="DZ-01" />
      <Bulldozer position={[25, 14]} phase={2.5} label="DZ-02" />
      <Worker position={[-22, -9]} phase={0.3} label="W-014" variant={MODELS.workerWalk} />
      <Worker position={[-28, 16]} phase={1.8} label="W-021" variant={MODELS.workerWave} />
      <Worker position={[10, 13]} phase={3.1} label="W-033" variant={MODELS.workerInteract} />
      <Worker position={[29, 11]} phase={4.6} label="W-041" variant={MODELS.workerRun} />
      {Array.from({ length: 12 }, (_, index) => <RoamingWorker key={index} />)}
      <FreeFlyCamera />
      <ContextWatcher onLost={onContextLost} />
    </>
  );
}

// Dozens of GLB instances + per-entity text labels can exhaust a weak/integrated GPU and drop the
// WebGL context, which otherwise leaves the canvas permanently blank with no feedback. Surface it.
function ContextWatcher({ onLost }: { onLost: () => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const handleLost = (event: Event) => {
      event.preventDefault();
      onLost();
    };
    canvas.addEventListener('webglcontextlost', handleLost);
    return () => canvas.removeEventListener('webglcontextlost', handleLost);
  }, [gl, onLost]);
  return null;
}

function SimulationLoader({ visible }: { visible: boolean }) {
  const { progress, item } = useProgress();
  return (
    <div className={`simulation-loader${visible ? '' : ' simulation-loader-hidden'}`} aria-hidden={!visible}>
      <div className="simulation-loader-panel">
        <div className="simulation-loader-spinner" />
        <div className="simulation-loader-title">Initializing Autonomous Ops Feed</div>
        <div className="simulation-loader-track"><div className="simulation-loader-fill" style={{ width: `${Math.min(100, progress)}%` }} /></div>
        <div className="simulation-loader-meta">{Math.round(progress)}%{item ? `  ·  loading ${item.split('/').pop()}` : ''}</div>
      </div>
    </div>
  );
}

export const SimulationView: React.FC = () => {
  const { active, progress } = useProgress();
  const [ready, setReady] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);
  const [contextLost, setContextLost] = useState(false);
  useEffect(() => {
    if (!ready && !active && progress >= 100) {
      const timeout = setTimeout(() => setReady(true), 300);
      return () => clearTimeout(timeout);
    }
  }, [active, progress, ready]);

  const handleContextLost = () => setContextLost(true);
  const handleRetry = () => {
    setContextLost(false);
    setReady(false);
    setCanvasKey((k) => k + 1);
  };

  return (
    <div className="simulation-view" id="simulation-canvas-root">
      <Canvas key={canvasKey} camera={{ position: [0, 55, 52], fov: 55 }} dpr={[1, 1.5]}>
        <Suspense fallback={null}>
          <SimulationScene onContextLost={handleContextLost} />
        </Suspense>
      </Canvas>
      {ready && !contextLost && (
        <>
          <div className="simulation-hud simulation-hud-top"><div><span className="simulation-live-dot" /> DEMO / AUTONOMOUS OPERATIONS</div><span className="simulation-clock">NIGHT SHIFT  ·  23:48:16</span></div>
          <div className="simulation-hud simulation-legend"><strong>SITE PULSE</strong><span><b className="status-green" /> 06 VEHICLES ACTIVE</span><span><b className="status-amber" /> 16 WORKERS IN FIELD</span><span><b className="status-blue" /> ROUTES ONLINE</span></div>
          <div className="simulation-zone-note"><span>LIVE MAP</span><strong>OPERATIONAL DENSITY 86%</strong><small>All sectors reporting · 22 entities moving</small></div>
          <div className="simulation-hud simulation-nav-hint">CLICK SCENE · MOUSE LOOK · WASD MOVE · SHIFT SPRINT · SPACE / CTRL UP-DOWN · ESC RELEASE</div>
        </>
      )}
      <SimulationLoader visible={!ready && !contextLost} />
      {contextLost && (
        <div className="simulation-loader">
          <div className="simulation-loader-panel">
            <div className="simulation-loader-title">3D view lost the graphics context</div>
            <div className="simulation-loader-meta">This usually means the GPU ran low on memory.</div>
            <button type="button" className="simulation-retry-btn" onClick={handleRetry}>Retry</button>
          </div>
        </div>
      )}
    </div>
  );
};
