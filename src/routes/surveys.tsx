import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LocateFixed, Camera, Check, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { REGIONS, getSprings } from "@/lib/demo-data";
import { meta } from "@/lib/meta";

export const Route = createFileRoute("/surveys")({
  head: () => meta("Field Surveys", "Ground-truth spring discharge and water quality with GPS-tagged field and community surveys."),
  component: Surveys,
});

function Surveys() {
  const { region, surveys, addSurvey, updateSurvey, notify } = useStore();
  const springs = getSprings(region);
  const [f, setF] = useState({ springName: springs[0].name, surveyor: "", lat: "", lng: "", volumeL: "10", seconds: "", ph: "", tds: "", turbidity: "", notes: "", photos: 0 });
  const [err, setErr] = useState<Record<string, string>>({});
  const lpm = +f.volumeL > 0 && +f.seconds > 0 ? (+f.volumeL / +f.seconds) * 60 : 0;

  const gps = () => {
    const fallback = () => { const c = REGIONS[region].center; setF((x) => ({ ...x, lat: (c[0] + (Math.random() - 0.5) * 0.02).toFixed(5), lng: (c[1] + (Math.random() - 0.5) * 0.02).toFixed(5) })); toast.info("Demo GPS fix applied within study area"); };
    if (!navigator.geolocation) return fallback();
    navigator.geolocation.getCurrentPosition(() => fallback(), fallback, { timeout: 3000 });
  };
  const submit = () => {
    const e: Record<string, string> = {};
    if (!f.surveyor.trim()) e.surveyor = "Surveyor name is required";
    if (!f.lat || !f.lng) e.gps = "Capture GPS location";
    if (!(+f.seconds > 0)) e.seconds = "Enter fill time in seconds";
    if (f.ph && (+f.ph < 0 || +f.ph > 14)) e.ph = "pH must be 0–14";
    setErr(e);
    if (Object.keys(e).length) return toast.error("Please fix the highlighted fields");
    const id = `SV-${1000 + surveys.length + 1}`;
    addSurvey({ id, regionId: region, springName: f.springName, surveyor: f.surveyor, date: new Date().toISOString().slice(0, 10), lat: +f.lat, lng: +f.lng, volumeL: +f.volumeL, seconds: +f.seconds, dischargeLpm: +lpm.toFixed(1), ph: +f.ph || 0, tds: +f.tds || 0, turbidity: +f.turbidity || 0, notes: f.notes, photos: f.photos, status: "Pending" });
    notify(`New field survey ${id} submitted for ${f.springName}`);
    toast.success(`Survey ${id} submitted for approval`);
    setF({ ...f, seconds: "", ph: "", tds: "", turbidity: "", notes: "", photos: 0 });
  };
  const list = surveys.filter((s) => s.regionId === region);
  const field = (k: keyof typeof f, label: string, ph = "") => (
    <div><Label className="text-xs">{label}</Label><Input className="mt-1" value={f[k] as string} placeholder={ph} onChange={(e) => setF({ ...f, [k]: e.target.value })} />{err[k] && <p className="mt-1 text-xs text-risk">{err[k]}</p>}</div>
  );

  return (
    <div>
      <PageHeader title="Field Surveys & Community Validation" subtitle="Ground-truth model predictions with bucket-method discharge and water quality readings." />
      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <Panel title="New survey">
          <div className="space-y-3">
            <div><Label className="text-xs">Spring</Label><select className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm" value={f.springName} onChange={(e) => setF({ ...f, springName: e.target.value })}>{springs.map((s) => <option key={s.id}>{s.name}</option>)}</select></div>
            {field("surveyor", "Surveyor / volunteer", "e.g. K. Bisht")}
            <div><div className="flex items-end gap-2"><div className="flex-1">{field("lat", "Latitude")}</div><div className="flex-1">{field("lng", "Longitude")}</div><Button variant="outline" onClick={gps}><LocateFixed />GPS</Button></div>{err.gps && <p className="mt-1 text-xs text-risk">{err.gps}</p>}</div>
            <div className="grid grid-cols-2 gap-2">{field("volumeL", "Container volume (L)")}{field("seconds", "Fill time (s)")}</div>
            <div className="rounded-lg bg-accent/50 p-3 text-sm">Calculated discharge: <b>{lpm.toFixed(1)} LPM</b></div>
            <div className="grid grid-cols-3 gap-2">{field("ph", "pH")}{field("tds", "TDS mg/L")}{field("turbidity", "Turbidity")}</div>
            <div><Label className="text-xs">Notes</Label><Textarea className="mt-1" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Source condition, usage, observations" /></div>
            <Button variant="outline" className="w-full" onClick={() => { setF({ ...f, photos: f.photos + 1 }); toast.info("Photo attached (simulated)"); }}><Camera />Attach photo ({f.photos})</Button>
            <Button className="w-full" onClick={submit}>Submit survey</Button>
          </div>
        </Panel>
        <Panel title={`Submitted surveys (${list.length})`}>
          {list.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No surveys for this study area yet. Submit the first one on the left.</p> :
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="pb-2">ID</th><th>Spring</th><th>Surveyor</th><th>Date</th><th>LPM</th><th>pH</th><th>Status</th><th></th></tr></thead>
            <tbody>{list.map((s) => <tr key={s.id} className="border-t"><td className="py-2">{s.id}</td><td>{s.springName}</td><td>{s.surveyor}</td><td>{s.date}</td><td>{s.dischargeLpm}</td><td>{s.ph || "—"}</td>
              <td><span className={"rounded-full px-2 py-0.5 text-xs font-semibold " + (s.status === "Approved" ? "bg-accent text-primary" : s.status === "Rejected" ? "bg-risk/15 text-risk" : "bg-warning/15 text-warning-foreground")}>{s.status}</span></td>
              <td>{s.status === "Pending" && <div className="flex gap-1"><Button size="icon" variant="outline" className="size-7" onClick={() => { updateSurvey(s.id, "Approved"); toast.success(`${s.id} approved`); }}><Check /></Button><Button size="icon" variant="outline" className="size-7" onClick={() => { updateSurvey(s.id, "Rejected"); toast(`${s.id} rejected`); }}><X /></Button></div>}</td></tr>)}</tbody></table></div>}
        </Panel>
      </div>
    </div>
  );
}
