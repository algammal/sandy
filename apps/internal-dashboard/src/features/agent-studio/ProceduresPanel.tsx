"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { AgentConfiguration } from "@sandy/shared-types";
import { Button, EmptyState, FormField, Input, Select, StatusBadge, Textarea } from "@sandy/ui";
import { useAppDispatch } from "../../store/hooks";
import { addProcedureToActiveConfiguration, removeProcedureFromActiveConfiguration } from "../../store/slices/agentConfigurationsSlice";
import { listProcedures, PROCEDURE_CATALOG } from "./procedures";

export function ProceduresPanel({ active }: { active: AgentConfiguration }) {
  const dispatch = useAppDispatch();
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("");
  const [message, setMessage] = useState("");

  const procedures = listProcedures(active.mappedConfig);

  const applyCatalogEntry = (catalogName: string) => {
    const entry = PROCEDURE_CATALOG.find((item) => item.name === catalogName);
    if (!entry) return;
    setName(entry.name);
    setTrigger(entry.trigger);
  };

  const handleAdd = () => {
    if (!name.trim() || !trigger.trim() || !message.trim()) return;
    dispatch(addProcedureToActiveConfiguration({ name: name.trim(), trigger: trigger.trim(), message: message.trim() }));
    setName("");
    setTrigger("");
    setMessage("");
    setIsAdding(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--sandy-muted-foreground)]">
          Deterministic conversation rules, shaped like the reference export&apos;s structured procedures — preserved on import, editable here.
        </p>
        <Button size="sm" variant="secondary" onClick={() => setIsAdding((open) => !open)}>
          <Plus className="size-4" /> Add
        </Button>
      </div>

      {isAdding && (
        <div className="flex flex-col gap-3 rounded-xl border border-[var(--sandy-border-strong)] bg-[var(--sandy-surface-glass)] p-3">
          <FormField label="Start from a known pattern" hint="Optional — fills in the name and trigger below.">
            <Select
              placeholder="Choose a pattern…"
              options={PROCEDURE_CATALOG.map((entry) => ({ value: entry.name, label: entry.name }))}
              onChange={(event) => applyCatalogEntry(event.target.value)}
            />
          </FormField>
          <FormField label="Name" htmlFor="procedure-name">
            <Input id="procedure-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Pricing question" />
          </FormField>
          <FormField label="Trigger condition" htmlFor="procedure-trigger" hint="When should this rule fire?">
            <Textarea
              id="procedure-trigger"
              rows={2}
              value={trigger}
              onChange={(event) => setTrigger(event.target.value)}
              placeholder="The caller asks how much the service costs."
            />
          </FormField>
          <FormField label="Response" htmlFor="procedure-message" hint="The fixed line the agent says, then ends this branch.">
            <Textarea
              id="procedure-message"
              rows={2}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Pricing depends on your needs — I'll have our team follow up with details."
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd} disabled={!name.trim() || !trigger.trim() || !message.trim()}>
              Add procedure
            </Button>
          </div>
        </div>
      )}

      {procedures.length === 0 ? (
        <EmptyState title="No procedures defined" description="Add a rule above, or import a configuration that already has some." />
      ) : (
        <ul className="flex flex-col gap-2">
          {procedures.map((procedure) => (
            <li
              key={procedure.procedure_id}
              className="flex items-start justify-between gap-3 rounded-xl border border-[var(--sandy-border)] bg-[var(--sandy-surface-glass)] p-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-[var(--sandy-foreground)]">{procedure.name}</p>
                  <StatusBadge label={procedure.type} tone="neutral" />
                </div>
                <p className="mt-1 truncate text-xs text-[var(--sandy-muted-foreground)]">{procedure.trigger}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dispatch(removeProcedureFromActiveConfiguration({ procedureId: procedure.procedure_id }))}
                aria-label={`Remove ${procedure.name}`}
              >
                <Trash2 className="size-4 text-[var(--sandy-danger)]" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
