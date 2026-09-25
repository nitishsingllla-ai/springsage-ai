// SpringSage AI — DEMONSTRATION DATASETS
// All values below are synthetic, generated for prototype demonstration only.
// They are NOT verified field observations. Replace via the DataProvider interface
// (see `DataProvider` below) to connect real GIS layers, sensors and models.

export type RegionId = "himalayan" | "tribal";
export type SpringStatus = "healthy" | "declining" | "critical" | "dry";
export type LatLng = [number, number];

export interface Region {
  id: RegionId;
  name: string;
  subtitle: string;
  state: string;
  district: string;
  center: LatLng;
  span: number; // degrees half-width
  areaSqKm: number;
  elevationRange: [number, number];
  annualRainfallMm: number;
  lithology: string[];
  metrics: {
    springs: number;
    critical: number;
    highRechargeSqKm: number;
    interventions: number;
    reliance: number;
    dischargeTrend: number;
  };
}

export const REGIONS: Record<RegionId, Region> = {
  himalayan: {
    id: "himalayan",
    name: "Demo Himalayan Watershed",
    subtitle: "Mid-Himalayan micro-watershed (synthetic)",
    state: "Uttarakhand (demo)",
    district: "Almora-type terrain",
    center: [29.62, 79.66],
    span: 0.06,
    areaSqKm: 64.2,
    elevationRange: [1180, 2240],
    annualRainfallMm: 1260,
    lithology: ["Quartzite", "Phyllite", "Schist", "Granite gneiss"],
    metrics: { springs: 42, critical: 9, highRechargeSqKm: 18.4, interventions: 27, reliance: 14850, dischargeTrend: -18 },
  },
  tribal: {
    id: "tribal",
    name: "Demo Tribal Springshed",
    subtitle: "Eastern Ghats tribal plateau (synthetic)",
    state: "Odisha (demo)",
    district: "Koraput-type terrain",
    center: [18.82, 82.72],
    span: 0.06,
    areaSqKm: 58.7,
    elevationRange: [640, 1420],
    annualRainfallMm: 1520,
    lithology: ["Khondalite", "Charnockite", "Laterite cap", "Granite gneiss"],
    metrics: { springs: 36, critical: 7, highRechargeSqKm: 15.1, interventions: 22, reliance: 11320, dischargeTrend: -12 },
  },
};

// Seeded RNG for stable demo data
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export { MONTHS };

const VILLAGES: Record<RegionId, string[]> = {
  himalayan: ["Dhaulchhina", "Salla Rautela", "Kasar Devi", "Jageshwar", "Lamgara", "Bhanoli", "Chitai", "Deolikhan", "Pandekhola", "Kaphalkhet", "Syahi Devi", "Matena"],
  tribal: ["Kundra", "Bandhugaon", "Semiliguda", "Pottangi", "Lamtaput", "Nandapur", "Boipariguda", "Dasmantpur", "Laxmipur", "Narayanpatna", "Machkund", "Kakiriguma"],
};
const SPRING_TYPES = ["Fracture", "Contact", "Depression", "Fault", "Karst-like seepage"];

export interface Spring {
  id: string;
  name: string;
  village: string;
  lat: number;
  lng: number;
  elevation: number;
  type: string;
  status: SpringStatus;
  dischargeLpm: number;
  baselineLpm: number;
  households: number;
  reliance: number;
  vulnerability: number; // 0-100
  ph: number;
  tds: number;
  turbidity: number;
  ecoli: boolean;
  monthly: { month: string; current: number; baseline: number; rainfall: number }[];
  lastSurveyed: string;
}

