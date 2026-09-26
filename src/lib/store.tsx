import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_WEIGHTS, runRecharge, type AnalysisResult, type RegionId, type Weights } from "./demo-data";

export interface Survey {
  id: string;
  regionId: RegionId;
  springName: string;
  surveyor: string;
  date: string;
  lat: number;
  lng: number;
  volumeL: number;
  seconds: number;
  dischargeLpm: number;
  ph: number;
  tds: number;
  turbidity: number;
  notes: string;
  photos: number;
  status: "Pending" | "Approved" | "Rejected";
}

export interface UploadedFeature { lat: number; lng: number; name: string; value?: number; props: Record<string, unknown> }
export interface UploadedDataset {
  id: string; name: string; regionId: RegionId; kind: "springs" | "observations" | "boreholes";
  format: "GeoJSON" | "CSV"; features: UploadedFeature[]; visible: boolean; uploadedAt: string;
  valueLabel?: string;
}

export interface Notice { id: string; text: string; t: string; read: boolean }

interface Store {
  region: RegionId;
  setRegion: (r: RegionId) => void;
  demoMode: boolean;
  setDemoMode: (v: boolean) => void;
  weights: Weights;
  setWeights: (w: Weights) => void;
  analysis: AnalysisResult;
  setAnalysis: (a: AnalysisResult) => void;
  surveys: Survey[];
  addSurvey: (s: Survey) => void;
  updateSurvey: (id: string, status: Survey["status"]) => void;
  notices: Notice[];
  notify: (text: string) => void;
  markRead: () => void;
  online: boolean;
  uploads: UploadedDataset[];
  addUpload: (d: UploadedDataset) => void;
  removeUpload: (id: string) => void;
  toggleUpload: (id: string) => void;
}

const Ctx = createContext<Store | null>(null);

const SEED_SURVEYS: Survey[] = [
  { id: "SV-1001", regionId: "himalayan", springName: "Jageshwar Dhara 1", surveyor: "K. Bisht", date: "2026-09-22", lat: 29.635, lng: 79.68, volumeL: 10, seconds: 42, dischargeLpm: 14.3, ph: 7.1, tds: 188, turbidity: 2.1, notes: "Flow reduced vs last monsoon.", photos: 2, status: "Pending" },
  { id: "SV-1002", regionId: "himalayan", springName: "Kasar Devi Naula 1", surveyor: "Community volunteer — R. Devi", date: "2026-09-20", lat: 29.61, lng: 79.64, volumeL: 5, seconds: 61, dischargeLpm: 4.9, ph: 6.8, tds: 240, turbidity: 5.4, notes: "Chamber cracked; cattle access.", photos: 3, status: "Approved" },
  { id: "SV-1003", regionId: "tribal", springName: "Pottangi Jharna 1", surveyor: "S. Majhi", date: "2026-09-18", lat: 18.83, lng: 82.73, volumeL: 10, seconds: 75, dischargeLpm: 8.0, ph: 6.6, tds: 120, turbidity: 3.2, notes: "Used by 60 households.", photos: 1, status: "Pending" },
];

export function StoreProvider({ children }: { children: ReactNode }) {
  const [region, setRegionState] = useState<RegionId>("himalayan");
  const [demoMode, setDemoMode] = useState(true);
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [analysis, setAnalysis] = useState<AnalysisResult>(() => runRecharge("himalayan", "ahp", DEFAULT_WEIGHTS));
  const [surveys, setSurveys] = useState<Survey[]>(SEED_SURVEYS);
  const [notices, setNotices] = useState<Notice[]>([
    { id: "n1", text: "3 springs dropped below 30% of baseline discharge", t: "5h ago", read: false },
    { id: "n2", text: "2 field surveys awaiting approval", t: "Yesterday", read: false },
  ]);
  const [online, setOnline] = useState(true);
  const [uploads, setUploads] = useState<UploadedDataset[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("springsage");
      if (raw) {
        const d = JSON.parse(raw);
        if (d.region) setRegionState(d.region);
        if (d.surveys) setSurveys(d.surveys);
        if (typeof d.demoMode === "boolean") setDemoMode(d.demoMode);
        if (d.uploads) setUploads(d.uploads);
        const w = d.weights ?? DEFAULT_WEIGHTS;
        if (d.weights) setWeights(d.weights);
        setAnalysis(runRecharge(d.region ?? "himalayan", d.model === "rf" ? "rf" : "ahp", w));
      }
    } catch {}
    setOnline(navigator.onLine);
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    try { localStorage.setItem("springsage", JSON.stringify({ region, surveys, demoMode, uploads, weights, model: analysis.model })); } catch {}
  }, [region, surveys, demoMode, uploads, weights, analysis.model]);

  const setRegion = (r: RegionId) => {
    setRegionState(r);
    setAnalysis(runRecharge(r, analysis.model, weights));
  };
  const notify = (text: string) => setNotices((n) => [{ id: crypto.randomUUID(), text, t: "Just now", read: false }, ...n]);

  return (
    <Ctx.Provider value={{
      region, setRegion, demoMode, setDemoMode, weights, setWeights, analysis, setAnalysis,
      surveys, addSurvey: (s) => setSurveys((x) => [s, ...x]),
      updateSurvey: (id, status) => setSurveys((x) => x.map((s) => (s.id === id ? { ...s, status } : s))),
      uploads, addUpload: (d) => setUploads((x) => [d, ...x]),
      removeUpload: (id) => setUploads((x) => x.filter((d) => d.id !== id)),
      toggleUpload: (id) => setUploads((x) => x.map((d) => (d.id === id ? { ...d, visible: !d.visible } : d))),
      notices, notify, markRead: () => setNotices((n) => n.map((x) => ({ ...x, read: true }))), online,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore outside provider");
  return c;
}

export function download(filename: string, content: string, type = "text/plain") {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
