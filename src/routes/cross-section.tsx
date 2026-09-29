import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Gauge, Layers3, Minus, Mountain, Orbit, Play, Plus, RotateCcw, Slash, Waves, X } from "lucide-react";
import { CrossSectionViewer, type ViewerApi } from "@/components/CrossSectionViewer";
import { PageHeader, Panel, RegionSelect } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/lib/store";
import { REGIONS, getSprings } from "@/lib/demo-data";
import { representativeTransect, sampleTransect, transectMetrics, type TransectSample } from "@/lib/transect";
import { meta } from "@/lib/meta";

export const Route = createFileRoute("/cross-section")({
  ssr: false,
  head: () => meta("3D Hydrogeological Cross-Section", "Explore ridge-to-spring elevation, lithology, fractures, water table and animated recharge flow paths."),
  component: CrossSectionPage,
});

const EXAG_MIN = 0.75;
const EXAG_MAX = 2.5;
const EXAG_STEP = 0.05;
const clampExag = (value: number) => Math.min(EXAG_MAX, Math.max(EXAG_MIN, Math.round(value / EXAG_STEP) * EXAG_STEP));

function CrossSectionPage() {
  const { region, transect, setTransect } = useStore();
  const [exaggeration, setExaggeration] = useState(1.35);
  const [showGeology, setShowGeology] = useState(true);
  const [showWater, setShowWater] = useState(true);
  const [showFractures, setShowFractures] = useState(true);
  const [animateFlow, setAnimateFlow] = useState(true);
  const [spin, setSpin] = useState(false);
  const [selectedSample, setSelectedSample] = useState<TransectSample | null>(null);
  const [hoverSample, setHoverSample] = useState<TransectSample | null>(null);
  const viewerApi = useRef<ViewerApi | null>(null);
  const handleApi = useCallback((api: ViewerApi) => { viewerApi.current = api; }, []);
  const springs = getSprings(region);
  const active = transect.regionId === region ? transect : representativeTransect(region);
  const samples = useMemo(() => sampleTransect(active), [active]);
  const metrics = useMemo(() => transectMetrics(active, samples), [active, samples]);
  const selectedSpring = springs.find((spring) => spring.id === active.springId);
  const chartData = samples.map((sample) => ({ ...sample, water: sample.waterTable }));
  const chartMin = Math.floor((Math.min(...samples.map((sample) => sample.waterTable)) - 40) / 100) * 100;
  const chartMax = Math.ceil((Math.max(...samples.map((sample) => sample.elevation)) + 40) / 100) * 100;
  const slopeMarkers = [0.25, 0.5, 0.75].map((fraction) => samples[Math.round((samples.length - 1) * fraction)]).filter((sample): sample is TransectSample => Boolean(sample));
  const lithology = REGIONS[region].lithology;
  const ridgeElev = samples[0]?.elevation ?? 0;
  const springElev = samples[samples.length - 1]?.elevation ?? 0;
  const isHover = (sample: TransectSample) => hoverSample?.distanceKm === sample.distanceKm;
  const isSelected = (sample: TransectSample) => selectedSample?.distanceKm === sample.distanceKm;

  const chooseSpring = (springId: string) => {
    setTransect(representativeTransect(region, springId));
    setSelectedSample(null);
    setHoverSample(null);
    viewerApi.current?.reset();
  };

  const resetTransect = () => {
    setTransect(representativeTransect(region));
    setSelectedSample(null);
    setHoverSample(null);
    viewerApi.current?.reset();
  };

  return (
    <div>
      <PageHeader
        title="3D Hydrogeological Cross-Section"
        subtitle="Trace ridge-to-spring terrain, rock contacts, fractures, groundwater level and probable recharge movement."
        actions={<RegionSelect className="w-[240px]" />}
      />
      <div className="mb-4 grid gap-3 md:grid-cols-[minmax(220px,1fr)_auto]">
        <Select value={selectedSpring?.id ?? "custom"} onValueChange={chooseSpring}>
          <SelectTrigger aria-label="Select spring for cross-section"><SelectValue placeholder="Select a spring" /></SelectTrigger>
          <SelectContent className="z-[1200]">
            {active.source === "drawn" && <SelectItem value="custom">Custom map transect</SelectItem>}
            {springs.map((spring) => <SelectItem key={spring.id} value={spring.id}>{spring.name} · {spring.id}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={resetTransect}><Mountain />Representative transect</Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="relative min-h-[500px] overflow-hidden rounded-xl border bg-card shadow-sm xl:min-h-[560px]">
          <div className="absolute inset-0 p-2">
            <CrossSectionViewer
              transect={active}
              exaggeration={exaggeration}
              showGeology={showGeology}
              showWater={showWater}
              showFractures={showFractures}
              animateFlow={animateFlow}
              spin={spin}
              selectedSample={selectedSample}
              hoverSample={hoverSample}
              apiRef={handleApi}
              onSampleSelect={setSelectedSample}
              onSampleHover={setHoverSample}
            />
          </div>
          <div className="pointer-events-none absolute left-4 top-4 max-w-[240px] rounded-lg border bg-card/95 px-3 py-2 text-xs shadow-sm">
            <div className="font-bold">{selectedSpring ? selectedSpring.name : "Ridge → Spring eye"}</div>
            <div className="text-muted-foreground">{metrics.lengthKm.toFixed(2)} km · drag to orbit · click terrain to inspect</div>
          </div>
          <div className="absolute right-3 top-3 z-10 flex flex-col items-center gap-1.5">
            <div className="flex flex-col gap-0.5 rounded-xl border bg-card/95 p-1 shadow-sm">
              <ToolButton label="Zoom in" onClick={() => viewerApi.current?.zoomIn()}><Plus /></ToolButton>
              <ToolButton label="Zoom out" onClick={() => viewerApi.current?.zoomOut()}><Minus /></ToolButton>
              <div className="mx-auto my-0.5 h-px w-5 bg-border" />
              <ToolButton label={spin ? "Stop auto-orbit" : "Auto-orbit view"} active={spin} onClick={() => setSpin((value) => !value)}><Orbit /></ToolButton>
              <ToolButton label="Reset 3D view" onClick={() => viewerApi.current?.reset()}><RotateCcw /></ToolButton>
            </div>
            <div className="flex items-center gap-0.5 rounded-xl border bg-card/95 p-1 shadow-sm">
              <ToolButton label="Reduce vertical exaggeration" disabled={exaggeration <= EXAG_MIN} onClick={() => setExaggeration((value) => clampExag(value - EXAG_STEP))}><Minus /></ToolButton>
              <span className="w-11 text-center text-[11px] font-bold tabular-nums" title="Vertical exaggeration">{exaggeration.toFixed(2)}×</span>
              <ToolButton label="Increase vertical exaggeration" disabled={exaggeration >= EXAG_MAX} onClick={() => setExaggeration((value) => clampExag(value + EXAG_STEP))}><Plus /></ToolButton>
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-4 left-4 flex flex-wrap gap-1.5 text-[11px]">
            <Key color="bg-primary" label="Land surface" />
            <Key color="bg-water" label="Water table / flow" />
            {showFractures && <Key color="bg-risk" label="Fracture planes" />}
          </div>
        </section>

        <aside className="space-y-4">
          <Panel title="Layers" action={<span className="text-[11px] text-muted-foreground">3D scene & chart</span>}>
            <div className="space-y-1">
              <LayerRow icon={Layers3} label="Rock strata" detail="Lithology bands and contacts" checked={showGeology} onChange={setShowGeology} />
              <LayerRow icon={Waves} label="Water table" detail="Groundwater level in scene and profile" checked={showWater} onChange={setShowWater} />
              <LayerRow icon={Slash} label="Fracture planes" detail="Interpreted fracture / fault zones" checked={showFractures} onChange={setShowFractures} />
              <LayerRow icon={Play} label="Recharge flow" detail="Animated infiltration to the spring eye" checked={animateFlow} onChange={setAnimateFlow} />
            </div>
          </Panel>
          <Panel title="Transect metrics">
            <div className="grid grid-cols-2 gap-2">
              <Metric label="Length" value={`${metrics.lengthKm.toFixed(2)} km`} />
              <Metric label="Relief" value={`${Math.round(metrics.reliefM)} m`} />
              <Metric label="Max slope" value={`${metrics.steepestSlope.toFixed(1)}°`} />
              <Metric label="Water depth" value={`${Math.round(metrics.meanWaterDepth)} m`} />
            </div>
            <div className="mt-3 rounded-md bg-accent/60 p-3 text-xs">
              <div className="font-semibold">Mean recharge signal</div>
              <div className="mt-1 flex items-center gap-2"><Gauge className="size-4 text-primary" /><b>{Math.round(metrics.meanRecharge * 100)}/100</b><span className="text-muted-foreground">synthetic suitability</span></div>
            </div>
          </Panel>
          {selectedSample && <Panel title="Selected location" action={
            <Button variant="ghost" size="icon" className="size-6" aria-label="Clear selection" onClick={() => setSelectedSample(null)}><X /></Button>}>
            <div className="space-y-1.5 text-sm">
              <Stat label="Distance" value={`${selectedSample.distanceKm.toFixed(2)} km`} />
              <Stat label="Surface elevation" value={`${Math.round(selectedSample.elevation)} m AMSL`} />
              <Stat label="Water table" value={`${Math.round(selectedSample.waterTable)} m AMSL`} />
              <Stat label="Local slope" value={`${selectedSample.slopeDeg.toFixed(1)}°`} />
              <Stat label="Recharge signal" value={`${Math.round(selectedSample.recharge * 100)}/100`} />
            </div>
          </Panel>}
        </aside>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel title="Elevation & groundwater profile" action={
          <span className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded bg-primary" />Surface</span>
            {showWater && <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 border-t-2 border-dashed border-water" />Water table</span>}
          </span>}>
          <div className="mb-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
            <ProfileStat label="Ridge elevation" value={`${Math.round(ridgeElev)} m`} />
            <ProfileStat label="Spring eye" value={`${Math.round(springElev)} m`} />
            <ProfileStat label="Total relief" value={`${Math.round(metrics.reliefM)} m`} />
            <ProfileStat label="Mean water depth" value={`${Math.round(metrics.meanWaterDepth)} m`} />
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={chartData} margin={{ left: 8, right: 12, top: 10, bottom: 0 }}
                onMouseMove={(state) => {
                  const index = typeof state?.activeTooltipIndex === "number" ? state.activeTooltipIndex : -1;
                  const next = index >= 0 ? samples[index] ?? null : null;
                  if ((next?.distanceKm ?? -1) !== (hoverSample?.distanceKm ?? -1)) setHoverSample(next);
                }}
                onMouseLeave={() => setHoverSample(null)}
                onClick={(state) => {
                  const index = typeof state?.activeTooltipIndex === "number" ? state.activeTooltipIndex : -1;
                  if (index >= 0 && samples[index]) setSelectedSample(samples[index]);
                }}>
                <defs>
                  <linearGradient id="surfaceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} /><stop offset="100%" stopColor="var(--primary)" stopOpacity={0.04} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="distanceKm" type="number" domain={[0, "dataMax"]} tickFormatter={(value) => `${Number(value).toFixed(1)} km`} fontSize={10} />
                <YAxis domain={[chartMin, chartMax]} tickFormatter={(value) => `${Math.round(Number(value))}`} fontSize={10} width={46} />
                <Tooltip cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }} formatter={(value, name) => [`${Math.round(Number(value))} m`, name === "elevation" ? "Surface" : "Water table"]} labelFormatter={(value) => `${Number(value).toFixed(2)} km from ridge`} />
                <Area type="monotone" dataKey="elevation" stroke="var(--primary)" strokeWidth={2} fill="url(#surfaceFill)" />
                {showWater && <Area type="monotone" dataKey="water" stroke="var(--water)" strokeWidth={2} fill="transparent" strokeDasharray="6 4" />}
                {hoverSample && !isSelected(hoverSample) && <ReferenceDot x={hoverSample.distanceKm} y={hoverSample.elevation} r={4} fill="var(--water)" stroke="var(--card)" strokeWidth={1.5} />}
                {selectedSample && <ReferenceDot x={selectedSample.distanceKm} y={selectedSample.elevation} r={6} fill="var(--risk)" stroke="var(--card)" strokeWidth={2} />}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">{slopeMarkers.map((sample) => (
            <button key={sample.distanceKm} onClick={() => setSelectedSample(isSelected(sample) ? null : sample)}
              className={"rounded-md border px-2 py-1.5 text-left text-[11px] transition-colors " + (isSelected(sample) ? "border-primary bg-accent" : hoverSample && isHover(sample) ? "border-water/60 bg-muted" : "bg-muted/60 hover:bg-accent")}>
              <span className="text-muted-foreground">{sample.distanceKm.toFixed(1)} km</span>
              <span className="ml-1.5 font-bold">{Math.abs(sample.slopeDeg).toFixed(1)}° slope</span>
              <div className="mt-0.5 text-muted-foreground">{Math.round(sample.elevation)} m AMSL</div>
            </button>
          ))}</div>
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground"><span>Ridge / catchment divide</span><span>Spring eye</span></div>
        </Panel>
        <Panel title="Geological layers">
          <div className="space-y-3">{lithology.map((name, index) => (
            <div key={name} className="flex items-center gap-3 text-sm"><span className="size-4 rounded-sm border" style={{ background: ["#A79078", "#82768E", "#728B98", "#B29C55"][index] }} /><div><b>{name}</b><div className="text-[11px] text-muted-foreground">{index === 0 ? "Weathered / permeable cap" : index === 1 ? "Jointed transition unit" : index === 2 ? "Fractured aquifer horizon" : "Low-permeability basement"}</div></div></div>
          ))}</div>
          <p className="mt-4 border-t pt-3 text-[11px] text-muted-foreground">Conceptual cross-section generated from synthetic terrain and factor data. Contacts, groundwater levels and flow paths require field geophysics and hydrogeological validation.</p>
        </Panel>
      </div>
    </div>
  );
}

