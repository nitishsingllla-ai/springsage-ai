import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  LayoutDashboard, Map, Layers, Hammer, Activity, ClipboardList, FileDown, Database, Settings,
  Search, Bell, HelpCircle, Droplets, Menu, ChevronRight, MapPin, User,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { REGIONS, getSprings, type RegionId } from "@/lib/demo-data";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/explorer", label: "Springshed Explorer", icon: Map },
  { to: "/analysis", label: "Recharge Analysis", icon: Layers },
  { to: "/interventions", label: "Intervention Planner", icon: Hammer },
  { to: "/monitoring", label: "Spring Monitoring", icon: Activity },
  { to: "/surveys", label: "Field Surveys", icon: ClipboardList },
  { to: "/reports", label: "Reports & Export", icon: FileDown },
  { to: "/data-sources", label: "Data Sources", icon: Database },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-9 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
        <Droplets className="size-5" />
      </div>
      <div>
        <div className="text-[15px] font-extrabold leading-tight text-sidebar-accent-foreground">SpringSage AI</div>
        <div className="text-[10.5px] text-sidebar-foreground/70">Springshed Intelligence</div>
      </div>
    </div>
  );
}

function SidebarBody({ onNav }: { onNav?: () => void }) {
  const { region, online } = useStore();
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-5 py-5"><Logo /></div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {NAV.map((n) => {
          const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
          return (
            <Link key={n.to} to={n.to} onClick={onNav}
              className={"flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors " +
                (active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground")}>
              <n.icon className={"size-4 " + (active ? "text-sidebar-primary" : "")} />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="m-3 space-y-3 rounded-xl border border-sidebar-border p-3">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-full bg-sidebar-accent"><User className="size-4" /></div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-sidebar-accent-foreground">Watershed Analyst</div>
            <div className="truncate text-[11px] text-sidebar-foreground/70">Field & Planning Division</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px]"><MapPin className="size-3" /><span className="truncate">{REGIONS[region].name}</span></div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className={"size-2 rounded-full " + (online ? "bg-sidebar-primary" : "bg-warning")} />
          {online ? "Online · synced" : "Offline · cached locally"}
        </div>
      </div>
    </div>
  );
}

function GlobalSearch() {
  const { region, setRegion } = useStore();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const results = useMemo(() => {
    if (!q.trim()) return [];
    const t = q.toLowerCase();
    const out: { label: string; sub: string; go: () => void }[] = [];
    (Object.keys(REGIONS) as RegionId[]).forEach((rid) => {
      if (REGIONS[rid].name.toLowerCase().includes(t)) out.push({ label: REGIONS[rid].name, sub: "Region", go: () => setRegion(rid) });
      getSprings(rid).forEach((s) => {
        if (s.name.toLowerCase().includes(t) || s.id.toLowerCase().includes(t) || s.village.toLowerCase().includes(t))
          out.push({ label: s.name, sub: `${s.id} · ${s.village} · ${REGIONS[rid].name}`, go: () => { if (rid !== region) setRegion(rid); nav({ to: "/explorer", search: { spring: s.id } }); } });
      });
    });
    return out.slice(0, 8);
  }, [q, region, nav, setRegion]);
  return (
    <div className="relative w-full max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search springs, villages, regions…"
        className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" />
      {open && q && (
        <div className="absolute z-[1000] mt-1 w-full overflow-hidden rounded-xl border bg-popover shadow-lg">
          {results.length === 0 ? <div className="p-3 text-sm text-muted-foreground">No matches for “{q}”</div> :
            results.map((r, i) => (
              <button key={i} onMouseDown={() => { r.go(); setQ(""); setOpen(false); }} className="block w-full px-3 py-2 text-left hover:bg-muted">
                <div className="text-sm font-medium">{r.label}</div>
                <div className="text-xs text-muted-foreground">{r.sub}</div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

export function RegionSelect({ className }: { className?: string }) {
  const { region, setRegion } = useStore();
  return (
    <Select value={region} onValueChange={(v) => setRegion(v as RegionId)}>
      <SelectTrigger className={"h-9 " + (className ?? "w-[220px]")}><MapPin className="size-3.5 text-primary" /><SelectValue /></SelectTrigger>
      <SelectContent className="z-[1100]">
        {(Object.keys(REGIONS) as RegionId[]).map((r) => <SelectItem key={r} value={r}>{REGIONS[r].name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { demoMode, setDemoMode, notices, markRead } = useStore();
  const [mobile, setMobile] = useState(false);
  const [help, setHelp] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const current = NAV.find((n) => (n.to === "/" ? path === "/" : path.startsWith(n.to)));
  const unread = notices.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[250px] lg:block"><SidebarBody /></aside>
      <Sheet open={mobile} onOpenChange={setMobile}>
        <SheetContent side="left" className="w-[260px] border-0 p-0"><SidebarBody onNav={() => setMobile(false)} /></SheetContent>
      </Sheet>
      <div className="lg:pl-[250px]">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur md:px-6">
          <button className="lg:hidden" onClick={() => setMobile(true)} aria-label="Open menu"><Menu className="size-5" /></button>
          <div className="hidden items-center gap-1.5 text-sm md:flex">
            <span className="text-muted-foreground">SpringSage</span>
            <ChevronRight className="size-3.5 text-muted-foreground" />
            <span className="font-semibold">{current?.label ?? "Page"}</span>
          </div>
          <div className="mx-auto flex flex-1 justify-center px-2"><GlobalSearch /></div>
          <RegionSelect className="hidden w-[210px] xl:flex" />
          <label className="hidden items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium md:flex">
            <Switch checked={demoMode} onCheckedChange={setDemoMode} /> Demo
          </label>
          <Popover onOpenChange={(o) => !o && markRead()}>
            <PopoverTrigger className="relative rounded-lg p-2 hover:bg-muted" aria-label="Notifications">
              <Bell className="size-[18px]" />
              {unread > 0 && <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-risk text-[10px] font-bold text-primary-foreground">{unread}</span>}
            </PopoverTrigger>
            <PopoverContent align="end" className="z-[1100] w-80 p-0">
              <div className="border-b px-4 py-3 text-sm font-semibold">Notifications</div>
              <div className="max-h-80 overflow-auto">
                {notices.map((n) => (
                  <div key={n.id} className="border-b px-4 py-2.5 last:border-0">
                    <div className="flex gap-2 text-sm">{!n.read && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-water" />}{n.text}</div>
                    <div className="text-xs text-muted-foreground">{n.t}</div>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <button onClick={() => setHelp(true)} className="rounded-lg p-2 hover:bg-muted" aria-label="Help"><HelpCircle className="size-[18px]" /></button>
          <DropdownMenu>
            <DropdownMenuTrigger className="grid size-8 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">WA</DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[1100]">
              <DropdownMenuLabel>Watershed Analyst<div className="text-xs font-normal text-muted-foreground">Field & Planning Division</div></DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link to="/settings">Settings</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/reports">My reports</Link></DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDemoMode(!demoMode)}>{demoMode ? "Exit" : "Enter"} demo mode</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        {demoMode && (
          <div className="border-b bg-warning/10 px-6 py-1.5 text-center text-xs text-warning-foreground">
            Demonstration mode — all springs, layers and model outputs are <b>synthetic sample data</b>, not verified field findings.
          </div>
        )}
        <main className="p-4 md:p-6">{children}</main>
      </div>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="z-[1200]">
          <DialogHeader><DialogTitle>How to use SpringSage AI</DialogTitle></DialogHeader>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Pick a study area in the top bar — it carries across every page.</li>
            <li>Explore springs and GIS layers in <b>Springshed Explorer</b>; click a spring for its profile.</li>
            <li>Tune factor weights and run the model in <b>Recharge Analysis</b>.</li>
            <li>Convert high-potential zones into costed works in <b>Intervention Planner</b> and export a DPR summary.</li>
            <li>Log ground-truth measurements in <b>Field Surveys</b> and approve them.</li>
          </ol>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold md:text-[26px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={"rounded-xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)] " + (className ?? "")}>
      {title && <div className="flex items-center justify-between border-b px-5 py-3.5"><h2 className="text-[15px] font-bold">{title}</h2>{action}</div>}
      <div className="p-5">{children}</div>
    </section>
  );
}
