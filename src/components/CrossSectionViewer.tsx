import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { REGIONS } from "@/lib/demo-data";
import { sampleTransect, type Transect, type TransectSample } from "@/lib/transect";

export interface ViewerApi {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
}

interface ViewerProps {
  transect: Transect;
  exaggeration: number;
  showGeology: boolean;
  showWater: boolean;
  showFractures: boolean;
  animateFlow: boolean;
  spin?: boolean;
  selectedSample?: TransectSample | null;
  hoverSample?: TransectSample | null;
  apiRef?: (api: ViewerApi) => void;
  onSampleSelect?: (sample: TransectSample) => void;
  onSampleHover?: (sample: TransectSample | null) => void;
}

const GEO_COLORS = ["#A79078", "#82768E", "#728B98", "#B29C55"];
const WATER = "#3999C6";
const SURFACE = "#3C7651";
const FRACTURE = "#C9564D";

type Scaled = ReturnType<typeof scaled>[number];

function scaled(samples: TransectSample[], exaggeration: number) {
  const min = Math.min(...samples.map((item) => item.waterTable)) - 155;
  const max = Math.max(...samples.map((item) => item.elevation));
  const relief = Math.max(1, max - min);
  return samples.map((item) => ({
    ...item,
    x: (item.distanceKm / Math.max(0.01, samples[samples.length - 1]?.distanceKm ?? 1)) * 18 - 9,
    y: ((item.elevation - min) / relief) * 6 * exaggeration,
    waterY: ((item.waterTable - min) / relief) * 6 * exaggeration,
    baseY: ((item.elevation - min - 140) / relief) * 6 * exaggeration,
  }));
}

function nearestTo(points: Scaled[], distanceKm: number) {
  return points.reduce((best, pt) =>
    Math.abs(pt.distanceKm - distanceKm) < Math.abs(best.distanceKm - distanceKm) ? pt : best, points[0]);
}

function SurfaceRibbon({ points, onSampleSelect, onSampleHover }: {
  points: Scaled[];
  onSampleSelect: ((sample: TransectSample) => void) | undefined;
  onSampleHover: ((sample: TransectSample | null) => void) | undefined;
}) {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const indices: number[] = [];
    const half = 1.35;
    points.forEach((point) => positions.push(point.x, point.y, -half, point.x, point.y, half));
    for (let i = 0; i < points.length - 1; i++) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [points]);
  const pick = (event: { point: { x: number } }) => {
    let best = points[0];
    for (const point of points) if (best && Math.abs(point.x - event.point.x) < Math.abs(best.x - event.point.x)) best = point;
    return best;
  };
  return (
    <mesh geometry={geometry} receiveShadow castShadow
      onClick={(event) => { event.stopPropagation(); if (onSampleSelect) onSampleSelect(pick(event)); }}
      onPointerMove={(event) => { if (onSampleHover) onSampleHover(pick(event)); }}
      onPointerOut={() => { if (onSampleHover) onSampleHover(null); }}>
      <meshStandardMaterial color={SURFACE} roughness={0.82} metalness={0.02} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Strata({ points, names }: { points: Scaled[]; names: string[] }) {
  const layers = useMemo(() => [0.18, 0.38, 0.62, 0.86].map((fraction, layer) => {
    const shape = new THREE.Shape();
    const topOffset = layer * 0.82 + 0.14;
    const lowerOffset = topOffset + 0.84 + fraction * 0.2;
    points.forEach((point, index) => {
      const y = point.y - topOffset - Math.sin((index / points.length) * Math.PI * (layer + 1)) * 0.12;
      if (index === 0) shape.moveTo(point.x, y); else shape.lineTo(point.x, y);
    });
    [...points].reverse().forEach((point, reverseIndex) => {
      const index = points.length - 1 - reverseIndex;
      const y = point.y - lowerOffset - Math.sin((index / points.length) * Math.PI * (layer + 1)) * 0.1;
      shape.lineTo(point.x, y);
    });
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }), [points]);
  return <group position-z={1.39}>{layers.map((geometry, index) => (
    <mesh key={names[index] ?? index} geometry={geometry}>
      <meshStandardMaterial color={GEO_COLORS[index]} roughness={0.95} side={THREE.DoubleSide} />
    </mesh>
  ))}</group>;
}

function FlowParticles({ points, active }: { points: Scaled[]; active: boolean }) {
  const refs = useRef<Array<THREE.Mesh | null>>([]);
  const curves = useMemo(() => [0.1, 0.28, 0.46, 0.64].map((start, index) => {
    const startIndex = Math.floor((points.length - 1) * start);
    const midIndex = Math.min(points.length - 1, startIndex + Math.floor(points.length * 0.25));
    const end = points[points.length - 1];
    const a = points[startIndex];
    const m = points[midIndex];
    if (!a || !m || !end) return new THREE.CatmullRomCurve3([]);
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(a.x, a.y - 0.1, 0.25 - index * 0.16),
      new THREE.Vector3(m.x, m.waterY + 0.15, 0.18 - index * 0.14),
      new THREE.Vector3(end.x - 0.4, end.waterY, 0.1 - index * 0.12),
      new THREE.Vector3(end.x, end.y - 0.08, 0),
    ]);
  }), [points]);
  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    if (!active || delta <= 0) return;
    refs.current.forEach((mesh, index) => {
      if (!mesh) return;
      const t = (clock.elapsedTime * (0.055 + index * 0.009) + index * 0.21) % 1;
      mesh.position.copy(curves[index].getPoint(t));
    });
  });
  return <>{curves.map((curve, index) => (
    <group key={index}>
      <Line points={curve.getPoints(42)} color={WATER} lineWidth={1.4} transparent opacity={0.4} />
      <mesh ref={(node) => { refs.current[index] = node; }}>
        <sphereGeometry args={[0.075, 12, 8]} />
        <meshStandardMaterial color={WATER} emissive={WATER} emissiveIntensity={0.35} />
      </mesh>
    </group>
  ))}</>;
}

