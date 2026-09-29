import type { ReactNode } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Plus, Minus, Crosshair, Maximize2, Ruler, X, ScanSearch, Mountain, Route as RouteIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { GeoMap, LAYER_LABELS, UPLOAD_COLORS, type Basemap, type LayerKey } from "@/components/GeoMap";
import { SpringDrawer } from "@/components/SpringDrawer";
import { PageHeader } from "@/components/AppShell";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { CLASSES, LULC, GEOLOGY_COLORS, REGIONS, STATUS_META, FACTORS, STRUCTURES, cellIndexAt, getGrid, getInterventions, getSprings, type SpringStatus } from "@/lib/demo-data";
import { meta } from "@/lib/meta";
import { representativeTransect, transectMetrics } from "@/lib/transect";
import type { LatLng } from "@/lib/demo-data";

export const Route = createFileRoute("/explorer")({
  validateSearch: z.object({ spring: z.string().optional() }),
  head: () => meta("Springshed Explorer", "Interactive GIS map of springs, drainage, lineaments, geology, land use and recharge potential."),
  component: Explorer,
});

function Explorer() {
  const { region, analysis, uploads, toggleUpload, transect, setTransect } = useStore();
  const { spring } = Route.useSearch();
  const nav = useNavigate({ from: "/explorer" });
  const all = getSprings(region);
  const interventions = useMemo(() => getInterventions(region), [region]);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    springs: true, contours: true, streams: true, lineaments: false, lulc: false, geology: false, recharge: false, interventions: false, boundary: true,
  });
  const [basemap, setBasemap] = useState<Basemap>("terrain");
  const [opacity, setOpacity] = useState(55);
  const [statusFilter, setStatusFilter] = useState<Record<SpringStatus, boolean>>({ healthy: true, declining: true, critical: true, dry: true });
  const [measuring, setMeasuring] = useState(false);
  const [dist, setDist] = useState(0);
  const [inspecting, setInspecting] = useState(false);
  const [probe, setProbe] = useState<[number, number] | null>(null);
  const [drawingTransect, setDrawingTransect] = useState(false);
  const [transectStart, setTransectStart] = useState<LatLng | null>(null);
  const regionUploads = uploads.filter((d) => d.regionId === region);
  useEffect(() => { setProbe(null); setDrawingTransect(false); setTransectStart(null); }, [region]);
  const activeTransect = transect.regionId === region ? transect : representativeTransect(region);
  const activeMetrics = useMemo(() => transectMetrics(activeTransect), [activeTransect]);
  const handleTransectClick = (lat: number, lng: number) => {
    const point: LatLng = [lat, lng];
    if (!transectStart) {
      setTransectStart(point);
      setTransect({ regionId: region, start: point, end: point, source: "drawn" });
      return;
    }
    setTransect({ regionId: region, start: transectStart, end: point, source: "drawn" });
    setTransectStart(null);
    setDrawingTransect(false);
  };
  const probeInfo = useMemo(() => {
    if (!probe) return null;
    const i = cellIndexAt(region, probe[0], probe[1]);
    if (i < 0 || analysis.regionId !== region) return { outside: true as const };
    const cell = getGrid(region)[i];
    return { outside: false as const, cls: CLASSES[analysis.classes[i]], score: analysis.scores[i], f: cell.f };
  }, [probe, region, analysis]);
  const api = useRef<{ recenter: () => void; zoomIn: () => void; zoomOut: () => void }>(null);
  const wrap = useRef<HTMLDivElement>(null);

  const springs = useMemo(() => all.filter((s) => statusFilter[s.status]), [all, statusFilter]);
  const selected = all.find((s) => s.id === spring) ?? null;
  useEffect(() => { if (spring && !selected) nav({ search: {} }); }, [spring, selected, nav]);

  const tool = "grid size-9 place-items-center rounded-lg border bg-card shadow-sm hover:bg-muted";

  return (
    <div>
      <PageHeader title="Springshed Explorer" subtitle="Toggle hydrogeological layers, filter springs, and open any spring for its full profile." />
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div ref={wrap} className="relative h-[70vh] min-h-[480px] overflow-hidden rounded-xl border bg-card">
          <GeoMap className="h-full w-full" regionId={region} springs={springs} interventions={interventions} analysis={analysis}
            layers={layers} basemap={basemap} opacity={opacity / 100} measuring={measuring} onMeasure={setDist}
            selectedId={spring} uploads={uploads} inspecting={inspecting} inspectPoint={probe}
            transect={activeTransect} drawingTransect={drawingTransect} onTransectClick={handleTransectClick}
            onInspect={(la, ln) => setProbe([la, ln])} onSpringClick={(s) => nav({ search: { spring: s.id } })}
            mapRef={(a) => (api.current = a)} />
          <div className="absolute left-3 top-3 z-[500] flex flex-col gap-1.5">
            <button className={tool} onClick={() => api.current?.zoomIn()} aria-label="Zoom in"><Plus className="size-4" /></button>
            <button className={tool} onClick={() => api.current?.zoomOut()} aria-label="Zoom out"><Minus className="size-4" /></button>
            <button className={tool} onClick={() => api.current?.recenter()} aria-label="Center on study area"><Crosshair className="size-4" /></button>
            <button className={tool} onClick={() => document.fullscreenElement ? document.exitFullscreen() : wrap.current?.requestFullscreen()} aria-label="Full screen"><Maximize2 className="size-4" /></button>
            <button className={tool + (measuring ? " !bg-primary text-primary-foreground" : "")} onClick={() => { setMeasuring(!measuring); setInspecting(false); setDist(0); }} aria-label="Measure distance" title="Measure distance"><Ruler className="size-4" /></button>
            <button className={tool + (inspecting ? " !bg-primary text-primary-foreground" : "")} onClick={() => { const v = !inspecting; setInspecting(v); setMeasuring(false); setDrawingTransect(false); if (v) setLayers((l) => ({ ...l, recharge: true })); else setProbe(null); }} aria-label="Inspect recharge at a location" title="Inspect recharge at a location"><ScanSearch className="size-4" /></button>
            <button className={tool + (drawingTransect ? " !bg-primary text-primary-foreground" : "")} onClick={() => { const v = !drawingTransect; setDrawingTransect(v); setMeasuring(false); setInspecting(false); setTransectStart(null); }} aria-label="Draw hydrogeological transect" title="Draw hydrogeological transect"><RouteIcon className="size-4" /></button>
          </div>
          {drawingTransect && (
            <div className="absolute left-16 top-3 z-[500] flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm shadow">
              <RouteIcon className="size-4 text-primary" /> {transectStart ? "Now click the spring eye or downslope endpoint" : "Click the ridge or recharge divide to begin"}
              <button onClick={() => { setDrawingTransect(false); setTransectStart(null); }} aria-label="Cancel transect"><X className="size-3.5" /></button>
            </div>
          )}
          {measuring && (
            <div className="absolute left-16 top-3 z-[500] flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm shadow">
              <Ruler className="size-4 text-primary" /> {dist > 0 ? <b>{dist.toFixed(2)} km</b> : "Click points on the map to measure"}
              <button onClick={() => setMeasuring(false)}><X className="size-3.5" /></button>
            </div>
          )}
          {inspecting && (
            <div className="absolute left-16 top-3 z-[500] w-72 rounded-lg border bg-card p-3 text-sm shadow">
              <div className="flex items-center justify-between font-bold"><span className="flex items-center gap-1.5"><ScanSearch className="size-4 text-primary" />Recharge at location</span>
                <button onClick={() => { setInspecting(false); setProbe(null); }} aria-label="Close"><X className="size-3.5" /></button></div>
              {!probeInfo && <p className="mt-1 text-xs text-muted-foreground">Click anywhere on the map, or on a spring or uploaded point.</p>}
              {probeInfo?.outside && <p className="mt-1 text-xs text-warning-foreground">This spot is outside the analysed study area.</p>}
              {probeInfo && !probeInfo.outside && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2"><span className="size-3 rounded-sm" style={{ background: probeInfo.cls.color }} /><b>{probeInfo.cls.label}</b><span className="text-muted-foreground">· score {(probeInfo.score * 100).toFixed(0)}/100</span></div>
                  <div className="text-[11px] text-muted-foreground">{probe![0].toFixed(4)}, {probe![1].toFixed(4)} · {analysis.model === "ahp" ? "AHP" : "Random Forest"} run</div>
                  <div className="space-y-1">{FACTORS.map((f) => (
                    <div key={f.key} className="grid grid-cols-[88px_1fr_28px] items-center gap-2 text-[11px]">
                      <span className="truncate">{f.label}</span>
                      <div className="h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${probeInfo.f[f.key] * 100}%` }} /></div>
                      <span className="text-right">{Math.round(probeInfo.f[f.key] * 100)}</span>
                    </div>))}</div>
                  <p className="text-[10px] text-muted-foreground">Bars show each factor's suitability (0–100) in this cell. Demo data.</p>
                </div>
              )}
            </div>
          )}
          <div className="absolute bottom-3 left-3 z-[500] flex rounded-lg border bg-card p-1 text-xs font-semibold shadow">
            {(["terrain", "satellite", "topo"] as Basemap[]).map((b) => (
              <button key={b} onClick={() => setBasemap(b)} className={"rounded-md px-2.5 py-1 capitalize " + (basemap === b ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>{b}</button>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <div className="mb-1 flex items-center gap-2 text-sm font-bold"><Mountain className="size-4 text-primary" />Hydrogeological transect</div>
            <p className="text-xs text-muted-foreground">Draw from a ridge to a spring, or use a representative terrain line.</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-muted p-2"><span className="text-muted-foreground">Length</span><div className="font-bold">{activeMetrics.lengthKm.toFixed(2)} km</div></div>
              <div className="rounded-md bg-muted p-2"><span className="text-muted-foreground">Relief</span><div className="font-bold">{Math.round(activeMetrics.reliefM)} m</div></div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => { setTransect(representativeTransect(region, selected?.id)); setTransectStart(null); }}>{selected ? "Ridge to spring" : "Sample transect"}</Button>
              <Button size="sm" className="flex-1" asChild><Link to="/cross-section">Open 3D viewer</Link></Button>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="mb-3 text-sm font-bold">Layers</div>
            <div className="space-y-2.5">
              {(Object.keys(LAYER_LABELS) as LayerKey[]).map((k) => (
                <label key={k} className="flex items-center justify-between gap-2 text-sm">
                  {LAYER_LABELS[k]}
                  <Switch checked={layers[k]} onCheckedChange={(v) => setLayers({ ...layers, [k]: v })} />
                </label>
              ))}
            </div>
            <div className="mt-4 border-t pt-3">
              <div className="mb-2 flex justify-between text-xs"><span className="font-semibold">Heatmap opacity</span><span>{opacity}%</span></div>
              <Slider value={[opacity]} min={10} max={90} step={5} onValueChange={([v]) => setOpacity(v)} />
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="mb-3 text-sm font-bold">Your datasets</div>
            {regionUploads.length === 0 ? (
              <p className="text-xs text-muted-foreground">No uploaded data for this study area. <Link to="/data-sources" className="font-semibold text-primary">Upload GeoJSON or CSV →</Link></p>
            ) : (
              <div className="space-y-2.5">{uploads.map((d, i) => d.regionId !== region ? null : (
                <label key={d.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2"><span className="size-2.5 shrink-0 rounded-full border-2" style={{ borderColor: UPLOAD_COLORS[i % UPLOAD_COLORS.length] }} /><span className="truncate">{d.name}</span><span className="text-xs text-muted-foreground">{d.features.length}</span></span>
                  <Switch checked={d.visible} onCheckedChange={() => toggleUpload(d.id)} />
                </label>))}</div>
            )}
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="mb-3 text-sm font-bold">Filter springs <span className="font-normal text-muted-foreground">({springs.length}/{all.length})</span></div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(STATUS_META) as SpringStatus[]).map((k) => (
                <button key={k} onClick={() => setStatusFilter({ ...statusFilter, [k]: !statusFilter[k] })}
                  className={"flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-opacity " + (statusFilter[k] ? "" : "opacity-40")}>
                  <span className="size-2 rounded-full" style={{ background: STATUS_META[k].color }} />{STATUS_META[k].label} · {all.filter((s) => s.status === k).length}
                </button>
              ))}
            </div>
            <div className="mt-3 max-h-56 space-y-1 overflow-y-auto">
              {springs.map((s) => (
                <button key={s.id} onClick={() => nav({ search: { spring: s.id } })} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted">
                  <span className="size-2 rounded-full" style={{ background: STATUS_META[s.status].color }} />
                  <span className="flex-1 truncate font-medium">{s.name}</span><span className="text-muted-foreground">{s.dischargeLpm} LPM</span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
      <SpringDrawer spring={selected} onClose={() => nav({ search: {} })} />
    </div>
  );
}

