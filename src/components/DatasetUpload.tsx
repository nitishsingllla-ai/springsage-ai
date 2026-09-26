import { useMemo, useRef, useState } from "react";
import { Upload, FileWarning, CheckCircle2, AlertTriangle, Trash2, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore, type UploadedDataset } from "@/lib/store";
import { REGIONS, type RegionId } from "@/lib/demo-data";
import { ImportError, guessMapping, parseFile, validate, type FieldMapping, type ParsedFile } from "@/lib/dataset-import";

const KINDS: { key: UploadedDataset["kind"]; label: string; value: string }[] = [
  { key: "springs", label: "Spring inventory", value: "Discharge (LPM)" },
  { key: "observations", label: "Discharge / water-quality observations", value: "Measured value" },
  { key: "boreholes", label: "Boreholes / wells", value: "Water level (m bgl)" },
];

const sel = "h-9 w-full rounded-md border bg-background px-2 text-sm";

export function DatasetUpload() {
  const { region, uploads, addUpload, removeUpload, toggleUpload, notify } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [map, setMap] = useState<FieldMapping>({ lat: "", lng: "", name: "", value: "" });
  const [kind, setKind] = useState<UploadedDataset["kind"]>("springs");
  const [target, setTarget] = useState<RegionId>(region);
  const [name, setName] = useState("");

  const reset = () => { setFile(null); setParsed(null); setError(null); setName(""); if (input.current) input.current.value = ""; };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    reset(); setFile(f); setBusy(true);
    try {
      const p = await parseFile(f);
      setParsed(p); setMap(guessMapping(p)); setName(f.name.replace(/\.[^.]+$/, "")); setTarget(region);
    } catch (e) {
      setError(e instanceof ImportError ? e.message : "Couldn't read this file. Check that it is plain-text CSV or GeoJSON.");
    } finally { setBusy(false); }
  };

  const needsCoords = parsed && !parsed.coords;
  const mappingMissing = needsCoords && (!map.lat || !map.lng);
  const result = useMemo(() => (parsed && !mappingMissing ? validate(parsed, map, target) : null), [parsed, map, target, mappingMissing]);

  const save = () => {
    if (!parsed || !result || !result.features.length) return;
    const trimmed = name.trim().slice(0, 60);
    if (!trimmed) return toast.error("Give the dataset a name.");
    addUpload({
      id: crypto.randomUUID(), name: trimmed, regionId: target, kind, format: parsed.format,
      features: result.features, visible: true, uploadedAt: new Date().toISOString(),
      valueLabel: map.value ? KINDS.find((k) => k.key === kind)!.value : undefined,
    });
    notify(`Dataset "${trimmed}" imported — ${result.features.length} points`);
    toast.success(`${result.features.length} points imported. Turn them on in Springshed Explorer.`);
    reset();
  };

  const field = (k: keyof FieldMapping, label: string, required: boolean) => (
    <label className="text-xs font-semibold">
      {label}{required && <span className="text-risk"> *</span>}
      <select className={sel + " mt-1 font-normal"} value={map[k]} onChange={(e) => setMap({ ...map, [k]: e.target.value })}>
        <option value="">{required ? "Choose a column…" : "— none —"}</option>
        {parsed!.columns.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    </label>
  );

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}
        className="grid place-items-center rounded-xl border-2 border-dashed bg-muted/40 p-6 text-center">
        {busy ? <Loader2 className="size-7 animate-spin text-primary" /> : <Upload className="size-7 text-primary" />}
        <p className="mt-2 text-sm font-semibold">Drop a .geojson or .csv file, or</p>
        <Button size="sm" variant="outline" className="mt-2" onClick={() => input.current?.click()}>Choose file</Button>
        <input ref={input} type="file" accept=".geojson,.json,.csv,.txt" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <p className="mt-2 text-[11px] text-muted-foreground">Points in decimal degrees (WGS84). Max 5 MB, 5,000 rows. Files stay in your browser.</p>
      </div>

      {error && (
        <div className="flex gap-2 rounded-lg border border-risk/40 bg-risk/10 p-3 text-sm">
          <FileWarning className="size-4 shrink-0 text-risk" /><div><b>{file?.name} couldn't be imported.</b><div>{error}</div></div>
        </div>
      )}

      {parsed && (
        <div className="space-y-4 rounded-xl border p-4">
          <div className="text-sm"><b>{file?.name}</b> · {parsed.format} · {parsed.rows.length} records · {parsed.columns.length} fields
            {parsed.coords && <span className="text-muted-foreground"> · coordinates read from geometry</span>}</div>
          {parsed.warnings.slice(0, 3).map((w) => <div key={w} className="flex gap-2 text-xs text-warning-foreground"><AlertTriangle className="size-3.5 shrink-0" />{w}</div>)}

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-semibold">Dataset name<Input className="mt-1" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} /></label>
            <label className="text-xs font-semibold">Dataset type
              <select className={sel + " mt-1 font-normal"} value={kind} onChange={(e) => setKind(e.target.value as UploadedDataset["kind"])}>
                {KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
              </select></label>
            <label className="text-xs font-semibold">Study area
              <select className={sel + " mt-1 font-normal"} value={target} onChange={(e) => setTarget(e.target.value as RegionId)}>
                {Object.values(REGIONS).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select></label>
          </div>

          <div>
            <div className="mb-2 text-sm font-bold">Match your columns</div>
            <div className="grid gap-3 sm:grid-cols-4">
              {needsCoords && field("lat", "Latitude", true)}
              {needsCoords && field("lng", "Longitude", true)}
              {field("name", "Name / ID", false)}
              {field("value", KINDS.find((k) => k.key === kind)!.value, false)}
            </div>
          </div>

          {mappingMissing && <p className="text-xs text-muted-foreground">Choose the latitude and longitude columns to check the data.</p>}
          {result && (
            <div className="space-y-2 text-sm">
              <div className="flex flex-wrap gap-3">
                <span className="flex items-center gap-1 text-primary"><CheckCircle2 className="size-4" />{result.features.length} valid</span>
                {result.errors.length > 0 && <span className="flex items-center gap-1 text-risk"><FileWarning className="size-4" />{result.errors.length} with problems (will be skipped)</span>}
                {result.outside > 0 && <span className="flex items-center gap-1 text-warning-foreground"><AlertTriangle className="size-4" />{result.outside} fall outside {REGIONS[target].name}</span>}
              </div>
              {result.errors.length > 0 && (
                <ul className="max-h-32 space-y-0.5 overflow-y-auto rounded-md bg-muted p-2 text-xs">
                  {result.errors.slice(0, 50).map((e) => <li key={e.row}>{e.message}</li>)}
                  {result.errors.length > 50 && <li>…and {result.errors.length - 50} more</li>}
                </ul>
              )}
              {result.outside > 0 && result.outside === result.features.length && (
                <p className="text-xs text-warning-foreground">None of the points are inside this study area. Check that you picked the right area.</p>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={save} disabled={!result || !result.features.length}>Import {result?.features.length ?? 0} points</Button>
            <Button variant="ghost" onClick={reset}>Cancel</Button>
          </div>
        </div>
      )}

      {uploads.length > 0 && (
        <div>
          <div className="mb-2 text-sm font-bold">Your datasets</div>
          <div className="space-y-1.5">{uploads.map((d) => (
            <div key={d.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
              <div className="flex-1"><b>{d.name}</b> <span className="text-xs text-muted-foreground">· {d.features.length} pts · {d.format} · {REGIONS[d.regionId].name}</span></div>
              <button onClick={() => toggleUpload(d.id)} aria-label={d.visible ? "Hide on map" : "Show on map"}>{d.visible ? <Eye className="size-4" /> : <EyeOff className="size-4 text-muted-foreground" />}</button>
              <button onClick={() => removeUpload(d.id)} aria-label="Delete dataset"><Trash2 className="size-4 text-risk" /></button>
            </div>))}</div>
        </div>
      )}
    </div>
  );
}