function ToolButton({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <Button variant={active ? "default" : "ghost"} size="icon" className="size-7 rounded-lg" aria-label={label} title={label} disabled={disabled} onClick={onClick}>{children}</Button>;
}

function LayerRow({ icon: Icon, label, detail, checked, onChange }: { icon: typeof Layers3; label: string; detail: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50">
    <span className="flex min-w-0 items-center gap-2.5">
      <span className={"grid size-7 shrink-0 place-items-center rounded-md border " + (checked ? "border-primary/25 bg-accent text-primary" : "bg-muted text-muted-foreground")}><Icon className="size-3.5" /></span>
      <span className="min-w-0"><span className="block text-sm font-semibold leading-tight">{label}</span><span className="block truncate text-[11px] text-muted-foreground">{detail}</span></span>
    </span>
    <Switch checked={checked} onCheckedChange={onChange} />
  </label>;
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border bg-muted/50 px-2.5 py-1.5"><span className="text-muted-foreground">{label}</span><div className="text-sm font-extrabold tabular-nums">{value}</div></div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-md bg-muted p-2.5"><div className="text-[10px] text-muted-foreground">{label}</div><div className="mt-0.5 text-base font-extrabold tabular-nums">{value}</div></div>; }
function Stat({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-3"><span className="text-muted-foreground">{label}</span><b className="text-right tabular-nums">{value}</b></div>; }
function Key({ color, label }: { color: string; label: string }) { return <span className="flex items-center gap-1.5 rounded-md border bg-card/95 px-2 py-1 shadow-sm"><span className={`size-2 rounded-full ${color}`} />{label}</span>; }
