import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import {
  REGIONS, CLASSES, LULC, GEOLOGY_COLORS, STATUS_META, STRUCTURES,
  boundary, contours, streams, lineaments, sectors, getGrid,
  type AnalysisResult, type Intervention, type RegionId, type Spring,
} from "@/lib/demo-data";
import { Skeleton } from "@/components/ui/skeleton";

export type LayerKey =
  | "springs" | "contours" | "streams" | "lineaments" | "lulc" | "geology" | "recharge" | "interventions" | "boundary";
export type Basemap = "terrain" | "satellite" | "topo";

export const LAYER_LABELS: Record<LayerKey, string> = {
  springs: "Springs",
  contours: "Elevation Contours",
  streams: "Drainage Network & Streams",
  lineaments: "Lineaments & Fault Zones",
  lulc: "Land Use / Land Cover",
  geology: "Lithology / Geology",
  recharge: "Recharge Potential Heatmap",
  interventions: "Proposed Interventions",
  boundary: "Watershed Boundary",
};

const TILES: Record<Basemap, { url: string; attr: string }> = {
  terrain: { url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", attr: "© OpenTopoMap, © OpenStreetMap" },
  satellite: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attr: "Imagery © Esri" },
  topo: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", attr: "© Esri World Topo" },
};

interface Props {
  regionId: RegionId;
  layers: Partial<Record<LayerKey, boolean>>;
  basemap?: Basemap;
  opacity?: number;
  analysis?: AnalysisResult;
  springs: Spring[];
  interventions?: Intervention[];
  onSpringClick?: (s: Spring) => void;
  onMapClick?: () => void;
  interactive?: boolean;
  measuring?: boolean;
  onMeasure?: (km: number) => void;
  selectedId?: string;
  className?: string;
  mapRef?: (api: { recenter: () => void; zoomIn: () => void; zoomOut: () => void }) => void;
}

