import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Play, RotateCcw, Info, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, RegionSelect } from "@/components/AppShell";
import { GeoMap } from "@/components/GeoMap";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useStore } from "@/lib/store";
import { CLASSES, DEFAULT_WEIGHTS, FACTORS, REGIONS, demoProvider, getSprings, type Weights } from "@/lib/demo-data";
import { meta } from "@/lib/meta";

export const Route = createFileRoute("/analysis")({
  head: () => meta("Recharge Analysis", "Run AHP multi-criteria or ensemble ML recharge suitability models with adjustable factor weights."),
  component: Analysis,
});

const STEPS = ["Loading factor rasters", "Normalising & reclassifying layers", "Applying weights / model inference", "Classifying suitability zones", "Computing zonal statistics"];

function Analysis() {
  const { region, weights, setWeights, analysis, setAnalysis, notify } = useStore();
  const [model, setModel] = useState<"ahp" | "rf">(analysis.model);
  const [w, setW] = useState<Weights>(weights);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [explain, setExplain] = useState(false);
  const total = Object.values(w).reduce((a, b) => a + b, 0);

  const run = async () => {
    if (total === 0) return toast.error("At least one factor needs a weight above zero.");
    setRunning(true);
    for (let i = 0; i < STEPS.length; i++) { setStep(i); await new Promise((r) => setTimeout(r, 450)); }
    const res = await demoProvider.runModel(region, model, w);
    setAnalysis(res); setWeights(w); setRunning(false);
    const high = (res.areaByClass[0] + res.areaByClass[1]).toFixed(1);
    notify(`Recharge assessment (${model === "ahp" ? "AHP" : "Random Forest"}) completed — ${high} sq km high potential`);
    toast.success(`Assessment complete · ${high} sq km High/Very High potential`);
  };

  const areaTotal = analysis.areaByClass.reduce((a, b) => a + b, 0);

  return (
    <div>
      <PageHeader title="Recharge Suitability Analysis" subtitle="Weighted overlay of hydrogeological factors to identify probable spring recharge zones."
        actions={<RegionSelect className="w-[240px]" />} />
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="relative h-[62vh] min-h-[440px] overflow-hidden rounded-xl border">
            <GeoMap className="h-full w-full" regionId={region} springs={getSprings(region)} analysis={analysis}
              layers={{ recharge: true, springs: true, boundary: true, lineaments: true }} opacity={0.6} basemap="satellite" />
            {running && (
              <div className="absolute inset-0 z-[600] grid place-items-center bg-background/70 backdrop-blur-sm">
                <div className="w-80 rounded-xl border bg-card p-5 shadow-lg">
                  <div className="mb-3 flex items-center gap-2 font-bold"><Loader2 className="size-4 animate-spin text-primary" />Running {model === "ahp" ? "AHP" : "Random Forest"} model</div>
                  <Progress value={((step + 1) / STEPS.length) * 100} />
                  <ul className="mt-3 space-y-1 text-xs">{STEPS.map((s, i) => (
                    <li key={s} className={i <= step ? "text-foreground" : "text-muted-foreground"}>{i < step ? <CheckCircle2 className="mr-1 inline size-3 text-primary" /> : "·"} {s}</li>))}</ul>
                </div>
              </div>
            )}
            <div className="absolute bottom-3 right-3 z-[500] rounded-lg border bg-card/95 p-3 text-[11px] shadow">
              {CLASSES.map((c) => <div key={c.key} className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: c.color }} />{c.label}</div>)}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="Zone statistics" action={<span className="text-xs text-muted-foreground">{REGIONS[region].areaSqKm} sq km total</span>}>
              <div className="space-y-2.5">{CLASSES.map((c, i) => (
                <div key={c.key}>
                  <div className="flex justify-between text-sm"><span className="flex items-center gap-2"><span className="size-2.5 rounded-sm" style={{ background: c.color }} />{c.label}</span><b>{analysis.areaByClass[i]} sq km <span className="font-normal text-muted-foreground">({Math.round((analysis.areaByClass[i] / areaTotal) * 100)}%)</span></b></div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${(analysis.areaByClass[i] / areaTotal) * 100}%`, background: c.color }} /></div>
                </div>))}</div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-muted p-2.5">Validation accuracy<div className="text-lg font-extrabold">{Math.round(analysis.accuracy * 100)}%</div></div>
                <div className="rounded-lg bg-muted p-2.5">ROC-AUC<div className="text-lg font-extrabold">{analysis.auc}</div></div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">Metrics are illustrative for the demo model, against synthetic spring locations.</p>
            </Panel>
            <Panel title="Feature importance" action={<button onClick={() => setExplain(true)} className="flex items-center gap-1 text-xs font-semibold text-primary"><Info className="size-3.5" />Explain model</button>}>
              <div className="h-60"><ResponsiveContainer><BarChart data={analysis.importance} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" fontSize={10} unit="%" /><YAxis type="category" dataKey="label" fontSize={10} width={100} /><Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>{analysis.importance.map((_, i) => <Cell key={i} fill={i < 3 ? "var(--primary)" : "var(--leaf)"} />)}</Bar>
              </BarChart></ResponsiveContainer></div>
            </Panel>
          </div>
        </div>

        <aside className="space-y-4">
          <Panel title="Model configuration">
            <div className="grid grid-cols-2 gap-2">
              {([["ahp", "Multi-Criteria AHP", "Expert weights, transparent"], ["rf", "Random Forest / Ensemble", "Learns from known springs"]] as const).map(([k, l, d]) => (
                <button key={k} onClick={() => setModel(k)} className={"rounded-lg border p-3 text-left transition-colors " + (model === k ? "border-primary bg-accent/50" : "hover:bg-muted")}>
                  <div className="text-sm font-bold">{l}</div><div className="text-[11px] text-muted-foreground">{d}</div>
                </button>))}
            </div>
            <div className="mt-5 flex items-center justify-between text-sm font-semibold">Factor weights
              <span className={"text-xs " + (total === 100 ? "text-primary" : "text-warning-foreground")}>Σ {total} {total !== 100 && "(normalised)"}</span></div>
            <div className="mt-3 space-y-4">{FACTORS.map((f) => (
              <div key={f.key} title={f.desc}>
                <div className="mb-1.5 flex justify-between text-xs"><span>{f.label}</span><b>{w[f.key]}</b></div>
                <Slider value={[w[f.key]]} min={0} max={40} step={1} onValueChange={([v]) => setW({ ...w, [f.key]: v })} disabled={running} />
              </div>))}</div>
            <div className="mt-5 flex gap-2">
              <Button className="flex-1" onClick={run} disabled={running}>{running ? <Loader2 className="animate-spin" /> : <Play />}Run Recharge Assessment</Button>
              <Button variant="outline" size="icon" onClick={() => setW(DEFAULT_WEIGHTS)} aria-label="Reset weights"><RotateCcw /></Button>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">Last run: {new Date(analysis.runAt).toLocaleString()} · {analysis.model === "ahp" ? "AHP" : "RF"}</p>
          </Panel>
          <Button variant="outline" className="w-full" asChild><Link to="/interventions">Translate zones into interventions →</Link></Button>
        </aside>
      </div>

      <Sheet open={explain} onOpenChange={setExplain}>
        <SheetContent className="z-[1100] overflow-y-auto sm:max-w-lg">
          <SheetHeader><SheetTitle>How this model works</SheetTitle></SheetHeader>
          <div className="space-y-4 px-4 pb-6 text-sm text-muted-foreground">
            <p><b className="text-foreground">AHP (Analytic Hierarchy Process):</b> each factor raster is reclassified to a 0–1 suitability score, then combined as a weighted linear sum: <i>RPI = Σ wᵢ·xᵢ / Σ wᵢ</i>. Weights come from the sliders (expert pairwise judgement).</p>
            <p><b className="text-foreground">Random Forest / Ensemble:</b> trained on known spring and non-spring points; captures interactions such as fractured rock on gentle slopes. The demo engine simulates this with a lineament × slope interaction term.</p>
            <p><b className="text-foreground">Classification:</b> scores are split by quantile breaks into Very High (top 12%), High, Moderate, Low and Very Low.</p>
            <div className="space-y-2">{FACTORS.map((f) => <div key={f.key} className="rounded-lg border p-2.5"><b className="text-foreground">{f.label}.</b> {f.desc}</div>)}</div>
            <p className="rounded-lg bg-warning/10 p-3 text-warning-foreground">Outputs are probabilistic screening results on synthetic data. Field validation by a hydrogeologist is required before siting any structure.</p>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
