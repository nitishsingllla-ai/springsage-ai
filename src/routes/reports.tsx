import { createFileRoute } from "@tanstack/react-router";
import { FileText, FileJson, Table, Map } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useStore, download } from "@/lib/store";
import { CLASSES, REGIONS, getSprings } from "@/lib/demo-data";
import { meta } from "@/lib/meta";
import { ExportBuilder } from "@/components/ExportBuilder";

export const Route = createFileRoute("/reports")({
  head: () => meta("Reports & Export", "Generate springshed summary reports and export springs and recharge zones as GeoJSON or CSV."),
  component: Reports,
});

function Reports() {
  const { region, analysis, surveys } = useStore();
  const reg = REGIONS[region];
  const springs = getSprings(region);
  const log = (x: string) => toast.success(`${x} exported`);
  const items = [
    { icon: FileText, title: "Springshed summary report", desc: "Printable report with KPIs and zone stats (Save as PDF).", go: () => {
      const w = window.open("", "_blank"); if (!w) return toast.error("Allow pop-ups to print the report");
      w.document.write(`<html><head><title>SpringSage report</title></head><body style="font-family:sans-serif;padding:32px"><h1>SpringSage AI — ${reg.name}</h1><p><i>Demonstration data — not verified findings.</i></p><ul>${Object.entries(reg.metrics).map(([k, v]) => `<li>${k}: ${v}</li>`).join("")}</ul><h2>Recharge zones (${analysis.model.toUpperCase()})</h2><ul>${CLASSES.map((c, i) => `<li>${c.label}: ${analysis.areaByClass[i]} sq km</li>`).join("")}</ul><h2>Springs</h2><table border=1 cellpadding=4>${springs.map((s) => `<tr><td>${s.id}</td><td>${s.name}</td><td>${s.status}</td><td>${s.dischargeLpm} LPM</td></tr>`).join("")}</table></body></html>`);
      w.document.close(); w.print(); } },
    { icon: FileJson, title: "Springs GeoJSON", desc: "Point features with all attributes.", go: () => { download(`springs_${region}.geojson`, JSON.stringify({ type: "FeatureCollection", features: springs.map(({ monthly, ...p }) => ({ type: "Feature", geometry: { type: "Point", coordinates: [p.lng, p.lat] }, properties: p })) }, null, 2), "application/geo+json"); log("GeoJSON"); } },
    { icon: Table, title: "Springs CSV", desc: "Tabular inventory for spreadsheets.", go: () => { const h = ["id", "name", "village", "lat", "lng", "elevation", "status", "dischargeLpm", "baselineLpm", "reliance", "vulnerability"]; download(`springs_${region}.csv`, [h.join(","), ...springs.map((s) => h.map((k) => (s as any)[k]).join(","))].join("\n"), "text/csv"); log("CSV"); } },
    { icon: Map, title: "Recharge zones CSV", desc: "Classified grid cells with scores.", go: () => { download(`recharge_${region}.csv`, "cell,score,class\n" + analysis.scores.map((s, i) => `${i},${s.toFixed(3)},${CLASSES[analysis.classes[i]].label}`).join("\n"), "text/csv"); log("Recharge CSV"); } },
    { icon: Table, title: "Field surveys CSV", desc: "All submitted ground-truth records.", go: () => { download("surveys.csv", "id,spring,surveyor,date,lpm,status\n" + surveys.map((s) => `${s.id},${s.springName},${s.surveyor},${s.date},${s.dischargeLpm},${s.status}`).join("\n"), "text/csv"); log("Surveys CSV"); } },
    { icon: FileJson, title: "Shapefile package", desc: "Requires GIS server connection.", go: () => toast.info("Shapefile export is available once a GIS backend is connected. Use GeoJSON for now.") },
  ];
  return (
    <div>
      <PageHeader title="Reports, Data Export & Audit" subtitle={`Exports for ${reg.name}. All files are labelled as demonstration data.`} />
      <Panel title="Custom export" className="mb-4"><ExportBuilder /></Panel>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((i) => (
        <Panel key={i.title}><i.icon className="size-6 text-primary" /><div className="mt-3 font-bold">{i.title}</div><p className="mb-4 text-sm text-muted-foreground">{i.desc}</p><Button variant="outline" onClick={i.go}>Generate</Button></Panel>))}</div>
    </div>
  );
}
