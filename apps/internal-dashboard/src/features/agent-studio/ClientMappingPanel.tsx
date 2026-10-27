"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Wand2 } from "lucide-react";
import { Button, EmptyState, FormField, Input, Select, StatusBadge, Textarea } from "@sandy/ui";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchClients } from "../../store/slices/clientsSlice";
import { fetchBusinessInfo } from "../../store/slices/businessInfoSlice";
import {
  addProcedureToActiveConfiguration,
  applyMappingToActiveConfiguration,
  removeProcedureFromActiveConfiguration,
  selectClientForMapping,
  toggleProcedureInclusion,
} from "../../store/slices/agentConfigurationsSlice";
import { SubmissionStatusBadge } from "../../components/SubmissionStatusBadge";
import { buildProcedureRows, PROCEDURE_CATALOG } from "./procedures";

export function ClientMappingPanel() {
  const dispatch = useAppDispatch();
  const clients = useAppSelector((state) => state.clients);
  const businessInfoState = useAppSelector((state) => state.businessInfo);
  const agentRequestsState = useAppSelector((state) => state.agentRequests);
  const { configurations, activeConfigurationId, selectedClientId } = useAppSelector((state) => state.agentConfigurations);

  const [selectedAgentRequestId, setSelectedAgentRequestId] = useState<string>("");
  const [isAddingProcedure, setIsAddingProcedure] = useState(false);
  const [procedureName, setProcedureName] = useState("");
  const [procedureTrigger, setProcedureTrigger] = useState("");
  const [procedureMessage, setProcedureMessage] = useState("");

  const active = configurations.find((config) => config.id === activeConfigurationId);
  const selectedClient = clients.items.find((client) => client.id === selectedClientId);
  const requestsForClient = selectedClientId ? (agentRequestsState.byClientId[selectedClientId] ?? []) : [];
  const selectedAgentRequest = requestsForClient.find((request) => request.id === selectedAgentRequestId) ?? null;

  useEffect(() => {
    if (clients.status === "idle") dispatch(fetchClients());
  }, [dispatch, clients.status]);

  useEffect(() => {
    if (selectedClientId) dispatch(fetchBusinessInfo(selectedClientId));
    setSelectedAgentRequestId("");
  }, [dispatch, selectedClientId]);

  const info = selectedClientId ? businessInfoState.byClientId[selectedClientId] : undefined;

  const applyMapping = () => {
    if (!selectedClient || !info) return;
    dispatch(
      applyMappingToActiveConfiguration({
        client: selectedClient,
        businessProfile: info.businessProfile.businessName ? info.businessProfile : null,
        properties: info.properties,
        compounds: info.compounds,
        faqs: info.faqs,
        contacts: info.contacts,
        agentRequest: selectedAgentRequest,
      }),
    );
  };

  const applyCatalogEntry = (catalogName: string) => {
    const entry = PROCEDURE_CATALOG.find((item) => item.name === catalogName);
    if (!entry) return;
    setProcedureName(entry.name);
    setProcedureTrigger(entry.trigger);
  };

  const handleAddProcedure = () => {
    if (!procedureName.trim() || !procedureTrigger.trim() || !procedureMessage.trim()) return;
    dispatch(
      addProcedureToActiveConfiguration({
        name: procedureName.trim(),
        trigger: procedureTrigger.trim(),
        message: procedureMessage.trim(),
      }),
    );
    setProcedureName("");
    setProcedureTrigger("");
    setProcedureMessage("");
    setIsAddingProcedure(false);
  };

  if (!active) {
    return <EmptyState title="Import a configuration first" description="Mapping and procedures require an active imported configuration." />;
  }

  const procedureRows = buildProcedureRows(active.rawConfig, active.mappedConfig);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="label-caps mb-3 text-[var(--sandy-accent)]">Client Mapping</p>
        <div className="flex flex-col gap-3">
          <Select
            value={selectedClientId ?? ""}
            onChange={(event) => dispatch(selectClientForMapping(event.target.value || null))}
            placeholder="Choose a client…"
            options={clients.items.map((client) => ({ value: client.id, label: client.name }))}
          />

          {selectedClient && (
            <div className="flex items-center gap-2">
              <SubmissionStatusBadge status={selectedClient.submissionStatus} />
              <span className="text-xs text-[var(--sandy-muted-foreground)]">{selectedClient.businessCategory}</span>
            </div>
          )}

          {selectedClient && (
            <Select
              value={selectedAgentRequestId}
              onChange={(event) => setSelectedAgentRequestId(event.target.value)}
              placeholder={requestsForClient.length === 0 ? "No requested agents" : "Map onto which requested agent?"}
              options={requestsForClient.map((request) => ({ value: request.id, label: request.label }))}
            />
          )}

          <Button onClick={applyMapping} disabled={!selectedClient || !info} className="self-stretch">
            <Wand2 className="size-4" /> Apply Rules
          </Button>

          {selectedAgentRequest && (
            <div className="flex flex-wrap gap-2 border-t border-[var(--sandy-border)] pt-3">
              <StatusBadge label={selectedAgentRequest.language} tone="info" />
              <StatusBadge label={selectedAgentRequest.tone.replace("_", " ")} tone="primary" />
              <StatusBadge label={`${selectedAgentRequest.robotSensitivity} delivery`} tone="neutral" />
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-[var(--sandy-border)] pt-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="label-caps text-[var(--sandy-accent)]">
            Procedures {procedureRows.length > 0 && `(${procedureRows.filter((r) => r.included).length}/${procedureRows.length})`}
          </p>
          <Button size="sm" variant="secondary" onClick={() => setIsAddingProcedure((open) => !open)}>
            <Plus className="size-4" /> Add
          </Button>
        </div>

        <p className="mb-3 text-xs text-[var(--sandy-muted-foreground)]">
          Check a procedure to include it in the working configuration (left panel); uncheck to exclude it. Imported
          procedures can be toggled back on later — procedures you add here can only be removed.
        </p>

        {isAddingProcedure && (
          <div className="mb-3 flex flex-col gap-3 rounded-xl border border-[var(--sandy-border-strong)] bg-[var(--sandy-surface-glass)] p-3">
            <FormField label="Start from a known pattern" hint="Optional — fills in the name and trigger below.">
              <Select
                placeholder="Choose a pattern…"
                options={PROCEDURE_CATALOG.map((entry) => ({ value: entry.name, label: entry.name }))}
                onChange={(event) => applyCatalogEntry(event.target.value)}
              />
            </FormField>
            <FormField label="Name" htmlFor="procedure-name">
              <Input id="procedure-name" value={procedureName} onChange={(event) => setProcedureName(event.target.value)} placeholder="e.g. Pricing question" />
            </FormField>
            <FormField label="Trigger condition" htmlFor="procedure-trigger" hint="When should this rule fire?">
              <Textarea
                id="procedure-trigger"
                rows={2}
                value={procedureTrigger}
                onChange={(event) => setProcedureTrigger(event.target.value)}
                placeholder="The caller asks how much the service costs."
              />
            </FormField>
            <FormField label="Response" htmlFor="procedure-message" hint="The fixed line the agent says, then ends this branch.">
              <Textarea
                id="procedure-message"
                rows={2}
                value={procedureMessage}
                onChange={(event) => setProcedureMessage(event.target.value)}
                placeholder="Pricing depends on your needs — I'll have our team follow up with details."
              />
            </FormField>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsAddingProcedure(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddProcedure} disabled={!procedureName.trim() || !procedureTrigger.trim() || !procedureMessage.trim()}>
                Add procedure
              </Button>
            </div>
          </div>
        )}

        {procedureRows.length === 0 ? (
          <p className="text-sm text-[var(--sandy-muted-foreground)]">
            No procedures yet. Import a folder with <code className="font-technical">procedures/structured/*.json</code> files, or add one above.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {procedureRows.map((row) => (
              <li
                key={row.procedure.procedure_id}
                className="flex items-start gap-2.5 rounded-xl border border-[var(--sandy-border)] bg-[var(--sandy-surface-glass)] p-2.5"
              >
                <input
                  type="checkbox"
                  checked={row.included}
                  onChange={() => dispatch(toggleProcedureInclusion({ procedureId: row.procedure.procedure_id }))}
                  className="mt-0.5 size-4 shrink-0 accent-[var(--sandy-primary)]"
                  aria-label={`Include ${row.procedure.name}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-medium text-[var(--sandy-foreground)]">{row.procedure.name}</p>
                    <StatusBadge label={row.source === "catalog" ? "imported" : "custom"} tone={row.source === "catalog" ? "info" : "neutral"} />
                  </div>
                  <p className="truncate text-xs text-[var(--sandy-muted-foreground)]">{row.procedure.trigger}</p>
                </div>
                {row.source === "custom" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dispatch(removeProcedureFromActiveConfiguration({ procedureId: row.procedure.procedure_id }))}
                    aria-label={`Remove ${row.procedure.name}`}
                  >
                    <Trash2 className="size-3.5 text-[var(--sandy-danger)]" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