// Hills function — synthetic terrain elevation 0..1
export function terrain(region: Region, lat: number, lng: number) {
  const x = (lng - region.center[1]) / region.span;
  const y = (lat - region.center[0]) / region.span;
  const peaks = region.id === "himalayan"
    ? [[0.25, 0.35, 0.55], [-0.4, -0.1, 0.45], [0.1, -0.5, 0.35]]
    : [[0, 0.1, 0.7], [0.5, -0.4, 0.35], [-0.5, 0.45, 0.3]];
  let h = 0;
  for (const [px, py, w] of peaks) h += Math.exp(-((x - px) ** 2 + (y - py) ** 2) / (w * w));
  h += 0.08 * Math.sin(x * 6 + y * 3) + 0.05 * Math.cos(y * 9 - x * 2);
  return Math.max(0, Math.min(1, h / 1.25));
}

function genSprings(region: Region): Spring[] {
  const r = rng(region.id === "himalayan" ? 42 : 77);
  const n = region.metrics.springs;
  const out: Spring[] = [];
  const statuses: SpringStatus[] = [];
  const crit = region.metrics.critical;
  for (let i = 0; i < n; i++) {
    if (i < crit) statuses.push("critical");
    else if (i < crit + 3) statuses.push("dry");
    else if (i < crit + 14) statuses.push("declining");
    else statuses.push("healthy");
  }
  // shuffle
  for (let i = statuses.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [statuses[i], statuses[j]] = [statuses[j], statuses[i]];
  }
  const vil = VILLAGES[region.id];
  for (let i = 0; i < n; i++) {
    const ang = r() * Math.PI * 2;
    const dist = (0.2 + r() * 0.7) * region.span;
    const lat = region.center[0] + Math.sin(ang) * dist;
    const lng = region.center[1] + Math.cos(ang) * dist * 1.1;
    const t = terrain(region, lat, lng);
    const elevation = Math.round(region.elevationRange[0] + t * (region.elevationRange[1] - region.elevationRange[0]));
    const status = statuses[i];
    const baseline = Math.round((6 + r() * 34) * 10) / 10;
    const factor = status === "healthy" ? 0.9 + r() * 0.2 : status === "declining" ? 0.6 + r() * 0.2 : status === "critical" ? 0.25 + r() * 0.2 : 0.02 + r() * 0.06;
    const discharge = Math.round(baseline * factor * 10) / 10;
    const households = Math.round(20 + r() * 140);
    const monthly = MONTHS.map((m, k) => {
      const season = 0.55 + 0.75 * Math.max(0, Math.sin(((k - 4) / 12) * Math.PI * 2)) + (k >= 8 && k <= 10 ? 0.25 : 0);
      const rain = Math.round(region.annualRainfallMm * (k >= 5 && k <= 8 ? 0.19 : 0.015 + r() * 0.02));
      return {
        month: m,
        baseline: Math.round(baseline * season * 10) / 10,
        current: Math.round(baseline * season * factor * (0.9 + r() * 0.2) * 10) / 10,
        rainfall: rain,
      };
    });
    out.push({
      id: `${region.id === "himalayan" ? "HW" : "TS"}-${String(i + 1).padStart(3, "0")}`,
      name: `${vil[i % vil.length]} ${["Naula", "Dhara", "Chashma", "Jharna"][i % 4]} ${Math.floor(i / vil.length) + 1}`,
      village: vil[i % vil.length],
      lat, lng, elevation,
      type: SPRING_TYPES[Math.floor(r() * SPRING_TYPES.length)],
      status,
      dischargeLpm: discharge,
      baselineLpm: baseline,
      households,
      reliance: households * 5,
      vulnerability: Math.round(status === "healthy" ? 15 + r() * 25 : status === "declining" ? 40 + r() * 20 : 65 + r() * 33),
      ph: Math.round((6.4 + r() * 1.6) * 10) / 10,
      tds: Math.round(60 + r() * 380),
      turbidity: Math.round(r() * 12 * 10) / 10,
      ecoli: r() < (status === "healthy" ? 0.1 : 0.35),
      monthly,
      lastSurveyed: `2026-0${1 + Math.floor(r() * 8)}-${String(1 + Math.floor(r() * 27)).padStart(2, "0")}`,
    });
  }
  return out;
}

