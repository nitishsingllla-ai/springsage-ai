import { Canvas, useFrame } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { REGIONS } from "@/lib/demo-data";
import { sampleTransect, type Transect, type TransectSample } from "@/lib/transect";

interface ViewerProps {
  transect: Transect;
  exaggeration: number;
  showGeology: boolean;
  showWater: boolean;
  animateFlow: boolean;
  resetKey: number;
  onSampleSelect?: (sample: TransectSample) => void;
}

const GEO_COLORS = ["#A79078", "#82768E", "#728B98", "#B29C55"];
const WATER = "#3999C6";
const SURFACE = "#3C7651";
const FRACTURE = "#C9564D";

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

function SurfaceRibbon({ points, onSampleSelect }: { points: ReturnType<typeof scaled>; onSampleSelect?: (sample: TransectSample) => void }) {
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
  return (
    <mesh geometry={geometry} receiveShadow castShadow onClick={(event) => {
      event.stopPropagation();
      if (!onSampleSelect) return;
      let best = points[0];
      for (const point of points) if (best && Math.abs(point.x - event.point.x) < Math.abs(best.x - event.point.x)) best = point;
      if (best) onSampleSelect(best);
    }}>
      <meshStandardMaterial color={SURFACE} roughness={0.82} metalness={0.02} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Strata({ points, names }: { points: ReturnType<typeof scaled>; names: string[] }) {
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

function FlowParticles({ points, active }: { points: ReturnType<typeof scaled>; active: boolean }) {
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

function CrossSectionScene(props: Omit<ViewerProps, "resetKey">) {
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
      <SurfaceRibbon points={points} onSampleSelect={props.onSampleSelect} />
      {props.showGeology && <Strata points={points} names={region.lithology} />}
      <Line points={surfaceLine} color="#10382D" lineWidth={2.2} />
      {props.showWater && <Line points={waterLine} color={WATER} lineWidth={3} dashed dashScale={8} dashSize={0.35} gapSize={0.2} />}
      {props.showGeology && [-5.8, -1.8, 2.5, 5.5].map((x, index) => (
        <mesh key={x} position={[x, 2.25, 1.48]} rotation-z={index % 2 ? -0.42 : 0.5}>
          <boxGeometry args={[0.055, 4.8, 0.035]} />
          <meshStandardMaterial color={FRACTURE} transparent opacity={0.78} />
        </mesh>
      ))}
      <FlowParticles points={points} active={props.animateFlow} />
      {end && <group position={[end.x, end.y, 0]}>
        <mesh rotation-x={Math.PI / 2}><torusGeometry args={[0.18, 0.055, 10, 24]} /><meshStandardMaterial color={WATER} /></mesh>
        <mesh position={[0.18, -0.12, 0]}><sphereGeometry args={[0.09, 12, 8]} /><meshStandardMaterial color={WATER} /></mesh>
      </group>}
      <gridHelper args={[24, 24, "#AEB9AC", "#D6DDD2"]} position={[0, 0, -1.35]} rotation-x={Math.PI / 2} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} target={[0, 2.1, 0]} minDistance={8} maxDistance={31} minPolarAngle={0.55} maxPolarAngle={Math.PI / 2.02} />
    </>
  );
}

export function CrossSectionViewer(props: ViewerProps) {
  return (
    <div className="h-full min-h-[430px] w-full overflow-hidden rounded-lg bg-muted" aria-label="Interactive 3D hydrogeological cross-section">
      <Canvas key={props.resetKey} shadows dpr={[1, 1.6]} camera={{ position: [13, 8.5, 14], fov: 43 }} gl={{ antialias: true }}>
        <CrossSectionScene {...props} />
      </Canvas>
    </div>
  );
}
