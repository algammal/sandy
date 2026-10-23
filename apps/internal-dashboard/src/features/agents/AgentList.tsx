"use client";

import { useEffect, useState } from "react";
import { Bot } from "lucide-react";
import type { AgentInstance } from "@sandy/shared-types";
import { formatDateTime } from "@sandy/shared-utils";
import { DataTable, Drawer, EmptyState, SearchInput, Select, StatusBadge, type DataTableColumn } from "@sandy/ui";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { fetchAgentInstances } from "../../store/slices/agentInstancesSlice";
import { fetchClients } from "../../store/slices/clientsSlice";
import { AgentStatusBadge } from "../../components/AgentStatusBadge";

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "not_configured", label: "Not Configured" },
  { value: "draft", label: "Draft" },
  { value: "provisioning", label: "Provisioning" },
  { value: "active", label: "Active" },
  { value: "provisioning_failed", label: "Provisioning Failed" },
];

export function AgentList() {
  const dispatch = useAppDispatch();
  const { items, status, provisioningHistory } = useAppSelector((state) => state.agentInstances);
  const clients = useAppSelector((state) => state.clients.items);
  const configurations = useAppSelector((state) => state.agentConfigurations.configurations);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<AgentInstance | null>(null);

  const debouncedSearch = useDebouncedValue(searchTerm);

  useEffect(() => {
    if (status === "idle") dispatch(fetchAgentInstances());
    dispatch(fetchClients());
  }, [dispatch, status]);

  const clientNameById = new Map(clients.map((client) => [client.id, client.name]));

  const filtered = items.filter((instance) => {
    if (statusFilter !== "all" && instance.status !== statusFilter) return false;
    const clientName = clientNameById.get(instance.clientId) ?? "";
    if (debouncedSearch && !`${instance.agentName} ${clientName}`.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
    return true;
  });

  const columns: DataTableColumn<AgentInstance>[] = [
    {
      id: "name",
      header: "Agent",
      cell: (instance) => (
        <button onClick={() => setSelected(instance)} className="text-left font-medium text-[var(--sandy-foreground)] hover:text-[var(--sandy-primary)]">
          {instance.agentName}
        </button>
      ),
    },
    { id: "client", header: "Client", cell: (instance) => clientNameById.get(instance.clientId) ?? "Unknown client" },
    {
      id: "status",
      header: "Status",
      cell: (instance) => <AgentStatusBadge status={instance.status} />,
    },
    { id: "version", header: "Config version", cell: (instance) => instance.configurationVersion, hideBelow: "sm" },
    {
      id: "sync",
      header: "Last sync",
      cell: (instance) => (instance.lastSyncAt ? formatDateTime(instance.lastSyncAt) : "Never"),
      hideBelow: "md",
    },
  ];

  const selectedHistory = selected ? configurations.filter((c) => c.clientId === selected.clientId).sort((a, b) => b.version - a.version) : [];
  const selectedProvisioning = selected ? provisioningHistory.filter((p) => p.clientId === selected.clientId) : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchInput
          placeholder="Search agents or clients…"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          onClear={() => setSearchTerm("")}
          className="sm:max-w-xs"
        />
        <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} options={statusOptions} className="sm:max-w-56" />
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(instance) => instance.id}
        isLoading={status === "loading" && items.length === 0}
        emptyState={<EmptyState icon={<Bot className="size-6" />} title="No agents match these filters" />}
      />

      <Drawer isOpen={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.agentName ?? "Agent"}>
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 text-sm">
              <div>
                <p className="text-xs uppercase text-[var(--sandy-muted-foreground)]">Client</p>
                <p className="text-[var(--sandy-foreground)]">{clientNameById.get(selected.clientId) ?? "Unknown"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-[var(--sandy-muted-foreground)]">ElevenLabs Agent ID</p>
                <p className="text-[var(--sandy-foreground)]">{selected.elevenLabsAgentIdPlaceholder ?? "Not provisioned (demo)"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-[var(--sandy-muted-foreground)]">Last error</p>
                <p className="text-[var(--sandy-foreground)]">{selected.lastError ?? "None"}</p>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-[var(--sandy-foreground)]">Configuration history</h4>
              {selectedHistory.length === 0 ? (
                <p className="text-sm text-[var(--sandy-muted-foreground)]">No configuration history yet.</p>
              ) : (
                <ul className="flex flex-col gap-1.5 text-sm">
                  {selectedHistory.map((config) => (
                    <li key={config.id} className="flex justify-between">
                      <span>Version {config.version}</span>
                      <span className="text-[var(--sandy-muted-foreground)]">{formatDateTime(config.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-[var(--sandy-foreground)]">Provisioning activity</h4>
              {selectedProvisioning.length === 0 ? (
                <p className="text-sm text-[var(--sandy-muted-foreground)]">No provisioning attempts yet.</p>
              ) : (
                <ul className="flex flex-col gap-1.5 text-sm">
                  {selectedProvisioning.map((record) => (
                    <li key={record.id} className="flex items-center justify-between">
                      <StatusBadge label={record.outcome === "succeeded_demo" ? "Succeeded (Demo)" : "Failed (Demo)"} tone={record.outcome === "succeeded_demo" ? "success" : "danger"} />
                      <span className="text-[var(--sandy-muted-foreground)]">{formatDateTime(record.requestedAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
