import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel } from "@/components/AppShell";
import { DatasetUpload } from "@/components/DatasetUpload";
import { DATA_SOURCES } from "@/lib/demo-data";
import { meta } from "@/lib/meta";

export const Route = createFileRoute("/data-sources")({
  head: () => meta("Data Sources", "Upload real spring and hydrological datasets as GeoJSON or CSV, and review the layers behind the recharge model."),
  component: () => (
    <div className="space-y-4">
      <PageHeader title="Data Sources" subtitle="Upload your own field data, or review the demonstration layers the model uses." />
      <Panel title="Upload hydrological data"><DatasetUpload /></Panel>
      <Panel title="Model input layers"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="pb-2">Dataset</th><th>Intended source</th><th>Used for</th><th>Format</th><th>Status</th></tr></thead>
        <tbody>{DATA_SOURCES.map((d) => <tr key={d.name} className="border-t"><td className="py-2.5 font-semibold">{d.name}</td><td>{d.provider}</td><td>{d.layer}</td><td>{d.format}</td><td><span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning-foreground">{d.status}</span></td></tr>)}</tbody></table></div></Panel>
    </div>
  ),
});
