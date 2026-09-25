import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, RegionSelect } from "@/components/AppShell";
import { GeoMap } from "@/components/GeoMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore, download } from "@/lib/store";
import { REGIONS, STRUCTURES, formatINR, getInterventions, getSprings, type StructureKey } from "@/lib/demo-data";
import { meta } from "@/lib/meta";

export const Route = createFileRoute("/interventions")({
  head: () => meta("Intervention Planner", "Convert recharge zones into costed trenches, check dams, ponds and afforestation with a DPR summary."),
  component: Planner,
});

function Planner() {
  const { region, analysis } = useStore();
  const reg = REGIONS[region];
  const ivs = useMemo(() => getInterventions(region), [region]);
  const init = useMemo(() => {
    const q: Record<string, number> = {};
    STRUCTURES.forEach((s) => (q[s.key] = ivs.filter((i) => i.type === s.key).reduce((a, b) => a + b.qty, 0)));
    return q as Record<StructureKey, number>;
  }, [ivs]);
  const [qty, setQty] = useState(init);
  const [contingency, setContingency] = useState(10);
  const q = { ...init, ...qty };
  const rows = STRUCTURES.map((s) => ({ ...s, n: q[s.key], cost: q[s.key] * s.unitCost, rech: q[s.key] * s.recharge }));
  const sub = rows.reduce((a, r) => a + r.cost, 0);
  const total = Math.round(sub * (1 + contingency / 100));
  const recharge = rows.reduce((a, r) => a + r.rech, 0);

  const dpr = () => {
    const txt = `SPRINGSAGE AI — DPR EXECUTIVE SUMMARY (DEMONSTRATION)\n\nStudy area: ${reg.name}, ${reg.state}\nArea: ${reg.areaSqKm} sq km\nModel: ${analysis.model.toUpperCase()} · High+Very High recharge: ${(analysis.areaByClass[0] + analysis.areaByClass[1]).toFixed(1)} sq km\nSprings: ${reg.metrics.springs} (critical ${reg.metrics.critical}) · Reliance ${reg.metrics.reliance} people\n\nPROPOSED WORKS\n${rows.map((r) => `- ${r.label}: ${r.n} ${r.unit} @ ${formatINR(r.unitCost)} = ${formatINR(r.cost)}`).join("\n")}\n\nSubtotal: ${formatINR(sub)}\nContingency ${contingency}%\nTOTAL ESTIMATE: ${formatINR(total)}\nEst. additional recharge: ${recharge.toLocaleString("en-IN")} m³/yr\n\nNote: synthetic demo figures; unit rates indicative, verify against state SOR.`;
    download(`DPR_${region}.txt`, txt);
    toast.success("DPR summary exported");
  };

  return (
    <div>
      <PageHeader title="Intervention Planner & DPR Estimator" subtitle="Recommended recharge structures sited on high-potential zones above priority springs." actions={<><RegionSelect /><Button onClick={dpr}><FileDown />Export DPR summary</Button></>} />
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <GeoMap className="h-[60vh] min-h-[420px] rounded-xl border" regionId={region} springs={getSprings(region)} interventions={ivs} analysis={analysis}
          layers={{ recharge: true, interventions: true, springs: true, boundary: true, streams: true }} opacity={0.35} />
        <Panel title="Cost & budget estimator (INR)">
          <div className="space-y-3">{rows.map((r) => (
            <div key={r.key} className="flex items-center gap-3 text-sm">
              <div className="flex-1"><div className="font-semibold">{r.label}</div><div className="text-xs text-muted-foreground">{formatINR(r.unitCost)} {r.unit}</div></div>
              <Input type="number" min={0} className="h-8 w-20" value={r.n} onChange={(e) => setQty({ ...q, [r.key]: Math.max(0, +e.target.value || 0) })} />
              <div className="w-28 text-right font-semibold">{formatINR(r.cost)}</div>
            </div>))}</div>
          <div className="mt-4 space-y-1.5 border-t pt-3 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><b>{formatINR(sub)}</b></div>
            <div className="flex items-center justify-between"><span>Contingency %</span><Input type="number" className="h-8 w-20" value={contingency} onChange={(e) => setContingency(+e.target.value || 0)} /></div>
            <div className="flex justify-between text-base"><span className="font-bold">Total estimate</span><b className="text-primary">{formatINR(total)}</b></div>
            <div className="flex justify-between text-muted-foreground"><span>Est. added recharge</span><span>{recharge.toLocaleString("en-IN")} m³/yr</span></div>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">Indicative demo rates; align with MGNREGA / state Schedule of Rates.</p>
        </Panel>
      </div>
      <Panel className="mt-4" title={`Site-level recommendations (${ivs.length})`}>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="pb-2">ID</th><th>Structure</th><th>Qty</th><th>Serves spring</th><th>Priority</th></tr></thead>
          <tbody>{ivs.map((i) => <tr key={i.id} className="border-t"><td className="py-2">{i.id}</td><td>{STRUCTURES.find((s) => s.key === i.type)!.label}</td><td>{i.qty}</td><td>{i.springId}</td>
            <td><span className={"rounded-full px-2 py-0.5 text-xs font-semibold " + (i.priority === "High" ? "bg-risk/15 text-risk" : i.priority === "Medium" ? "bg-warning/15 text-warning-foreground" : "bg-muted")}>{i.priority}</span></td></tr>)}</tbody></table></div>
      </Panel>
    </div>
  );
}
