import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel } from "@/components/AppShell";
import { DATA_SOURCES } from "@/lib/demo-data";
import { meta } from "@/lib/meta";

export const Route = createFileRoute("/data-sources")({
  head: () => meta("Data Sources", "Geospatial datasets behind the recharge model: DEM, lineaments, lithology, LULC, rainfall and soils."),
  component: () => (
    <div>
      <PageHeader title="Data Sources" subtitle="Each layer is currently a demonstration sample; connect real datasets through the data provider interface." />
      <Panel><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="pb-2">Dataset</th><th>Intended source</th><th>Used for</th><th>Format</th><th>Status</th></tr></thead>
        <tbody>{DATA_SOURCES.map((d) => <tr key={d.name} className="border-t"><td className="py-2.5 font-semibold">{d.name}</td><td>{d.provider}</td><td>{d.layer}</td><td>{d.format}</td><td><span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning-foreground">{d.status}</span></td></tr>)}</tbody></table></div></Panel>
    </div>
  ),
});
