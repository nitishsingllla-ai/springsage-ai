import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Droplets, AlertTriangle, Mountain, Hammer, Users, TrendingDown, Layers, ClipboardList, FileText, ArrowRight, Activity } from "lucide-react";
import { PageHeader, Panel, RegionSelect } from "@/components/AppShell";
import { GeoMap } from "@/components/GeoMap";
import { StatusBadge } from "@/components/SpringDrawer";
import { useStore } from "@/lib/store";
import { ACTIVITY, CLASSES, REGIONS, STATUS_META, getInterventions, getSprings, type SpringStatus } from "@/lib/demo-data";
import { meta } from "@/lib/meta";

export const Route = createFileRoute("/")({
  head: () => meta("Mountain Water Intelligence", "Monitor spring systems, assess recharge potential and prioritise field interventions across mountain springsheds."),
  component: Overview,
});

function Overview() {
  const { region, analysis } = useStore();
  const nav = useNavigate();
  const reg = REGIONS[region];
  const springs = getSprings(region);
  const interventions = useMemo(() => getInterventions(region), [region]);
  const m = reg.metrics;

  const dist = (["healthy", "declining", "critical", "dry"] as SpringStatus[]).map((k) => ({
    name: STATUS_META[k].label, value: springs.filter((s) => s.status === k).length, color: STATUS_META[k].color,
  }));
  const bars = CLASSES.map((c, i) => ({ name: c.label, area: analysis.areaByClass[i], color: c.color }));
  const top = [...springs].sort((a, b) => b.vulnerability - a.vulnerability).slice(0, 5);

  const kpis = [
    { label: "Total Springs Mapped", value: m.springs, icon: Droplets, tone: "text-water" },
    { label: "Critical Springs at Risk", value: m.critical, icon: AlertTriangle, tone: "text-risk" },
    { label: "High Recharge Potential", value: `${m.highRechargeSqKm} sq km`, icon: Mountain, tone: "text-primary" },
    { label: "Recommended Interventions", value: m.interventions, icon: Hammer, tone: "text-warning-foreground" },
    { label: "Community Reliance", value: `${m.reliance.toLocaleString("en-IN")} people`, icon: Users, tone: "text-primary" },
    { label: "Seasonal Discharge Trend", value: `${m.dischargeTrend}%`, sub: "vs 5-yr baseline", icon: TrendingDown, tone: "text-risk" },
  ];

  return (
    <div>
      <PageHeader title="Mountain Water Intelligence" subtitle="Monitor spring systems, assess recharge potential, and prioritize field interventions."
        actions={<RegionSelect className="w-[240px]" />} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border bg-card p-4 transition-shadow hover:shadow-md">
            <k.icon className={"size-5 " + k.tone} />
            <div className="mt-3 text-xl font-extrabold">{k.value}</div>
            <div className="text-xs text-muted-foreground">{k.label}{k.sub && <> · {k.sub}</>}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { to: "/analysis", label: "Run Recharge Analysis", icon: Layers },
          { to: "/interventions", label: "Plan Interventions", icon: Hammer },
          { to: "/surveys", label: "Log Field Survey", icon: ClipboardList },
          { to: "/reports", label: "Generate DPR Summary", icon: FileText },
        ].map((a) => (
          <Link key={a.to} to={a.to} className="group flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm font-semibold transition-colors hover:border-primary/40 hover:bg-accent/40">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground"><a.icon className="size-4" /></span>
            {a.label}<ArrowRight className="ml-auto size-4 opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title={<>Watershed map <span className="ml-1 text-xs font-normal text-muted-foreground">{reg.name}</span></>}
          action={<Link to="/explorer" className="text-sm font-semibold text-primary">Open full explorer →</Link>}>
          <GeoMap className="h-[380px] rounded-lg" regionId={region} springs={springs} interventions={interventions} analysis={analysis}
            layers={{ springs: true, boundary: true, recharge: true, interventions: true }} opacity={0.35}
            onSpringClick={(s) => nav({ to: "/explorer", search: { spring: s.id } })} onMapClick={() => nav({ to: "/analysis" })} />
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            {Object.values(STATUS_META).map((s) => <span key={s.label} className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: s.color }} />{s.label}</span>)}
            <span className="flex items-center gap-1.5"><span className="ss-iv !size-3.5 !border" />Intervention</span>
            <span className="ml-auto">Click a spring for its profile, or the map to open analysis.</span>
          </div>
        </Panel>
        <div className="grid gap-4">
          <Panel title="Spring Health Distribution">
            <div className="flex items-center gap-4">
              <div className="h-40 w-40">
                <ResponsiveContainer><PieChart><Pie data={dist} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={2}>
                  {dist.map((d) => <Cell key={d.name} fill={d.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
              </div>
              <div className="space-y-2 text-sm">{dist.map((d) => <div key={d.name} className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: d.color }} />{d.name}<b className="ml-2">{d.value}</b></div>)}</div>
            </div>
          </Panel>
          <Panel title="Recharge Suitability (sq km)">
            <div className="h-40"><ResponsiveContainer><BarChart data={bars} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" fontSize={10} /><YAxis type="category" dataKey="name" fontSize={11} width={70} /><Tooltip />
              <Bar dataKey="area" radius={[0, 4, 4, 0]}>{bars.map((b) => <Cell key={b.name} fill={b.color} />)}</Bar>
            </BarChart></ResponsiveContainer></div>
          </Panel>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Priority Action List" action={<span className="text-xs text-muted-foreground">Top 5 by vulnerability</span>}>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr><th className="pb-2">Spring</th><th>Status</th><th>Discharge</th><th>Change</th><th>People</th><th>Score</th><th></th></tr></thead>
            <tbody>{top.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="py-2.5"><div className="font-semibold">{s.name}</div><div className="text-xs text-muted-foreground">{s.id}</div></td>
                <td><StatusBadge s={s.status} /></td>
                <td>{s.dischargeLpm} LPM</td>
                <td className="text-risk">{Math.round((s.dischargeLpm / s.baselineLpm - 1) * 100)}%</td>
                <td>{s.reliance}</td>
                <td className="font-bold">{s.vulnerability}</td>
                <td><Link to="/explorer" search={{ spring: s.id }} className="text-xs font-semibold text-primary">View</Link></td>
              </tr>))}</tbody>
          </table></div>
        </Panel>
        <Panel title="Recent Activity">
          <ul className="space-y-3">{ACTIVITY[region].map((a, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className={"mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg " + (a.kind === "alert" ? "bg-risk/10 text-risk" : a.kind === "survey" ? "bg-water/10 text-water" : "bg-accent text-primary")}>
                {a.kind === "alert" ? <AlertTriangle className="size-3.5" /> : a.kind === "survey" ? <ClipboardList className="size-3.5" /> : a.kind === "analysis" ? <Activity className="size-3.5" /> : <FileText className="size-3.5" />}
              </span>
              <div><div>{a.text}</div><div className="text-xs text-muted-foreground">{a.t}</div></div>
            </li>))}</ul>
        </Panel>
      </div>
    </div>
  );
}
