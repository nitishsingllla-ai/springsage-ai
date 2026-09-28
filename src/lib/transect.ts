import { REGIONS, getGrid, getSprings, terrain, type LatLng, type RegionId } from "./demo-data";

export interface Transect {
  regionId: RegionId;
  start: LatLng;
  end: LatLng;
  springId?: string;
  source: "representative" | "drawn" | "spring";
}

export interface TransectSample {
  distanceKm: number;
  lat: number;
  lng: number;
  elevation: number;
  waterTable: number;
  slopeDeg: number;
  recharge: number;
}

const EARTH_KM = 6371;

export function haversineKm(a: LatLng, b: LatLng) {
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}

function nearestRecharge(regionId: RegionId, lat: number, lng: number) {
  let best = getGrid(regionId)[0];
  let bestD = Number.POSITIVE_INFINITY;
  for (const cell of getGrid(regionId)) {
    const d = (cell.lat - lat) ** 2 + (cell.lng - lng) ** 2;
    if (d < bestD) { bestD = d; best = cell; }
  }
  return best ? (best.f.lineament + best.f.soil + best.f.rainfall) / 3 : 0.5;
}

export function representativeTransect(regionId: RegionId, springId?: string): Transect {
  const region = REGIONS[regionId];
  const springs = getSprings(regionId);
  const spring = springs.find((item) => item.id === springId) ?? springs.find((item) => item.status === "critical") ?? springs[0];
  const end: LatLng = spring ? [spring.lat, spring.lng] : region.center;
  let start: LatLng = [region.center[0] + region.span * 0.72, region.center[1] + region.span * 0.48];
  let top = -1;
  for (let i = 0; i < 48; i++) {
    const angle = (i / 48) * Math.PI * 2;
    const candidate: LatLng = [
      end[0] + Math.sin(angle) * region.span * 0.72,
      end[1] + Math.cos(angle) * region.span * 0.78,
    ];
    const height = terrain(region, candidate[0], candidate[1]);
    if (height > top) { top = height; start = candidate; }
  }
  return { regionId, start, end, springId: spring?.id, source: springId ? "spring" : "representative" };
}

export function sampleTransect(transect: Transect, count = 81): TransectSample[] {
  const region = REGIONS[transect.regionId];
  const total = haversineKm(transect.start, transect.end);
  const elevations: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const lat = transect.start[0] + (transect.end[0] - transect.start[0]) * t;
    const lng = transect.start[1] + (transect.end[1] - transect.start[1]) * t;
    const normalized = terrain(region, lat, lng);
    elevations.push(region.elevationRange[0] + normalized * (region.elevationRange[1] - region.elevationRange[0]));
  }
  return elevations.map((elevation, i) => {
    const t = i / (count - 1);
    const lat = transect.start[0] + (transect.end[0] - transect.start[0]) * t;
    const lng = transect.start[1] + (transect.end[1] - transect.start[1]) * t;
    const prev = elevations[Math.max(0, i - 1)];
    const next = elevations[Math.min(count - 1, i + 1)];
    const runM = Math.max(1, (total * 1000 * (Math.min(count - 1, i + 1) - Math.max(0, i - 1))) / (count - 1));
    const slopeDeg = (Math.atan2(next - prev, runM) * 180) / Math.PI;
    const recharge = nearestRecharge(transect.regionId, lat, lng);
    const depth = 30 + 48 * t + 16 * Math.sin(t * Math.PI) + (1 - recharge) * 18;
    return { distanceKm: total * t, lat, lng, elevation, waterTable: elevation - depth, slopeDeg, recharge };
  });
}

export function transectMetrics(transect: Transect, samples = sampleTransect(transect)) {
  const elevations = samples.map((item) => item.elevation);
  const ridge = Math.max(...elevations);
  const spring = elevations[elevations.length - 1] ?? 0;
  const steepest = Math.max(...samples.map((item) => Math.abs(item.slopeDeg)));
  const meanRecharge = samples.reduce((sum, item) => sum + item.recharge, 0) / samples.length;
  const meanWaterDepth = samples.reduce((sum, item) => sum + item.elevation - item.waterTable, 0) / samples.length;
  return {
    lengthKm: haversineKm(transect.start, transect.end),
    reliefM: ridge - spring,
    steepestSlope: steepest,
    meanRecharge,
    meanWaterDepth,
  };
}
