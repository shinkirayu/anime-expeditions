import { ZeusXSettingsView } from "../components/zeusx/ZeusXSettingsView";

export default function ZeusXPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-lg font-semibold tracking-tight">ZeusX</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Seller session for the "List on ZeusX" flow on account and unit pages.
        </p>
      </div>

      <div className="max-w-2xl">
        <ZeusXSettingsView />
      </div>
    </div>
  );
}
