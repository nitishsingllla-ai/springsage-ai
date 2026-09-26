import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useStore, download } from "@/lib/store";
import {
  CLASSES, FACTORS, REGIONS, STRUCTURES, boundary, getGrid, getInterventions, getSprings, lineaments, runRecharge, streams,
  type RegionId,
} from "@/lib/demo-data";

type Layer = "springs" | "recharge" | "interventions" | "streams" | "lineaments" | "boundary" | "uploads";
const LAYERS: { key: Layer; label: string; csv: boolean }[] = [
  { key: "springs", label: "Springs inventory", csv: true },
  { key: "recharge", label: "Recharge zones (grid cells)", csv: true },
  { key: "interventions", label: "Proposed interventions", csv: true },
  { key: "uploads", label: "Your uploaded datasets", csv: true },
  { key: "streams", label: "Drainage network", csv: false },
  { key: "lineaments", label: "Lineaments", csv: false },
  { key: "boundary", label: "Watershed boundary", csv: false },
];
const lngLat = (p: [number, number]) => [p[1], p[0]];
const csvCell = (v: unknown) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const toCsv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return "";
  const h = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  return [h.join(","), ...rows.map((r) => h.map((k) => csvCell(r[k])).join(","))].join("\n");
};

export function ExportBuilder() {
  const { region, analysis, weights, uploads } = useStore();
  const [area, setArea] = useState<RegionId>(region);
  const [format, setFormat] = useState<"geojson" | "csv">("geojson");
  const [layers, setLayers] = useState<Record<Layer, boolean>>({ springs: true, recharge: true, interventions: false, uploads: false, streams: false, lineaments: false, boundary: true });
  const [minClass, setMinClass] = useState(4);
  const [factors, setFactors] = useState(false);
  const [meta, setMeta] = useState(true);

  const res = analysis.regionId === area ? analysis : runRecharge(area, analysis.model, weights);
  const avail = LAYERS.filter((l) => format === "geojson" || l.csv);
  const chosen = avail.filter((l) => layers[l.key]);

  const build = () => {
    if (!chosen.length) return toast.error("Choose at least one layer to export.");
    const reg = REGIONS[area];
    const grid = getGrid(area);
    const tables: Record<string, Record<string, unknown>[]> = {};
    const feats: any[] = [];
    const pt = (lat: number, lng: number, props: object, layer: string) => ({ type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties: { layer, ...props } });
    if (layers.springs) {
      const rows = getSprings(area).map(({ monthly, ...s }) => {
        const i = grid.findIndex((c) => s.lat >= c.lat && s.lat < c.lat + c.dLat && s.lng >= c.lng && s.lng < c.lng + c.dLng);
        return { ...s, recharge_class: i >= 0 ? CLASSES[res.classes[i]].label : "", recharge_score: i >= 0 ? +res.scores[i].toFixed(3) : "" };
      });
      tables.springs = rows; rows.forEach((r) => feats.push(pt(r.lat, r.lng, r, "springs")));
    }
    if (layers.recharge) {
      const rows = grid.map((c, i) => ({ c, i })).filter(({ i }) => res.classes[i] <= minClass).map(({ c, i }) => ({
        cell: i, lat: +(c.lat + c.dLat / 2).toFixed(5), lng: +(c.lng + c.dLng / 2).toFixed(5),
        score: +res.scores[i].toFixed(3), class: CLASSES[res.classes[i]].label,
        ...(factors ? Object.fromEntries(FACTORS.map((f) => [`f_${f.key}`, +c.f[f.key].toFixed(3)])) : {}),
      }));
      tables.recharge_zones = rows;
      if (format === "geojson") rows.forEach((r) => {
        const c = grid[r.cell];
        feats.push({ type: "Feature", properties: { layer: "recharge_zones", ...r }, geometry: { type: "Polygon", coordinates: [[[c.lng, c.lat], [c.lng + c.dLng, c.lat], [c.lng + c.dLng, c.lat + c.dLat], [c.lng, c.lat + c.dLat], [c.lng, c.lat]]] } });
      });
    }
    if (layers.interventions) {
      const rows = getInterventions(area).map((iv) => ({ ...iv, type_label: STRUCTURES.find((s) => s.key === iv.type)?.label }));
      tables.interventions = rows; rows.forEach((r) => feats.push(pt(r.lat, r.lng, r, "interventions")));
    }
    if (layers.uploads) {
      const rows = uploads.filter((d) => d.regionId === area).flatMap((d) => d.features.map((f) => ({ dataset: d.name, name: f.name, lat: f.lat, lng: f.lng, value: f.value ?? "", ...f.props })));
      if (!rows.length) toast.info("No uploaded datasets for this study area — skipped.");
      tables.uploads = rows; rows.forEach((r) => feats.push(pt(r.lat, r.lng, r, "uploads")));
    }
    if (format === "geojson") {
      if (layers.streams) streams(reg).forEach((l, i) => feats.push({ type: "Feature", properties: { layer: "streams", id: i }, geometry: { type: "LineString", coordinates: l.map(lngLat) } }));
      if (layers.lineaments) lineaments(reg).forEach((l, i) => feats.push({ type: "Feature", properties: { layer: "lineaments", id: i }, geometry: { type: "LineString", coordinates: l.map(lngLat) } }));
      if (layers.boundary) { const b = boundary(reg).map(lngLat); feats.push({ type: "Feature", properties: { layer: "boundary", name: reg.name }, geometry: { type: "Polygon", coordinates: [[...b, b[0]]] } }); }
    }
    const info = { study_area: reg.name, model: res.model.toUpperCase(), weights: res.weights, run_at: res.runAt, min_class: CLASSES[minClass].label, note: "Demonstration data — not verified findings." };
    if (format === "geojson") {
      download(`springsage_${area}.geojson`, JSON.stringify({ type: "FeatureCollection", ...(meta ? { metadata: info } : {}), features: feats }, null, 2), "application/geo+json");
      toast.success(`GeoJSON exported · ${feats.length} features`);
    } else {
      const names = Object.keys(tables).filter((k) => tables[k].length);
      if (!names.length) return toast.error("Nothing to export with these choices.");
      names.forEach((k, i) => setTimeout(() => {
        const header = meta ? `# ${info.study_area} · ${info.model} · ${info.run_at} · ${info.note}\n` : "";
        download(`springsage_${area}_${k}.csv`, header + toCsv(tables[k]), "text/csv");
      }, i * 300));
      toast.success(`${names.length} CSV file${names.length > 1 ? "s" : ""} exported`);
    }
  };

  const sel = "mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm font-normal";
  return (
    <div className="grid gap-5 md:grid-cols-3">
      <div className="space-y-3">
        <label className="block text-xs font-semibold">Study area
          <select className={sel} value={area} onChange={(e) => setArea(e.target.value as RegionId)}>{Object.values(REGIONS).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
        <div className="text-xs font-semibold">Format
          <div className="mt-1 flex rounded-md border p-0.5">{(["geojson", "csv"] as const).map((f) => (
            <button key={f} onClick={() => setFormat(f)} className={"flex-1 rounded px-2 py-1 text-sm " + (format === f ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>{f === "geojson" ? "GeoJSON" : "CSV"}</button>))}</div>
          <p className="mt-1 font-normal text-muted-foreground">{format === "geojson" ? "One file with all layers; each feature has a “layer” property." : "One file per table. Line and area layers aren't available in CSV."}</p>
        </div>
      </div>
      <div>
        <div className="mb-2 text-xs font-semibold">Layers</div>
        <div className="space-y-2">{avail.map((l) => (
          <label key={l.key} className="flex items-center gap-2 text-sm"><Checkbox checked={layers[l.key]} onCheckedChange={(v) => setLayers({ ...layers, [l.key]: !!v })} />{l.label}</label>))}</div>
      </div>
      <div className="space-y-3">
        <div className="text-xs font-semibold">Analysis results</div>
        <p className="text-xs text-muted-foreground">Using the {res.model === "ahp" ? "AHP" : "Random Forest"} run{analysis.regionId === area ? ` from ${new Date(res.runAt).toLocaleString()}` : " with your current weights"}.</p>
        <label className="block text-xs font-semibold">Recharge cells to include
          <select className={sel} value={minClass} onChange={(e) => setMinClass(+e.target.value)} disabled={!layers.recharge}>
            {CLASSES.map((c, i) => <option key={c.key} value={i}>{i === 4 ? "All classes" : i === 0 ? "Very High only" : `${c.label} and above`}</option>)}
          </select></label>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={factors} onCheckedChange={(v) => setFactors(!!v)} disabled={!layers.recharge} />Include factor scores per cell</label>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={meta} onCheckedChange={(v) => setMeta(!!v)} />Include model settings &amp; run date</label>
        <Button className="w-full" onClick={build}><Download />Export {format === "geojson" ? "GeoJSON" : "CSV"}</Button>
      </div>
    </div>
  );
}