const springCache: Partial<Record<RegionId, Spring[]>> = {};
export function getSprings(id: RegionId) {
  return (springCache[id] ??= genSprings(REGIONS[id]));
}

// ---------- Recharge factors grid ----------
export const FACTORS = [
  { key: "elevation", label: "Elevation", desc: "Mid-slope elevation bands favour infiltration above spring outlets." },
  { key: "slope", label: "Slope", desc: "Gentle slopes (<15°) retain runoff longer." },
  { key: "lineament", label: "Lineament Density", desc: "Fractures and faults provide preferential recharge pathways." },
  { key: "drainage", label: "Drainage Density", desc: "Low drainage density indicates higher infiltration." },
  { key: "rainfall", label: "Rainfall", desc: "Mean annual precipitation from gridded data." },
  { key: "lulc", label: "Land Use / Land Cover", desc: "Forest and grassland favour recharge; built-up reduces it." },
  { key: "geology", label: "Geology", desc: "Fractured quartzite/laterite has higher porosity than phyllite." },
  { key: "soil", label: "Soil Permeability", desc: "Sandy loam > clay loam in infiltration capacity." },
] as const;
export type FactorKey = (typeof FACTORS)[number]["key"];
export type Weights = Record<FactorKey, number>;

export const DEFAULT_WEIGHTS: Weights = {
  elevation: 10, slope: 18, lineament: 16, drainage: 12, rainfall: 10, lulc: 14, geology: 12, soil: 8,
};

export interface Cell {
  lat: number; lng: number; dLat: number; dLng: number;
  f: Record<FactorKey, number>;
}

export const GRID = 26;
const gridCache: Partial<Record<RegionId, Cell[]>> = {};
export function getGrid(id: RegionId): Cell[] {
  if (gridCache[id]) return gridCache[id]!;
  const reg = REGIONS[id];
  const r = rng(id === "himalayan" ? 5 : 9);
  const cells: Cell[] = [];
  const d = (reg.span * 2) / GRID;
  for (let i = 0; i < GRID; i++)
    for (let j = 0; j < GRID; j++) {
      const lat = reg.center[0] - reg.span + i * d;
      const lng = reg.center[1] - reg.span * 1.1 + j * d * 1.1;
      const x = j / GRID, y = i / GRID;
      const t = terrain(reg, lat + d / 2, lng + d / 2);
      const n = () => (r() - 0.5) * 0.15;
      const c = (v: number) => Math.max(0, Math.min(1, v));
      cells.push({
        lat, lng, dLat: d, dLng: d * 1.1,
        f: {
          elevation: c(1 - Math.abs(t - 0.55) * 1.8 + n()),
          slope: c(1 - Math.abs(Math.sin(t * 7)) * 0.9 + n()),
          lineament: c(0.5 + 0.5 * Math.sin((x - y) * 11) * Math.cos(x * 4) + n()),
          drainage: c(0.6 + 0.4 * Math.cos(x * 9 + y * 5) + n()),
          rainfall: c(0.4 + 0.5 * y + n() * 0.5),
          lulc: c(0.5 + 0.45 * Math.sin(x * 5 + 1) * Math.sin(y * 4) + n()),
          geology: c(x + y < 0.9 ? 0.75 + n() : x > 0.6 ? 0.35 + n() : 0.55 + n()),
          soil: c(0.5 + 0.4 * Math.sin(y * 7 + x * 2) + n()),
        },
      });
    }
  return (gridCache[id] = cells);
}

export const CLASSES = [
  { key: "vh", label: "Very High", color: "#10382D" },
  { key: "h", label: "High", color: "#65A878" },
  { key: "m", label: "Moderate", color: "#C9C27A" },
  { key: "l", label: "Low", color: "#E6A23C" },
  { key: "vl", label: "Very Low", color: "#C9564D" },
] as const;

export interface AnalysisResult {
  regionId: RegionId;
  model: "ahp" | "rf";
  weights: Weights;
  scores: number[];
  classes: number[]; // index into CLASSES
  areaByClass: number[]; // sq km
  importance: { key: FactorKey; label: string; value: number }[];
  accuracy: number;
  auc: number;
  runAt: string;
}