function SampleMarker({ points, sample, tone }: { points: Scaled[]; sample: TransectSample; tone: "selected" | "hover" }) {
  const point = useMemo(() => nearestTo(points, sample.distanceKm), [points, sample.distanceKm]);
  if (!point) return null;
  const color = tone === "selected" ? FRACTURE : WATER;
  const depth = tone === "selected" ? 2.6 : 1.7;
  return (
    <group position={[point.x, point.y + 0.04, 1.45]}>
      <Line points={[[0, 0, 0], [0, -depth, 0]]} color={color} lineWidth={tone === "selected" ? 2 : 1.4} transparent opacity={tone === "selected" ? 0.85 : 0.5} />
      <Line points={[[point.x * 0 + -0.09, -depth, 0], [0.09, -depth, 0]]} color={color} lineWidth={2} transparent opacity={0.8} />
      <mesh>
        <sphereGeometry args={[tone === "selected" ? 0.11 : 0.07, 14, 10]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} />
      </mesh>
    </group>
  );
}

function RidgeSpringMarks({ points }: { points: Scaled[] }) {
  const start = points[0];
  const end = points[points.length - 1];
  if (!start || !end) return null;
  const mark = (point: Scaled, color: string, label: string) => (
    <group key={label} position={[point.x, point.y + 0.05, 1.44]}>
      <mesh>
        <cylinderGeometry args={[0.02, 0.02, 0.65, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position-y={0.4}>
        <coneGeometry args={[0.09, 0.26, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
  return <>{mark(start, "#10382D", "ridge")}{end && mark(end, WATER, "spring")}</>;
}

function Controls({ spin, apiRef }: { spin: boolean; apiRef?: (api: ViewerApi) => void }) {
  const controlsRef = useRef<any>(null);
  const camera = useThree((state) => state.camera);
  useEffect(() => {
    const c = controlsRef.current;
    if (!c || !apiRef) return;
    c.saveState();
    const zoom = (factor: number) => {
      const dir = camera.position.clone().sub(c.target);
      const dist = THREE.MathUtils.clamp(dir.length() * factor, c.minDistance, c.maxDistance);
      camera.position.copy(c.target.clone().add(dir.setLength(dist)));
      c.update();
    };
    apiRef({
      zoomIn: () => zoom(0.82),
      zoomOut: () => zoom(1.22),
      reset: () => c.reset(),
    });
  }, [apiRef, camera]);
  return (
    <OrbitControls ref={controlsRef} makeDefault enableDamping dampingFactor={0.08} target={[0, 2.1, 0]}
      minDistance={8} maxDistance={31} minPolarAngle={0.55} maxPolarAngle={Math.PI / 2.02}
      autoRotate={spin} autoRotateSpeed={0.8} />
  );
}

function CrossSectionScene(props: ViewerProps) {
  const samples = useMemo(() => sampleTransect(props.transect), [props.transect]);
  const points = useMemo(() => scaled(samples, props.exaggeration), [samples, props.exaggeration]);
  const region = REGIONS[props.transect.regionId];
  const surfaceLine = points.map((point) => [point.x, point.y + 0.035, 1.42] as [number, number, number]);
  const waterLine = points.map((point) => [point.x, point.waterY, 1.45] as [number, number, number]);
  const end = points[points.length - 1];
  return (
    <>
      <color attach="background" args={["#EEF1EA"]} />
      <fog attach="fog" args={["#EEF1EA", 24, 42]} />
      <hemisphereLight args={["#DDEAF0", "#8A7966", 1.45]} />
      <directionalLight position={[-7, 12, 8]} intensity={2.2} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <SurfaceRibbon points={points} onSampleSelect={props.onSampleSelect} onSampleHover={props.onSampleHover} />
      {props.showGeology && <Strata points={points} names={region.lithology} />}
      <Line points={surfaceLine} color="#10382D" lineWidth={2.2} />
      {props.showWater && <Line points={waterLine} color={WATER} lineWidth={3} dashed dashScale={8} dashSize={0.35} gapSize={0.2} />}
      {props.showFractures && [-5.8, -1.8, 2.5, 5.5].map((x, index) => (
        <mesh key={x} position={[x, 2.25, 1.48]} rotation-z={index % 2 ? -0.42 : 0.5}>
          <boxGeometry args={[0.055, 4.8, 0.035]} />
          <meshStandardMaterial color={FRACTURE} transparent opacity={0.78} />
        </mesh>
      ))}
      <FlowParticles points={points} active={props.animateFlow} />
      {props.hoverSample && <SampleMarker points={points} sample={props.hoverSample} tone="hover" />}
      {props.selectedSample && <SampleMarker points={points} sample={props.selectedSample} tone="selected" />}
      <RidgeSpringMarks points={points} />
      {end && <group position={[end.x, end.y, 0]}>
        <mesh rotation-x={Math.PI / 2}><torusGeometry args={[0.18, 0.055, 10, 24]} /><meshStandardMaterial color={WATER} /></mesh>
        <mesh position={[0.18, -0.12, 0]}><sphereGeometry args={[0.09, 12, 8]} /><meshStandardMaterial color={WATER} /></mesh>
      </group>}
      <gridHelper args={[24, 24, "#AEB9AC", "#D6DDD2"]} position={[0, 0, -1.35]} rotation-x={Math.PI / 2} />
      <Controls spin={props.spin ?? false} apiRef={props.apiRef} />
    </>
  );
}

export function CrossSectionViewer(props: ViewerProps) {
  return (
    <div className="h-full min-h-[430px] w-full overflow-hidden rounded-lg bg-muted" aria-label="Interactive 3D hydrogeological cross-section">
      <Canvas shadows dpr={[1, 1.6]} camera={{ position: [13, 8.5, 14], fov: 43 }} gl={{ antialias: true }}>
        <CrossSectionScene {...props} />
      </Canvas>
    </div>
  );
}
