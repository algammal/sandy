"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bot, Sparkles } from "lucide-react";
import type { Client } from "@sandy/shared-types";
import { formatDateTime } from "@sandy/shared-utils";
import { Button, EmptyState, GlassPanel, StatusBadge } from "@sandy/ui";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchAgentInstances } from "../../store/slices/agentInstancesSlice";
import { selectClientForMapping } from "../../store/slices/agentConfigurationsSlice";
import { AgentStatusBadge } from "../../components/AgentStatusBadge";
import { getMasterAccountStatusForClient } from "./masterAccountStatus";

const masterAccountTone = { not_connected: "neutral", planned: "warning", connected_demo: "success" } as const;

export function ClientAgentTab({ client }: { client: Client }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const instances = useAppSelector((state) => state.agentInstances.items);
  const configurations = useAppSelector((state) => state.agentConfigurations.configurations);

  useEffect(() => {
    dispatch(fetchAgentInstances());
  }, [dispatch]);

  const instance = instances.find((item) => item.clientId === client.id);
  const history = configurations.filter((config) => config.clientId === client.id).sort((a, b) => b.version - a.version);
  const masterAccount = getMasterAccountStatusForClient(client);

  const openInAgentStudio = () => {
    dispatch(selectClientForMapping(client.id));
    router.push("/agent-studio");
  };

  return (
    <div className="flex flex-col gap-4">
      <GlassPanel className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--sandy-foreground)]">Agent instance</h3>
          {instance ? (
            <p className="text-sm text-[var(--sandy-muted-foreground)]">{instance.agentName}</p>
          ) : (
            <p className="text-sm text-[var(--sandy-muted-foreground)]">No agent configured yet.</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {instance && <AgentStatusBadge status={instance.status} />}
          <Button onClick={openInAgentStudio}>
            <Sparkles className="size-4" /> Open in Agent Studio
          </Button>
        </div>
      </GlassPanel>

      {instance && (
        <GlassPanel className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase text-[var(--sandy-muted-foreground)]">ElevenLabs Agent ID</p>
            <p className="text-sm text-[var(--sandy-foreground)]">{instance.elevenLabsAgentIdPlaceholder ?? "Not provisioned (demo)"}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-[var(--sandy-muted-foreground)]">Last sync</p>
            <p className="text-sm text-[var(--sandy-foreground)]">{instance.lastSyncAt ? formatDateTime(instance.lastSyncAt) : "Never"}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-[var(--sandy-muted-foreground)]">Last error</p>
            <p className="text-sm text-[var(--sandy-foreground)]">{instance.lastError ?? "None"}</p>
          </div>
        </GlassPanel>
      )}

      <GlassPanel className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--sandy-foreground)]">Master / child account (planned)</h3>
          <StatusBadge label={masterAccount.integrationStatus.replace("_", " ")} tone={masterAccountTone[masterAccount.integrationStatus]} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase text-[var(--sandy-muted-foreground)]">Master workspace</p>
            <p className="text-sm text-[var(--sandy-foreground)]">{masterAccount.masterAccountLabel ?? "Not connected"}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-[var(--sandy-muted-foreground)]">Child workspace ID</p>
            <p className="text-sm text-[var(--sandy-foreground)]">{masterAccount.childWorkspaceIdPlaceholder ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-[var(--sandy-muted-foreground)]">Last sync</p>
            <p className="text-sm text-[var(--sandy-foreground)]">{masterAccount.lastSyncAt ? formatDateTime(masterAccount.lastSyncAt) : "Never"}</p>
          </div>
        </div>
        <p className="text-xs text-[var(--sandy-muted-foreground)]">{masterAccount.notes}</p>
      </GlassPanel>

      <GlassPanel className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-[var(--sandy-foreground)]">Configuration history</h3>
        {history.length === 0 ? (
          <EmptyState icon={<Bot className="size-6" />} title="No configurations yet" description="Import and map a configuration in Agent Studio." />
        ) : (
          <ul className="flex flex-col gap-2">
            {history.map((config) => (
              <li key={config.id} className="flex items-center justify-between rounded-lg border border-[var(--sandy-border)] px-3 py-2.5 text-sm">
                <div>
                  <p className="font-medium text-[var(--sandy-foreground)]">Version {config.version}</p>
                  <p className="text-xs text-[var(--sandy-muted-foreground)]">{formatDateTime(config.createdAt)}</p>
                </div>
                <StatusBadge label={`${config.validationIssues.filter((i) => i.severity === "error").length} errors`} tone={config.validationIssues.some((i) => i.severity === "error") ? "danger" : "success"} />
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>
    </div>
  );
}