export function runRecharge(regionId: RegionId, model: "ahp" | "rf", weights: Weights): AnalysisResult {
  const cells = getGrid(regionId);
  const total = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
  const scores = cells.map((c) => {
    let s = 0;
    for (const k of Object.keys(weights) as FactorKey[]) s += c.f[k] * weights[k];
    s /= total;
    if (model === "rf") s = s * 0.8 + 0.2 * (c.f.lineament * c.f.slope); // nonlinear interaction
    return s;
  });
  const sorted = [...scores].sort((a, b) => b - a);
  const q = [0.12, 0.3, 0.6, 0.85].map((p) => sorted[Math.floor(p * sorted.length)]);
  const classes = scores.map((s) => (s >= q[0] ? 0 : s >= q[1] ? 1 : s >= q[2] ? 2 : s >= q[3] ? 3 : 4));
  const cellArea = REGIONS[regionId].areaSqKm / cells.length;
  const areaByClass = [0, 0, 0, 0, 0];
  classes.forEach((c) => (areaByClass[c] += cellArea));
  const importance = FACTORS.map((f) => {
    const base = weights[f.key] / total;
    const v = model === "rf" ? base * 0.7 + (f.key === "lineament" || f.key === "slope" ? 0.06 : 0.02) : base;
    return { key: f.key, label: f.label, value: Math.round(v * 1000) / 10 };
  }).sort((a, b) => b.value - a.value);
  return {
    regionId, model, weights, scores, classes,
    areaByClass: areaByClass.map((a) => Math.round(a * 10) / 10),
    importance,
    accuracy: model === "rf" ? 0.86 : 0.79,
    auc: model === "rf" ? 0.91 : 0.83,
    runAt: new Date().toISOString(),
  };
}

// ---------- Interventions ----------
export const STRUCTURES = [
  { key: "trench", label: "Staggered Contour Trenches", unit: "per 100 m", unitCost: 18500, recharge: 42, desc: "Contour trenches on 10–25° slopes in high recharge zones." },
  { key: "checkdam", label: "Loose Boulder Check Dam", unit: "per structure", unitCost: 65000, recharge: 180, desc: "Across 1st–2nd order streams to slow runoff." },
  { key: "pond", label: "Percolation Pond", unit: "per pond", unitCost: 240000, recharge: 950, desc: "On gentle slopes over fractured rock." },
  { key: "afforest", label: "Native Afforestation", unit: "per hectare", unitCost: 85000, recharge: 320, desc: "Oak / sal and native grasses in recharge areas." },
  { key: "chamber", label: "Spring Chamber Renovation", unit: "per spring", unitCost: 125000, recharge: 0, desc: "Protected collection chamber, overflow & sanitation." },
] as const;
export type StructureKey = (typeof STRUCTURES)[number]["key"];

export interface Intervention {
  id: string;
  type: StructureKey;
  lat: number; lng: number;
  qty: number;
  springId: string;
  priority: "High" | "Medium" | "Low";
}

export function getInterventions(id: RegionId): Intervention[] {
  const r = rng(id === "himalayan" ? 11 : 13);
  const reg = REGIONS[id];
  const springs = getSprings(id);
  const types: StructureKey[] = ["trench", "checkdam", "pond", "afforest", "chamber"];
  const out: Intervention[] = [];
  for (let i = 0; i < reg.metrics.interventions; i++) {
    const s = springs[Math.floor(r() * springs.length)];
    const type = types[i % types.length];
    out.push({
      id: `INT-${String(i + 1).padStart(3, "0")}`,
      type,
      lat: s.lat + (r() - 0.3) * 0.012,
      lng: s.lng + (r() - 0.5) * 0.012,
      qty: type === "trench" ? Math.round(4 + r() * 12) : type === "afforest" ? Math.round(2 + r() * 8) : 1 + Math.floor(r() * 3),
      springId: s.id,
      priority: s.status === "critical" || s.status === "dry" ? "High" : s.status === "declining" ? "Medium" : "Low",
    });
  }
  return out;
}

