"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, CirclePlus, Rocket, XCircle } from "lucide-react";
import { diffJson, formatDateTime, summarizeDiff } from "@sandy/shared-utils";
import { Button, ConfirmationDialog, EmptyState, JsonDiffViewer, JsonEditor, StatusBadge, Tabs, useToast } from "@sandy/ui";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { commitActiveConfigurationToClient } from "../../store/slices/agentConfigurationsSlice";
import { ensureAgentInstance, provisionAgent } from "../../store/slices/agentInstancesSlice";
import { buildProcedureRows } from "./procedures";

const subTabs = [
  { value: "diff", label: "Visual Diff" },
  { value: "output", label: "Mapped Output" },
];

export function OutputColumn() {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const { configurations, activeConfigurationId, selectedClientId } = useAppSelector((state) => state.agentConfigurations);
  const clients = useAppSelector((state) => state.clients.items);
  const { items: agentInstances, provisioningStatus, provisioningHistory } = useAppSelector((state) => state.agentInstances);

  const [subTab, setSubTab] = useState("diff");
  const [isProvisionConfirmOpen, setIsProvisionConfirmOpen] = useState(false);
  const [isAddAgentConfirmOpen, setIsAddAgentConfirmOpen] = useState(false);
  const [isAddingAgent, setIsAddingAgent] = useState(false);

  const active = configurations.find((config) => config.id === activeConfigurationId);
  const client = clients.find((c) => c.id === selectedClientId);
  const errorCount = active?.validationIssues.filter((issue) => issue.severity === "error").length ?? 0;
  const lastRecord = client ? provisioningHistory.find((record) => record.clientId === client.id) : undefined;
  const existingInstance = client ? agentInstances.find((instance) => instance.clientId === client.id) : undefined;

  const diffEntries = useMemo(() => (active ? diffJson(active.rawConfig, active.mappedConfig) : []), [active]);
  const summary = useMemo(() => summarizeDiff(diffEntries), [diffEntries]);
  const procedureRows = useMemo(() => (active ? buildProcedureRows(active.rawConfig, active.mappedConfig) : []), [active]);
  const includedProcedures = procedureRows.filter((row) => row.included);
  const excludedProcedures = procedureRows.filter((row) => row.source === "catalog" && !row.included);
  const addedProcedures = procedureRows.filter((row) => row.source === "custom");

  if (!active) {
    return <EmptyState title="Nothing to preview yet" description="Import and map a configuration first." />;
  }

  const handleAddAgent = async () => {
    if (!client) return;
    setIsAddingAgent(true);
    try {
      dispatch(commitActiveConfigurationToClient());
      await dispatch(ensureAgentInstance({ clientId: client.id, agentName: `${client.name} — ${active.name}` })).unwrap();
      showToast({
        tone: "success",
        title: "Agent added",
        description: `${active.name} is now listed for ${client.name} in the Agents section (demo state only).`,
      });
      setIsAddAgentConfirmOpen(false);
    } finally {
      setIsAddingAgent(false);
    }
  };

  const handleCommitAndProvision = async () => {
    if (!client) return;
    dispatch(commitActiveConfigurationToClient());
    const instance = await dispatch(ensureAgentInstance({ clientId: client.id, agentName: `${client.name} Voice Agent` })).unwrap();
    const result = await dispatch(
      provisionAgent({ instanceId: instance.id, clientId: client.id, clientName: client.name, agentConfigurationId: active.id }),
    );
    if (provisionAgent.fulfilled.match(result)) {
      showToast({
        tone: result.payload.record.outcome === "succeeded_demo" ? "success" : "error",
        title: result.payload.record.outcome === "succeeded_demo" ? "Demo provisioning succeeded" : "Demo provisioning failed",
        description: "This is a simulated result — no real ElevenLabs agent was created.",
      });
    }
    setIsProvisionConfirmOpen(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="label-caps text-[var(--sandy-accent)]">Configuration Diff &amp; Output</p>
        <div className="flex gap-1.5">
          <StatusBadge label={`${summary.changed.length} changed`} tone="warning" />
          <StatusBadge label={`${summary.added.length} added`} tone="success" />
          <StatusBadge label={`${summary.unchanged.length} preserved`} tone="neutral" />
        </div>
      </div>

      {procedureRows.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[var(--sandy-border)] bg-[var(--sandy-surface-glass)] p-2">
          <span className="text-xs text-[var(--sandy-muted-foreground)]">Procedures:</span>
          <StatusBadge label={`${includedProcedures.length} included`} tone="success" />
          {excludedProcedures.length > 0 && <StatusBadge label={`${excludedProcedures.length} excluded`} tone="neutral" />}
          {addedProcedures.length > 0 && <StatusBadge label={`${addedProcedures.length} added`} tone="primary" />}
        </div>
      )}

      <Tabs items={subTabs} value={subTab} onChange={setSubTab} />

      <div className="max-h-[420px] overflow-y-auto">
        {subTab === "diff" && <JsonDiffViewer entries={diffEntries} />}
        {subTab === "output" && (
          <JsonEditor value={JSON.stringify(active.mappedConfig, null, 2)} readOnly height={400} ariaLabel="Mapped configuration" />
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-[var(--sandy-border-strong)] bg-[var(--sandy-surface-glass-strong)] p-3">
        <Button onClick={() => setIsAddAgentConfirmOpen(true)} disabled={!client || errorCount > 0}>
          <CirclePlus className="size-4" /> {existingInstance ? "Update Agent" : "Add Agent"}
        </Button>
        {!client && <p className="text-xs text-[var(--sandy-muted-foreground)]">Select a client in the panel on the left to add this agent.</p>}
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-[var(--sandy-border-strong)] bg-[var(--sandy-surface-glass-strong)] p-3">
        <StatusBadge label="DEMO ONLY — no real agent is created" tone="warning" />
        <p className="text-xs text-[var(--sandy-muted-foreground)]">
          Client: {client ? client.name : "No client selected"} · Blocking errors: {errorCount}
        </p>
        <Button variant="outline" onClick={() => setIsProvisionConfirmOpen(true)} disabled={!client || errorCount > 0}>
          <Rocket className="size-4" /> Simulate Agent Provisioning (Demo)
        </Button>
        {errorCount > 0 && (
          <p className="text-xs text-[var(--sandy-danger)]">Resolve blocking validation errors in Diagnostics before provisioning.</p>
        )}
        {lastRecord && (
          <div className="flex items-center gap-2 border-t border-[var(--sandy-border)] pt-2 text-xs">
            {lastRecord.outcome === "succeeded_demo" ? (
              <CheckCircle2 className="size-3.5 text-[var(--sandy-success)]" />
            ) : (
              <XCircle className="size-3.5 text-[var(--sandy-danger)]" />
            )}
            <span className="text-[var(--sandy-muted-foreground)]">
              Last run {formatDateTime(lastRecord.requestedAt)} — {lastRecord.outcome === "succeeded_demo" ? lastRecord.simulatedReference : lastRecord.errorMessage}
            </span>
          </div>
        )}
      </div>

      <ConfirmationDialog
        isOpen={isAddAgentConfirmOpen}
        onClose={() => setIsAddAgentConfirmOpen(false)}
        onConfirm={handleAddAgent}
        title={existingInstance ? "Update this agent?" : "Add this agent?"}
        confirmLabel={existingInstance ? "Confirm & Update" : "Confirm & Add Agent"}
        isConfirming={isAddingAgent}
        description={[
          `${active.name} → ${client?.name ?? "no client selected"}.`,
          `${summary.changed.length} field(s) changed, ${summary.added.length} added since the original import.`,
          `Procedures: ${includedProcedures.length} included${excludedProcedures.length ? `, ${excludedProcedures.length} excluded` : ""}${addedProcedures.length ? `, ${addedProcedures.length} custom added` : ""}.`,
          existingInstance
            ? "This updates the existing agent entry in the Agents section."
            : "This creates a new entry in the Agents section (demo state only — no real ElevenLabs agent is created).",
        ].join(" ")}
      />

      <ConfirmationDialog
        isOpen={isProvisionConfirmOpen}
        onClose={() => setIsProvisionConfirmOpen(false)}
        onConfirm={handleCommitAndProvision}
        title="Provision this agent? (Demo)"
        description={`This simulates provisioning "${active.name}" for ${client?.name ?? "the selected client"}. No real ElevenLabs API request is made and no real agent is created.`}
        confirmLabel="Provision (demo)"
        isConfirming={provisioningStatus === "loading"}
      />
    </div>
  );
}
