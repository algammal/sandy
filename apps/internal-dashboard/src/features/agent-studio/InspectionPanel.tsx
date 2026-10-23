"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { EmptyState, JsonEditor, StatusBadge, Tabs } from "@sandy/ui";
import { useAppSelector } from "../../store/hooks";
import { SUPPORTED_AGENT_FIELDS } from "./configSchema";
import { getAtPath } from "./jsonPath";
import { ProceduresPanel } from "./ProceduresPanel";
import { listProcedures } from "./procedures";

const subTabs = [
  { value: "editor", label: "JSON Editor" },
  { value: "structured", label: "Structured" },
  { value: "procedures", label: "Procedures" },
  { value: "diagnostics", label: "Diagnostics" },
];

export function InspectionPanel() {
  const { configurations, activeConfigurationId } = useAppSelector((state) => state.agentConfigurations);
  const active = configurations.find((config) => config.id === activeConfigurationId);
  const [subTab, setSubTab] = useState("editor");

  if (!active) {
    return <EmptyState title="No configuration imported yet" description="Use Import ElevenLabs JSON above to inspect it here." />;
  }

  const errorIssues = active.validationIssues.filter((issue) => issue.severity === "error");
  const warningIssues = active.validationIssues.filter((issue) => issue.severity === "warning");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-[var(--sandy-foreground)]">{active.name}</h2>
          <p className="font-technical text-xs text-[var(--sandy-muted-foreground)]">
            {active.importSource} · v{active.version} · live working copy
          </p>
        </div>
        <StatusBadge
          label={errorIssues.length > 0 ? `${errorIssues.length} error(s)` : "Schema valid"}
          tone={errorIssues.length > 0 ? "danger" : "success"}
        />
      </div>

      <Tabs
        items={subTabs.map((tab) => (tab.value === "procedures" ? { ...tab, badge: listProcedures(active.mappedConfig).length } : tab))}
        value={subTab}
        onChange={setSubTab}
      />

      {/*
        Every tab below reads `mappedConfig` — the live working draft — not
        `rawConfig`, so procedure toggles and mapping edits made in the
        middle panel show up here immediately. `rawConfig` is preserved
        untouched purely as the diff baseline for the right-hand panel.
      */}
      {subTab === "editor" && (
        <JsonEditor value={JSON.stringify(active.mappedConfig, null, 2)} readOnly height={420} ariaLabel="Working configuration" />
      )}

      {subTab === "structured" && (
        <ul className="flex max-h-[420px] flex-col gap-1.5 overflow-y-auto text-sm">
          {SUPPORTED_AGENT_FIELDS.map((field) => {
            const value = getAtPath(active.mappedConfig, field.path);
            const isPresent = value !== undefined;
            return (
              <li
                key={field.path}
                className="flex items-start justify-between gap-2 rounded-lg border border-[var(--sandy-border)] p-2"
              >
                <span className="flex items-start gap-1.5">
                  {isPresent ? (
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-[var(--sandy-success)]" />
                  ) : (
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-[var(--sandy-muted-foreground)]" />
                  )}
                  <span className="text-[var(--sandy-foreground)]">{field.label}</span>
                </span>
                <code className="max-w-32 truncate text-xs text-[var(--sandy-muted-foreground)]">
                  {isPresent ? JSON.stringify(value) : "not set"}
                </code>
              </li>
            );
          })}
        </ul>
      )}

      {subTab === "procedures" && (
        <div className="max-h-[420px] overflow-y-auto">
          <ProceduresPanel active={active} />
        </div>
      )}

      {subTab === "diagnostics" && (
        <div className="flex max-h-[420px] flex-col gap-4 overflow-y-auto">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-[var(--sandy-foreground)]">Unknown fields (preserved)</h3>
            {active.unknownFieldPaths.length === 0 ? (
              <p className="text-sm text-[var(--sandy-muted-foreground)]">None — every field in this import is recognized.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {active.unknownFieldPaths.map((path) => (
                  <li key={path}>
                    <code className="font-technical text-xs text-[var(--sandy-foreground)]">{path}</code>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-[var(--sandy-foreground)]">Validation</h3>
            {warningIssues.length === 0 && errorIssues.length === 0 ? (
              <p className="text-sm text-[var(--sandy-muted-foreground)]">No issues found.</p>
            ) : (
              <ul className="flex flex-col gap-1.5 text-sm">
                {[...errorIssues, ...warningIssues].map((issue) => (
                  <li key={`${issue.path}-${issue.message}`} className="flex items-start gap-1.5">
                    <StatusBadge label={issue.severity} tone={issue.severity === "error" ? "danger" : "warning"} />
                    <span className="text-[var(--sandy-foreground)]">{issue.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
