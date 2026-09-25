import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader, Panel, RegionSelect } from "@/components/AppShell";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { meta } from "@/lib/meta";

export const Route = createFileRoute("/settings")({
  head: () => meta("Settings", "Configure study area, demonstration mode and local data for SpringSage AI."),
  component: Settings,
});

function Settings() {
  const { demoMode, setDemoMode } = useStore();
  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" />
      <div className="space-y-4">
        <Panel title="Study area"><RegionSelect className="w-full" /></Panel>
        <Panel title="Demonstration mode"><label className="flex items-center justify-between text-sm">Show synthetic-data banner and labels<Switch checked={demoMode} onCheckedChange={setDemoMode} /></label></Panel>
        <Panel title="Local data"><Button variant="outline" onClick={() => { localStorage.removeItem("springsage"); toast.success("Local data cleared — reloading"); setTimeout(() => location.reload(), 600); }}>Reset surveys & preferences</Button></Panel>
      </div>
    </div>
  );
}
