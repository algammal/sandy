"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Wand2 } from "lucide-react";
import { Button, EmptyState, GlassPanel, Select, StatusBadge } from "@sandy/ui";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchClients } from "../../store/slices/clientsSlice";
import { fetchBusinessInfo } from "../../store/slices/businessInfoSlice";
import { applyMappingToActiveConfiguration, selectClientForMapping } from "../../store/slices/agentConfigurationsSlice";
import { SubmissionStatusBadge } from "../../components/SubmissionStatusBadge";
import { MAPPING_RULE_DESCRIPTIONS } from "./mappingRules";

export function ClientMappingPanel() {
  const dispatch = useAppDispatch();
  const clients = useAppSelector((state) => state.clients);
  const businessInfoState = useAppSelector((state) => state.businessInfo);
  const agentRequestsState = useAppSelector((state) => state.agentRequests);
  const { configurations, activeConfigurationId, selectedClientId } = useAppSelector((state) => state.agentConfigurations);

  const [selectedAgentRequestId, setSelectedAgentRequestId] = useState<string>("");

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="label-caps text-[var(--sandy-accent)]">AST Bindings</p>
      </div>

      {!active ? (
        <EmptyState title="Import a configuration first" description="Mapping requires an active imported configuration." />
      ) : (
        <>
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

          <div className="flex flex-col gap-2">
            {MAPPING_RULE_DESCRIPTIONS.map((rule) => (
              <div
                key={rule.target}
                className="rounded-xl border border-[var(--sandy-border)] bg-[var(--sandy-surface-glass)] p-3 text-sm"
              >
                <p className="font-medium text-[var(--sandy-foreground)]">{rule.source}</p>
                <p className="mt-1 flex items-center gap-1.5 font-technical text-xs text-[var(--sandy-accent)]">
                  <ArrowRight className="size-3" /> {rule.target}
                </p>
              </div>
            ))}
          </div>

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
        </>
      )}
    </div>
  );
}
