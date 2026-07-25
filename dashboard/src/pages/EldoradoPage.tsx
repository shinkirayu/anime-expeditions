import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SettingsView } from "../components/eldorado/SettingsView";
import { TemplatesView } from "../components/eldorado/TemplatesView";
import { BatchView } from "../components/eldorado/BatchView";
import { BulkAccountsView } from "../components/eldorado/BulkAccountsView";
import { useEldoradoQueue } from "../lib/eldoradoQueue";

type Tab = "settings" | "templates" | "batch" | "bulk";

export default function EldoradoPage() {
  const [tab, setTab] = useState<Tab>("settings");
  const navigate = useNavigate();
  const queue = useEldoradoQueue();

  const tabs: { key: Tab; label: string }[] = [
    { key: "settings", label: "Settings" },
    { key: "templates", label: "Templates" },
    { key: "batch", label: `Batch Queue${queue.items.length ? ` (${queue.items.length})` : ""}` },
    { key: "bulk", label: "Bulk Accounts" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-lg font-semibold tracking-tight">Eldorado</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Seller session, listing templates, the batch queue, and the credential pool for the "List
          on Eldorado" flow on account and unit pages.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-zinc-200 dark:border-white/10">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-t-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
              tab === t.key
                ? "gradient-purple text-white"
                : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/5"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={tab === "batch" || tab === "bulk" ? "max-w-3xl" : "max-w-2xl"}>
        {tab === "settings" && <SettingsView />}
        {tab === "templates" && <TemplatesView />}
        {tab === "batch" && <BatchView onGoToNew={() => navigate("/")} />}
        {tab === "bulk" && <BulkAccountsView />}
      </div>
    </div>
  );
}
