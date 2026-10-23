"use client";

import { useState } from "react";
import { CheckCircle2, Download, Upload } from "lucide-react";
import { GlassPanel, Modal, StatusBadge, Button } from "@sandy/ui";
import { useAppSelector } from "../../store/hooks";
import { SubmissionStatusBadge } from "../../components/SubmissionStatusBadge";
import { ImportPanel } from "./ImportPanel";
import { InspectionPanel } from "./InspectionPanel";
import { ClientMappingPanel } from "./ClientMappingPanel";
import { OutputColumn } from "./OutputColumn";

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function AgentStudioWorkspace() {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const { configurations, activeConfigurationId, selectedClientId } = useAppSelector((state) => state.agentConfigurations);
  const clients = useAppSelector((state) => state.clients.items);

  const active = configurations.find((config) => config.id === activeConfigurationId);
  const selectedClient = clients.find((client) => client.id === selectedClientId);
  const errorCount = active?.validationIssues.filter((issue) => issue.severity === "error").length ?? 0;

  const handleExport = () => {
    if (!active) return;
    const safeClientName = selectedClient ? selectedClient.name.toLowerCase().replace(/\s+/g, "-") : "unassigned";
    downloadJson(`${safeClientName}-${active.name.toLowerCase().replace(/\s+/g, "-")}-v${active.version}.draft.json`, active.mappedConfig);
  };

  return (
    <div className="flex flex-col gap-4">
      <GlassPanel className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setIsImportOpen(true)}>
            <Upload className="size-4" /> Import ElevenLabs JSON
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!active}>
            <Download className="size-4" /> Export Draft
          </Button>
          {active && (
            <span className="flex items-center gap-1.5 font-technical text-xs text-[var(--sandy-muted-foreground)]">
              <CheckCircle2 className="size-3.5 text-[var(--sandy-success)]" />
              AST Node Check: {errorCount > 0 ? "FAILED" : "OK"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-[var(--sandy-border)] px-3 py-1.5">
          <span className="label-caps text-[var(--sandy-muted-foreground)]">Active Client Target</span>
          {selectedClient ? (
            <>
              <span className="text-sm font-medium text-[var(--sandy-foreground)]">{selectedClient.name}</span>
              <SubmissionStatusBadge status={selectedClient.submissionStatus} />
            </>
          ) : (
            <StatusBadge label="None selected" tone="neutral" />
          )}
        </div>
      </GlassPanel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px_minmax(0,1fr)]">
        <GlassPanel>
          <InspectionPanel />
        </GlassPanel>
        <GlassPanel>
          <ClientMappingPanel />
        </GlassPanel>
        <GlassPanel>
          <OutputColumn />
        </GlassPanel>
      </div>

      <Modal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} title="Import ElevenLabs agent configuration" size="lg">
        <ImportPanel onImported={() => setIsImportOpen(false)} />
      </Modal>
    </div>
  );
}
