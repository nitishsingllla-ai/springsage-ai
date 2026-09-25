import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Plus, Minus, Crosshair, Maximize2, Ruler, X } from "lucide-react";
import { GeoMap, LAYER_LABELS, type Basemap, type LayerKey } from "@/components/GeoMap";
import { SpringDrawer } from "@/components/SpringDrawer";
import { PageHeader } from "@/components/AppShell";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useStore } from "@/lib/store";
import { CLASSES, LULC, STATUS_META, getInterventions, getSprings, type SpringStatus } from "@/lib/demo-data";
import { meta } from "@/lib/meta";

export const Route = createFileRoute("/explorer")({
  validateSearch: z.object({ spring: z.string().optional() }),
  head: () => meta("Springshed Explorer", "Interactive GIS map of springs, drainage, lineaments, geology, land use and recharge potential."),
  component: Explorer,
});

function Explorer() {
  const { region, analysis } = useStore();
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
            selectedId={spring} onSpringClick={(s) => nav({ search: { spring: s.id } })}
            mapRef={(a) => (api.current = a)} />
          <div className="absolute left-3 top-3 z-[500] flex flex-col gap-1.5">
            <button className={tool} onClick={() => api.current?.zoomIn()} aria-label="Zoom in"><Plus className="size-4" /></button>
            <button className={tool} onClick={() => api.current?.zoomOut()} aria-label="Zoom out"><Minus className="size-4" /></button>
            <button className={tool} onClick={() => api.current?.recenter()} aria-label="Center on study area"><Crosshair className="size-4" /></button>
            <button className={tool} onClick={() => document.fullscreenElement ? document.exitFullscreen() : wrap.current?.requestFullscreen()} aria-label="Full screen"><Maximize2 className="size-4" /></button>
            <button className={tool + (measuring ? " !bg-primary text-primary-foreground" : "")} onClick={() => { setMeasuring(!measuring); setDist(0); }} aria-label="Measure distance"><Ruler className="size-4" /></button>
          </div>
          {measuring && (
            <div className="absolute left-16 top-3 z-[500] flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm shadow">
              <Ruler className="size-4 text-primary" /> {dist > 0 ? <b>{dist.toFixed(2)} km</b> : "Click points on the map to measure"}
              <button onClick={() => setMeasuring(false)}><X className="size-3.5" /></button>
            </div>
          )}
          <div className="absolute bottom-3 left-3 z-[500] flex rounded-lg border bg-card p-1 text-xs font-semibold shadow">
            {(["terrain", "satellite", "topo"] as Basemap[]).map((b) => (
              <button key={b} onClick={() => setBasemap(b)} className={"rounded-md px-2.5 py-1 capitalize " + (basemap === b ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>{b}</button>
            ))}
          </div>
          <div className="absolute bottom-3 right-3 z-[500] max-w-[200px] rounded-lg border bg-card/95 p-3 text-[11px] shadow">
            <div className="mb-1.5 font-bold">Legend</div>
            {Object.values(STATUS_META).map((s) => <div key={s.label} className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: s.color }} />{s.label} spring</div>)}
            {layers.recharge && CLASSES.map((c) => <div key={c.key} className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: c.color }} />{c.label} recharge</div>)}
            {layers.lulc && LULC.map((c) => <div key={c.label} className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: c.color }} />{c.label}</div>)}
            {layers.lineaments && <div className="flex items-center gap-1.5"><span className="h-0.5 w-3 bg-risk" />Lineament</div>}
            {layers.streams && <div className="flex items-center gap-1.5"><span className="h-0.5 w-3 bg-water" />Stream</div>}
          </div>
        </div>

        <aside className="space-y-4">
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
