import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Eye, EyeOff, Gauge, Layers3, Mountain, Play, RotateCcw, Waves } from "lucide-react";
import { CrossSectionViewer } from "@/components/CrossSectionViewer";
import { PageHeader, Panel, RegionSelect } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/lib/store";
import { REGIONS, getSprings, type Spring } from "@/lib/demo-data";
import { representativeTransect, sampleTransect, transectMetrics, type TransectSample } from "@/lib/transect";
import { meta } from "@/lib/meta";

export const Route = createFileRoute("/cross-section")({
  ssr: false,
  head: () => meta("3D Hydrogeological Cross-Section", "Explore ridge-to-spring elevation, lithology, fractures, water table and animated recharge flow paths."),
  component: CrossSectionPage,
});

function CrossSectionPage() {
  const { region, transect, setTransect } = useStore();
  const [exaggeration, setExaggeration] = useState(1.35);
  const [showGeology, setShowGeology] = useState(true);
  const [showWater, setShowWater] = useState(true);
  const [animateFlow, setAnimateFlow] = useState(true);
  const [resetKey, setResetKey] = useState(0);
  const [selectedSample, setSelectedSample] = useState<TransectSample | null>(null);
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

  const chooseSpring = (springId: string) => {
    setTransect(representativeTransect(region, springId));
    setSelectedSample(null);
    setResetKey((value) => value + 1);
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setTransect(representativeTransect(region)); setSelectedSample(null); }}><Mountain />Representative transect</Button>
          <Button variant="outline" size="icon" aria-label="Reset 3D camera" title="Reset 3D camera" onClick={() => setResetKey((value) => value + 1)}><RotateCcw /></Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="relative min-h-[500px] overflow-hidden rounded-xl border bg-card p-2 shadow-sm">
          <CrossSectionViewer
            transect={active}
            exaggeration={exaggeration}
            showGeology={showGeology}
            showWater={showWater}
            animateFlow={animateFlow}
            resetKey={resetKey}
            onSampleSelect={setSelectedSample}
          />
          <div className="pointer-events-none absolute left-5 top-5 rounded-md border bg-card/95 px-3 py-2 text-xs shadow-sm">
            <div className="font-bold">Ridge → Spring eye</div>
            <div className="text-muted-foreground">Drag to orbit · scroll to zoom · click terrain to inspect</div>
          </div>
          <div className="pointer-events-none absolute bottom-5 left-5 flex flex-wrap gap-2 text-[11px]">
            <Key color="bg-primary" label="Land surface" />
            <Key color="bg-water" label="Water table / flow" />
            <Key color="bg-risk" label="Fracture planes" />
          </div>
        </section>

        <aside className="space-y-4">
          <Panel title="View controls">
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex justify-between text-xs font-semibold"><span>Vertical exaggeration</span><span>{exaggeration.toFixed(2)}×</span></div>
                <Slider value={[exaggeration]} min={0.75} max={2.5} step={0.05} onValueChange={([value]) => setExaggeration(value)} />
              </div>
              <Toggle icon={Layers3} label="Rock strata" checked={showGeology} onChange={setShowGeology} />
              <Toggle icon={Waves} label="Water table" checked={showWater} onChange={setShowWater} />
              <Toggle icon={Play} label="Animate recharge flow" checked={animateFlow} onChange={setAnimateFlow} />
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
          {selectedSample && <Panel title="Selected location">
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
        <Panel title="Elevation & groundwater profile" action={<span className="text-xs text-muted-foreground">Elevation in metres AMSL</span>}>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={chartData} margin={{ left: 8, right: 12, top: 10, bottom: 0 }} onClick={(state) => {
                const index = typeof state?.activeTooltipIndex === "number" ? state.activeTooltipIndex : -1;
                if (index >= 0 && samples[index]) setSelectedSample(samples[index]);
              }}>
                <defs>
                  <linearGradient id="surfaceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} /><stop offset="100%" stopColor="var(--primary)" stopOpacity={0.04} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="distanceKm" type="number" domain={[0, "dataMax"]} tickFormatter={(value) => `${Number(value).toFixed(1)} km`} fontSize={10} />
                <YAxis domain={[chartMin, chartMax]} tickFormatter={(value) => `${Math.round(Number(value))}`} fontSize={10} width={46} />
                <Tooltip formatter={(value, name) => [`${Math.round(Number(value))} m`, name === "elevation" ? "Surface" : "Water table"]} labelFormatter={(value) => `${Number(value).toFixed(2)} km from ridge`} />
                <Area type="monotone" dataKey="elevation" stroke="var(--primary)" strokeWidth={2} fill="url(#surfaceFill)" />
                {showWater && <Area type="monotone" dataKey="water" stroke="var(--water)" strokeWidth={2} fill="transparent" strokeDasharray="6 4" />}
                {selectedSample && <ReferenceDot x={selectedSample.distanceKm} y={selectedSample.elevation} r={5} fill="var(--risk)" stroke="var(--card)" />}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">{slopeMarkers.map((sample) => (
            <button key={sample.distanceKm} onClick={() => setSelectedSample(sample)} className="rounded-md border bg-muted/60 px-2 py-1.5 text-left text-[11px] hover:bg-accent">
              <span className="text-muted-foreground">{sample.distanceKm.toFixed(1)} km</span><span className="ml-1.5 font-bold">{Math.abs(sample.slopeDeg).toFixed(1)}° slope</span>
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

function Toggle({ icon: Icon, label, checked, onChange }: { icon: typeof Eye; label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2">{checked ? <Icon className="size-4 text-primary" /> : <EyeOff className="size-4 text-muted-foreground" />}{label}</span><Switch checked={checked} onCheckedChange={onChange} /></label>;
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-md bg-muted p-2.5"><div className="text-[10px] text-muted-foreground">{label}</div><div className="mt-0.5 text-base font-extrabold">{value}</div></div>; }
function Stat({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-3"><span className="text-muted-foreground">{label}</span><b className="text-right">{value}</b></div>; }
function Key({ color, label }: { color: string; label: string }) { return <span className="flex items-center gap-1.5 rounded-md border bg-card/95 px-2 py-1 shadow-sm"><span className={`size-2 rounded-full ${color}`} />{label}</span>; }
