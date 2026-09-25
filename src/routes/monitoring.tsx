import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, Panel, RegionSelect } from "@/components/AppShell";
import { StatusBadge } from "@/components/SpringDrawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { getSprings } from "@/lib/demo-data";
import { meta } from "@/lib/meta";

export const Route = createFileRoute("/monitoring")({
  validateSearch: z.object({ spring: z.string().optional() }),
  head: () => meta("Spring Monitoring", "Seasonal discharge, rainfall correlation, water quality trends and community impact for each spring."),
  component: Monitoring,
});

function Monitoring() {
  const { region } = useStore();
  const springs = getSprings(region);
  const { spring } = Route.useSearch();
  const nav = useNavigate({ from: "/monitoring" });
  const s = springs.find((x) => x.id === spring) ?? springs[0];
  const quality = s.monthly.map((m, i) => ({ month: m.month, ph: +(s.ph + Math.sin(i) * 0.2).toFixed(2), tds: Math.round(s.tds * (1 + Math.cos(i / 2) * 0.12)), turbidity: +(s.turbidity * (i >= 5 && i <= 8 ? 1.8 : 0.8)).toFixed(1) }));
  const years = [2021, 2022, 2023, 2024, 2025, 2026].map((y, i) => ({ year: y, lean: +(s.baselineLpm * 0.6 * (1 - i * 0.04)).toFixed(1), monsoon: +(s.baselineLpm * 1.4 * (1 - i * 0.025)).toFixed(1), people: s.reliance + i * 12 }));
  return (
    <div>
      <PageHeader title="Spring Monitoring & Time-Series" subtitle="Track discharge seasonality, rainfall response and water quality over time."
        actions={<><RegionSelect /><Select value={s.id} onValueChange={(v) => nav({ search: { spring: v } })}><SelectTrigger className="h-9 w-[240px]"><SelectValue /></SelectTrigger>
          <SelectContent className="z-[1100]">{springs.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent></Select></>} />
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4 text-sm"><b>{s.name}</b><StatusBadge s={s.status} /><span className="text-muted-foreground">{s.id} · {s.village} · {s.elevation} m</span><span className="ml-auto">Now {s.dischargeLpm} LPM vs baseline {s.baselineLpm} LPM</span></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Discharge vs rainfall (monthly)"><div className="h-64"><ResponsiveContainer><ComposedChart data={s.monthly}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="month" fontSize={11} /><YAxis yAxisId="l" fontSize={11} /><YAxis yAxisId="r" orientation="right" fontSize={11} /><Tooltip /><Legend />
          <Bar yAxisId="r" dataKey="rainfall" name="Rainfall (mm)" fill="var(--water)" fillOpacity={0.3} /><Line yAxisId="l" dataKey="current" name="Discharge 2026 (LPM)" stroke="var(--primary)" strokeWidth={2} /><Line yAxisId="l" dataKey="baseline" name="Baseline" stroke="var(--muted-foreground)" strokeDasharray="4 3" /></ComposedChart></ResponsiveContainer></div></Panel>
        <Panel title="Seasonal discharge comparison (yearly)"><div className="h-64"><ResponsiveContainer><LineChart data={years}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="year" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Legend /><Line dataKey="monsoon" name="Post-monsoon" stroke="var(--water)" strokeWidth={2} /><Line dataKey="lean" name="Lean season" stroke="var(--risk)" strokeWidth={2} /></LineChart></ResponsiveContainer></div></Panel>
        <Panel title="Water quality trends"><div className="h-64"><ResponsiveContainer><LineChart data={quality}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="month" fontSize={11} /><YAxis yAxisId="l" fontSize={11} /><YAxis yAxisId="r" orientation="right" fontSize={11} /><Tooltip /><Legend /><Line yAxisId="r" dataKey="tds" name="TDS mg/L" stroke="var(--warning)" /><Line yAxisId="l" dataKey="turbidity" name="Turbidity NTU" stroke="var(--risk)" /><Line yAxisId="l" dataKey="ph" name="pH" stroke="var(--primary)" /></LineChart></ResponsiveContainer></div></Panel>
        <Panel title="Community impact tracker"><div className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg bg-muted p-3">Households<div className="text-xl font-extrabold">{s.households}</div></div>
          <div className="rounded-lg bg-muted p-3">People served<div className="text-xl font-extrabold">{s.reliance}</div></div>
          <div className="rounded-lg bg-muted p-3">Per-capita (lean)<div className="text-xl font-extrabold">{((s.dischargeLpm * 1440) / s.reliance).toFixed(1)} L/d</div></div></div>
          <p className="mt-3 text-sm text-muted-foreground">{(s.dischargeLpm * 1440) / s.reliance < 40 ? "Below the 40 L/person/day rural norm — prioritise recharge works and source protection." : "Meets the 40 L/person/day rural norm at current discharge."}</p></Panel>
      </div>
    </div>
  );
}
