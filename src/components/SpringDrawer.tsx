import { Link } from "@tanstack/react-router";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { STATUS_META, type Spring } from "@/lib/demo-data";
import { toast } from "sonner";
import { useStore } from "@/lib/store";

export function StatusBadge({ s }: { s: Spring["status"] }) {
  return <span className={"inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold " + STATUS_META[s].badge}>{STATUS_META[s].label}</span>;
}

export function SpringDrawer({ spring, onClose }: { spring: Spring | null; onClose: () => void }) {
  const { notify } = useStore();
  const s = spring;
  return (
    <Sheet open={!!s} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="z-[1100] w-full overflow-y-auto sm:max-w-md">
        {s && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2"><StatusBadge s={s.status} /><span className="text-xs text-muted-foreground">{s.id}</span></div>
              <SheetTitle className="text-xl">{s.name}</SheetTitle>
              <SheetDescription>{s.village} · {s.type} spring · {s.elevation} m asl</SheetDescription>
            </SheetHeader>
            <div className="space-y-5 px-4 pb-6">
              <div className="grid grid-cols-3 gap-2">
                {[["Discharge", `${s.dischargeLpm} LPM`], ["Baseline", `${s.baselineLpm} LPM`], ["Change", `${Math.round((s.dischargeLpm / s.baselineLpm - 1) * 100)}%`]].map(([k, v]) => (
                  <div key={k} className="rounded-lg border p-2.5"><div className="text-[11px] text-muted-foreground">{k}</div><div className="font-bold">{v}</div></div>
                ))}
              </div>
              <div>
                <div className="mb-2 text-sm font-semibold">Monthly discharge (LPM)</div>
                <div className="h-44">
                  <ResponsiveContainer>
                    <AreaChart data={s.monthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" fontSize={10} />
                      <YAxis fontSize={10} width={28} />
                      <Tooltip />
                      <Area dataKey="baseline" name="5-yr baseline" stroke="var(--muted-foreground)" fill="transparent" strokeDasharray="4 3" />
                      <Area dataKey="current" name="2026" stroke="var(--water)" fill="var(--water)" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-sm"><span className="font-semibold">Vulnerability score</span><span className="font-bold">{s.vulnerability}/100</span></div>
                <Progress value={s.vulnerability} />
                <p className="mt-1 text-xs text-muted-foreground">Composite of discharge decline, recharge-area land use pressure and dependency.</p>
              </div>
              <div>
                <div className="mb-2 text-sm font-semibold">Water quality (last sample)</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-muted p-2">pH <b className="float-right">{s.ph}</b></div>
                  <div className="rounded-lg bg-muted p-2">TDS <b className="float-right">{s.tds} mg/L</b></div>
                  <div className="rounded-lg bg-muted p-2">Turbidity <b className="float-right">{s.turbidity} NTU</b></div>
                  <div className="rounded-lg bg-muted p-2">E. coli <b className={"float-right " + (s.ecoli ? "text-risk" : "text-primary")}>{s.ecoli ? "Present" : "Absent"}</b></div>
                </div>
              </div>
              <div className="rounded-lg border p-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Households dependent</span><b>{s.households}</b></div>
                <div className="flex justify-between"><span className="text-muted-foreground">People (est.)</span><b>{s.reliance.toLocaleString("en-IN")}</b></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Last surveyed</span><b>{s.lastSurveyed}</b></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Coordinates</span><b>{s.lat.toFixed(4)}, {s.lng.toFixed(4)}</b></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button asChild><Link to="/interventions">Plan intervention</Link></Button>
                <Button variant="outline" asChild><Link to="/surveys">Log survey</Link></Button>
                <Button variant="outline" asChild><Link to="/monitoring" search={{ spring: s.id }}>View trends</Link></Button>
                <Button variant="outline" onClick={() => { notify(`Flagged ${s.name} for priority review`); toast.success("Spring flagged for priority review"); }}>Flag for review</Button>
              </div>
              <p className="text-[11px] text-muted-foreground">Synthetic demonstration record — not a verified observation.</p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