// ---------- Synthetic GIS vector layers ----------
export function contours(region: Region): { level: number; path: LatLng[] }[] {
  const out: { level: number; path: LatLng[] }[] = [];
  const peaks = region.id === "himalayan" ? [[0.25, 0.35], [-0.4, -0.1]] : [[0, 0.1], [0.5, -0.4]];
  peaks.forEach(([px, py], pi) => {
    for (let k = 1; k <= 6; k++) {
      const path: LatLng[] = [];
      for (let a = 0; a <= 64; a++) {
        const th = (a / 64) * Math.PI * 2;
        const rr = k * 0.075 * (1 + 0.14 * Math.sin(3 * th + pi) + 0.07 * Math.cos(5 * th));
        path.push([region.center[0] + (py + Math.sin(th) * rr) * region.span, region.center[1] + (px + Math.cos(th) * rr * 1.1) * region.span]);
      }
      out.push({ level: region.elevationRange[1] - k * 150 - pi * 80, path });
    }
  });
  return out;
}

export function streams(region: Region): LatLng[][] {
  const r = rng(region.id === "himalayan" ? 3 : 4);
  const lines: LatLng[][] = [];
  for (let s = 0; s < 7; s++) {
    let a = (s / 7) * Math.PI * 2 + r();
    let lat = region.center[0] + Math.sin(a) * region.span * 0.15;
    let lng = region.center[1] + Math.cos(a) * region.span * 0.15;
    const p: LatLng[] = [[lat, lng]];
    for (let i = 0; i < 14; i++) {
      a += (r() - 0.5) * 0.6;
      lat += Math.sin(a) * region.span * 0.06;
      lng += Math.cos(a) * region.span * 0.066;
      p.push([lat, lng]);
    }
    lines.push(p);
  }
  return lines;
}

export function lineaments(region: Region): LatLng[][] {
  const r = rng(region.id === "himalayan" ? 21 : 22);
  const out: LatLng[][] = [];
  for (let i = 0; i < 9; i++) {
    const a = 0.5 + r() * 0.6 + (i % 2) * 1.4;
    const cx = region.center[0] + (r() - 0.5) * region.span * 1.4;
    const cy = region.center[1] + (r() - 0.5) * region.span * 1.4;
    const L = region.span * (0.3 + r() * 0.4);
    out.push([[cx - Math.sin(a) * L, cy - Math.cos(a) * L], [cx + Math.sin(a) * L, cy + Math.cos(a) * L]]);
  }
  return out;
}

export function boundary(region: Region): LatLng[] {
  const p: LatLng[] = [];
  for (let a = 0; a < 48; a++) {
    const th = (a / 48) * Math.PI * 2;
    const rr = region.span * (0.95 + 0.08 * Math.sin(4 * th) + 0.05 * Math.cos(7 * th));
    p.push([region.center[0] + Math.sin(th) * rr, region.center[1] + Math.cos(th) * rr * 1.15]);
  }
  return p;
}

export const LULC = [
  { label: "Dense forest", color: "#2E6B4A" },
  { label: "Open forest / scrub", color: "#8DBA7A" },
  { label: "Agriculture / terraces", color: "#E3D48A" },
  { label: "Settlement", color: "#C98E6B" },
];
export const GEOLOGY_COLORS = ["#B9A28A", "#9C8FB0", "#8FA9B8", "#C7B26C"];

export function sectors(region: Region, n: number): LatLng[][] {
  const out: LatLng[][] = [];
  for (let s = 0; s < n; s++) {
    const a0 = (s / n) * Math.PI * 2 + 0.3, a1 = ((s + 1) / n) * Math.PI * 2 + 0.3;
    const poly: LatLng[] = [region.center];
    for (let k = 0; k <= 10; k++) {
      const th = a0 + ((a1 - a0) * k) / 10;
      poly.push([region.center[0] + Math.sin(th) * region.span * 0.95, region.center[1] + Math.cos(th) * region.span * 1.05]);
    }
    out.push(poly);
  }
  return out;
}