export function GeoMap(p: Props) {
  const el = useRef<HTMLDivElement>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const tiles = useRef<Leaflet.TileLayer | null>(null);
  const overlay = useRef<Leaflet.LayerGroup | null>(null);
  const measureGroup = useRef<Leaflet.LayerGroup | null>(null);
  const measurePts = useRef<Leaflet.LatLng[]>([]);
  const cbs = useRef(p);
  cbs.current = p;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((mod) => {
      if (cancelled || !el.current) return;
      const Lf = (mod as any).default ?? mod;
      L.current = Lf;
      const reg = REGIONS[p.regionId];
      const m = Lf.map(el.current, {
        center: reg.center, zoom: 13, zoomControl: false,
        dragging: p.interactive !== false, scrollWheelZoom: p.interactive !== false, attributionControl: true,
      });
      map.current = m;
      overlay.current = Lf.layerGroup().addTo(m);
      measureGroup.current = Lf.layerGroup().addTo(m);
      m.on("click", (e: Leaflet.LeafletMouseEvent) => {
        if (cbs.current.measuring) {
          measurePts.current.push(e.latlng);
          const pts = measurePts.current;
          measureGroup.current!.clearLayers();
          Lf.polyline(pts, { color: "#10382D", dashArray: "6 4", weight: 2 }).addTo(measureGroup.current!);
          pts.forEach((pt) => Lf.circleMarker(pt, { radius: 4, color: "#10382D", fillColor: "#fff", fillOpacity: 1, weight: 2 }).addTo(measureGroup.current!));
          let d = 0;
          for (let i = 1; i < pts.length; i++) d += pts[i - 1].distanceTo(pts[i]);
          cbs.current.onMeasure?.(d / 1000);
        } else cbs.current.onMapClick?.();
      });
      cbs.current.mapRef?.({
        recenter: () => m.flyTo(REGIONS[cbs.current.regionId].center, 13),
        zoomIn: () => m.zoomIn(),
        zoomOut: () => m.zoomOut(),
      });
      setReady(true);
      setTimeout(() => m.invalidateSize(), 100);
    });
    const ro = new ResizeObserver(() => map.current?.invalidateSize());
    if (el.current) ro.observe(el.current);
    return () => { cancelled = true; ro.disconnect(); map.current?.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!p.measuring) { measurePts.current = []; measureGroup.current?.clearLayers(); }
  }, [p.measuring]);

  useEffect(() => {
    if (!ready || !L.current || !map.current) return;
    tiles.current?.remove();
    const t = TILES[p.basemap ?? "terrain"];
    tiles.current = L.current.tileLayer(t.url, { attribution: t.attr, maxZoom: 17 }).addTo(map.current);
    tiles.current.bringToBack();
  }, [ready, p.basemap]);

  useEffect(() => {
    if (!ready || !map.current) return;
    map.current.setView(REGIONS[p.regionId].center, 13);
  }, [ready, p.regionId]);

  useEffect(() => {
    const Lf = L.current, g = overlay.current;
    if (!ready || !Lf || !g) return;
    g.clearLayers();
    const reg = REGIONS[p.regionId];
    const on = p.layers;
    const op = p.opacity ?? 0.55;

    if (on.lulc) sectors(reg, 5).forEach((poly, i) =>
      Lf.polygon(poly, { color: LULC[i % 4].color, weight: 0, fillOpacity: 0.35 }).bindTooltip(LULC[i % 4].label).addTo(g));
    if (on.geology) sectors(reg, 4).forEach((poly, i) =>
      Lf.polygon(poly, { color: "#5b4b3b", weight: 1, dashArray: "2 4", fillColor: GEOLOGY_COLORS[i], fillOpacity: 0.35 }).bindTooltip(reg.lithology[i]).addTo(g));
    if (on.recharge && p.analysis && p.analysis.regionId === p.regionId) {
      const cells = getGrid(p.regionId);
      cells.forEach((c, i) => {
        const cls = CLASSES[p.analysis!.classes[i]];
        Lf.rectangle([[c.lat, c.lng], [c.lat + c.dLat, c.lng + c.dLng]], { stroke: false, fillColor: cls.color, fillOpacity: op })
          .bindTooltip(`${cls.label} recharge · score ${(p.analysis!.scores[i] * 100).toFixed(0)}`).addTo(g);
      });
    }
    if (on.contours) contours(reg).forEach((c) =>
      Lf.polyline(c.path, { color: "#7a5a3a", weight: 1, opacity: 0.6 }).bindTooltip(`${c.level} m`).addTo(g));
    if (on.streams) streams(reg).forEach((s) => Lf.polyline(s, { color: "#3999C6", weight: 2.2, opacity: 0.85 }).addTo(g));
    if (on.lineaments) lineaments(reg).forEach((l) =>
      Lf.polyline(l, { color: "#C9564D", weight: 2, dashArray: "8 5" }).bindTooltip("Lineament / fracture zone (interpreted)").addTo(g));
    if (on.boundary) Lf.polygon(boundary(reg), { color: "#174D3A", weight: 2.5, fill: false, dashArray: "10 6" }).addTo(g);
    if (on.interventions && p.interventions) p.interventions.forEach((iv) => {
      const st = STRUCTURES.find((s) => s.key === iv.type)!;
      Lf.marker([iv.lat, iv.lng], {
        icon: Lf.divIcon({ className: "", html: `<div class="ss-iv">${st.label[0]}</div>`, iconSize: [20, 20] }),
      }).bindTooltip(`${iv.id} · ${st.label} (${iv.priority})`).addTo(g);
    });
    if (on.springs) p.springs.forEach((s) => {
      const sel = s.id === p.selectedId;
      const m = Lf.circleMarker([s.lat, s.lng], {
        radius: sel ? 10 : 7, color: sel ? "#10382D" : "#fff", weight: sel ? 3 : 2,
        fillColor: STATUS_META[s.status].color, fillOpacity: 0.95,
      }).bindTooltip(`<b>${s.name}</b><br/>${s.dischargeLpm} LPM · ${STATUS_META[s.status].label}`);
      m.on("click", (e) => { Lf.DomEvent.stopPropagation(e); cbs.current.onSpringClick?.(s); });
      m.addTo(g);
    });
  }, [ready, p.regionId, p.layers, p.opacity, p.analysis, p.springs, p.interventions, p.selectedId]);

  return (
    <div className={"relative overflow-hidden " + (p.className ?? "")}>
      <div ref={el} className={"absolute inset-0 " + (p.measuring ? "cursor-crosshair" : "")} />
      {!ready && <Skeleton className="absolute inset-0 rounded-none" />}
    </div>
  );
}
