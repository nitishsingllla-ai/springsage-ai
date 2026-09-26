import { REGIONS, type RegionId } from "./demo-data";
import type { UploadedFeature } from "./store";

export const MAX_BYTES = 5 * 1024 * 1024;
export const MAX_ROWS = 5000;

export interface ParsedFile {
  format: "GeoJSON" | "CSV";
  columns: string[];
  rows: Record<string, unknown>[];
  /** Coordinates already known from GeoJSON geometry */
  coords?: ([number, number] | null)[];
  warnings: string[];
}

export interface FieldMapping { lat: string; lng: string; name: string; value: string }

export class ImportError extends Error {}

function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function parseCsv(text: string): ParsedFile {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) throw new ImportError("The CSV needs a header row and at least one data row.");
  const sep = [",", ";", "\t"].sort((a, b) => lines[0].split(b).length - lines[0].split(a).length)[0];
  const columns = splitCsvLine(lines[0], sep);
  if (columns.some((c) => !c)) throw new ImportError("One or more header cells are empty. Give every column a name.");
  const dup = columns.find((c, i) => columns.indexOf(c) !== i);
  if (dup) throw new ImportError(`The column "${dup}" appears twice. Column names must be unique.`);
  if (lines.length - 1 > MAX_ROWS) throw new ImportError(`This file has ${lines.length - 1} rows; the limit is ${MAX_ROWS}.`);
  const warnings: string[] = [];
  const rows = lines.slice(1).map((l, i) => {
    const cells = splitCsvLine(l, sep);
    if (cells.length !== columns.length) warnings.push(`Row ${i + 2} has ${cells.length} values but the header has ${columns.length}.`);
    return Object.fromEntries(columns.map((c, j) => [c, cells[j] ?? ""]));
  });
  return { format: "CSV", columns, rows, warnings };
}

export function parseGeoJson(text: string): ParsedFile {
  let j: any;
  try { j = JSON.parse(text); } catch (e) { throw new ImportError(`This isn't valid JSON: ${(e as Error).message}`); }
  let feats: any[];
  if (j?.type === "FeatureCollection" && Array.isArray(j.features)) feats = j.features;
  else if (j?.type === "Feature") feats = [j];
  else throw new ImportError('GeoJSON must be a "FeatureCollection" or a single "Feature".');
  if (!feats.length) throw new ImportError("The FeatureCollection has no features.");
  if (feats.length > MAX_ROWS) throw new ImportError(`This file has ${feats.length} features; the limit is ${MAX_ROWS}.`);
  const warnings: string[] = [];
  const colSet = new Set<string>();
  const rows: Record<string, unknown>[] = [];
  const coords: ([number, number] | null)[] = [];
  let nonPoint = 0;
  feats.forEach((f) => {
    const props = f?.properties && typeof f.properties === "object" ? f.properties : {};
    Object.keys(props).forEach((k) => colSet.add(k));
    rows.push(props);
    const g = f?.geometry;
    if (g?.type === "Point" && Array.isArray(g.coordinates)) coords.push([Number(g.coordinates[1]), Number(g.coordinates[0])]);
    else if (g?.type === "MultiPoint" && Array.isArray(g.coordinates?.[0])) coords.push([Number(g.coordinates[0][1]), Number(g.coordinates[0][0])]);
    else { coords.push(null); nonPoint++; }
  });
  if (nonPoint === feats.length) {
    warnings.push("No Point geometry found. Map latitude/longitude from properties instead.");
    return { format: "GeoJSON", columns: [...colSet], rows, warnings };
  }
  if (nonPoint) warnings.push(`${nonPoint} feature(s) are not points (lines/polygons) and will be skipped.`);
  return { format: "GeoJSON", columns: [...colSet], rows, coords, warnings };
}

export async function parseFile(file: File): Promise<ParsedFile> {
  if (file.size === 0) throw new ImportError("The file is empty.");
  if (file.size > MAX_BYTES) throw new ImportError(`The file is ${(file.size / 1048576).toFixed(1)} MB; the limit is 5 MB.`);
  const ext = file.name.toLowerCase().split(".").pop();
  const text = await file.text();
  if (ext === "csv" || ext === "txt") return parseCsv(text);
  if (ext === "geojson" || ext === "json") return parseGeoJson(text);
  throw new ImportError(`".${ext}" files aren't supported. Upload a .geojson, .json or .csv file.`);
}

const guess = (cols: string[], names: string[]) =>
  cols.find((c) => names.includes(c.toLowerCase().replace(/[\s_-]/g, ""))) ?? "";

export function guessMapping(p: ParsedFile): FieldMapping {
  const c = p.columns;
  return {
    lat: p.coords ? "" : guess(c, ["lat", "latitude", "y", "lat_dd", "latdd"]),
    lng: p.coords ? "" : guess(c, ["lng", "lon", "long", "longitude", "x", "londd"]),
    name: guess(c, ["name", "springname", "spring", "id", "site", "station", "label"]),
    value: guess(c, ["discharge", "dischargelpm", "lpm", "flow", "yield", "value", "depth", "waterlevel"]),
  };
}

export interface ValidationRow { row: number; message: string }
export interface ValidationResult { features: UploadedFeature[]; errors: ValidationRow[]; outside: number }

export function validate(p: ParsedFile, m: FieldMapping, regionId: RegionId): ValidationResult {
  const errors: ValidationRow[] = [];
  const features: UploadedFeature[] = [];
  const reg = REGIONS[regionId];
  let outside = 0;
  p.rows.forEach((r, i) => {
    const rowNo = p.format === "CSV" ? i + 2 : i + 1;
    const label = p.format === "CSV" ? `Row ${rowNo}` : `Feature ${rowNo}`;
    let lat: number, lng: number;
    if (p.coords) {
      const c = p.coords[i];
      if (!c) return;
      [lat, lng] = c;
    } else {
      lat = Number(String(r[m.lat] ?? "").replace(",", "."));
      lng = Number(String(r[m.lng] ?? "").replace(",", "."));
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return errors.push({ row: rowNo, message: `${label}: latitude/longitude is missing or not a number.` });
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return errors.push({ row: rowNo, message: `${label}: coordinates (${lat}, ${lng}) are outside valid ranges. Are latitude and longitude swapped?` });
    if (lat < 6 || lat > 37 || lng < 68 || lng > 98) return errors.push({ row: rowNo, message: `${label}: (${lat}, ${lng}) is outside India. Coordinates must be decimal degrees (WGS84).` });
    let value: number | undefined;
    if (m.value) {
      const raw = r[m.value];
      if (raw !== "" && raw != null) {
        value = Number(String(raw).replace(",", "."));
        if (!Number.isFinite(value)) return errors.push({ row: rowNo, message: `${label}: "${m.value}" value "${raw}" is not a number.` });
        if (value < 0) return errors.push({ row: rowNo, message: `${label}: "${m.value}" can't be negative.` });
      }
    }
    if (Math.abs(lat - reg.center[0]) > reg.span * 1.5 || Math.abs(lng - reg.center[1]) > reg.span * 1.8) outside++;
    const name = m.name && r[m.name] ? String(r[m.name]).slice(0, 80) : `Point ${rowNo}`;
    features.push({ lat, lng, name, value, props: r });
  });
  return { features, errors, outside };
}