export const ACTIVITY: Record<RegionId, { t: string; text: string; kind: "survey" | "analysis" | "alert" | "report" }[]> = {
  himalayan: [
    { t: "2h ago", text: "Field survey submitted for Jageshwar Dhara 1 (HW-004)", kind: "survey" },
    { t: "5h ago", text: "Discharge alert: Kasar Devi Naula fell below 30% of baseline", kind: "alert" },
    { t: "Yesterday", text: "Recharge assessment (AHP) completed — 18.4 sq km high potential", kind: "analysis" },
    { t: "2 days ago", text: "DPR draft exported for Lamgara cluster", kind: "report" },
    { t: "3 days ago", text: "Water quality flagged: E. coli presence at Chitai Chashma 1", kind: "alert" },
  ],
  tribal: [
    { t: "1h ago", text: "Community survey logged at Pottangi Jharna 1", kind: "survey" },
    { t: "6h ago", text: "Random Forest model run — AUC 0.91", kind: "analysis" },
    { t: "Yesterday", text: "Dry season alert: 3 springs reporting < 1 LPM", kind: "alert" },
    { t: "4 days ago", text: "Intervention plan shared with Block Development Office", kind: "report" },
  ],
};

export const DATA_SOURCES = [
  { name: "Digital Elevation Model", provider: "CartoDEM / SRTM 30 m", layer: "Elevation, Slope, Contours", status: "Demo sample", format: "GeoTIFF" },
  { name: "Drainage network", provider: "Derived from DEM (D8 flow)", layer: "Streams, Drainage density", status: "Demo sample", format: "Shapefile" },
  { name: "Lineaments", provider: "Bhukosh (GSI) / Sentinel-2 interpretation", layer: "Lineament density", status: "Demo sample", format: "Shapefile" },
  { name: "Lithology", provider: "Geological Survey of India 1:50k", layer: "Geology", status: "Demo sample", format: "Shapefile" },
  { name: "LULC", provider: "Bhuvan LULC 1:50k / ESA WorldCover", layer: "Land use / cover", status: "Demo sample", format: "GeoTIFF" },
  { name: "Rainfall", provider: "IMD gridded 0.25° / CHIRPS", layer: "Rainfall", status: "Demo sample", format: "NetCDF" },
  { name: "Soil", provider: "NBSS&LUP soil maps", layer: "Soil permeability", status: "Demo sample", format: "Shapefile" },
  { name: "Spring inventory", provider: "Field surveys / Springs Atlas", layer: "Springs", status: "Demo sample", format: "CSV / GeoJSON" },
];

/** Interface for plugging in real data later. */
export interface DataProvider {
  getSprings(region: RegionId): Promise<Spring[]>;
  getFactorGrid(region: RegionId): Promise<Cell[]>;
  runModel(region: RegionId, model: "ahp" | "rf", weights: Weights): Promise<AnalysisResult>;
}
export const demoProvider: DataProvider = {
  getSprings: async (r) => getSprings(r),
  getFactorGrid: async (r) => getGrid(r),
  runModel: async (r, m, w) => runRecharge(r, m, w),
};

export const STATUS_META: Record<SpringStatus, { label: string; color: string; badge: string }> = {
  healthy: { label: "Healthy", color: "#3999C6", badge: "bg-water/15 text-water" },
  declining: { label: "Declining", color: "#E6A23C", badge: "bg-warning/15 text-warning-foreground" },
  critical: { label: "Critical", color: "#C9564D", badge: "bg-risk/15 text-risk" },
  dry: { label: "Dry / Seasonal", color: "#7A6F63", badge: "bg-muted text-muted-foreground" },
};

export function formatINR(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}
