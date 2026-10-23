"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Users } from "lucide-react";
import type { Client } from "@sandy/shared-types";
import { formatDate } from "@sandy/shared-utils";
import { Button, DataTable, EmptyState, SearchInput, Select, type DataTableColumn } from "@sandy/ui";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { fetchClients, setCategoryFilter, setSearchTerm, setStatusFilter } from "../../store/slices/clientsSlice";
import { SubmissionStatusBadge } from "../../components/SubmissionStatusBadge";
import { AgentStatusBadge } from "../../components/AgentStatusBadge";
import { ImportSubmissionDialog } from "./ImportSubmissionDialog";

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under Review" },
  { value: "changes_requested", label: "Changes Requested" },
  { value: "approved", label: "Approved" },
  { value: "provisioning", label: "Provisioning" },
  { value: "active", label: "Active" },
  { value: "provisioning_failed", label: "Provisioning Failed" },
];

export function ClientList() {
  const dispatch = useAppDispatch();
  const { items, status, searchTerm, statusFilter, categoryFilter } = useAppSelector((state) => state.clients);
  const debouncedSearch = useDebouncedValue(searchTerm);
  const [isImportOpen, setIsImportOpen] = useState(false);

  useEffect(() => {
    if (status === "idle") dispatch(fetchClients());
  }, [dispatch, status]);

  const categories = Array.from(new Set(items.map((client) => client.businessCategory)));

  const filtered = items.filter((client) => {
    if (statusFilter !== "all" && client.submissionStatus !== statusFilter) return false;
    if (categoryFilter !== "all" && client.businessCategory !== categoryFilter) return false;
    if (debouncedSearch && !client.name.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
    return true;
  });

  const columns: DataTableColumn<Client>[] = [
    {
      id: "name",
      header: "Client",
      cell: (client) => (
        <Link href={`/clients/${client.id}`} className="font-medium text-[var(--sandy-foreground)] hover:text-[var(--sandy-primary)]">
          {client.name}
        </Link>
      ),
    },
    { id: "category", header: "Category", cell: (client) => client.businessCategory, hideBelow: "md" },
    {
      id: "submission",
      header: "Submission",
      cell: (client) => <SubmissionStatusBadge status={client.submissionStatus} />,
    },
    {
      id: "agent",
      header: "Agent",
      cell: (client) => <AgentStatusBadge status={client.agentStatus} />,
      hideBelow: "sm",
    },
    { id: "properties", header: "Properties", cell: (client) => client.propertyCount, hideBelow: "lg" },
    { id: "compounds", header: "Compounds", cell: (client) => client.compoundCount, hideBelow: "lg" },
    { id: "updated", header: "Last updated", cell: (client) => formatDate(client.updatedAt), hideBelow: "md" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <SearchInput
            placeholder="Search clients…"
            value={searchTerm}
            onChange={(event) => dispatch(setSearchTerm(event.target.value))}
            onClear={() => dispatch(setSearchTerm(""))}
            className="sm:max-w-xs"
          />
          <Select
            value={statusFilter}
            onChange={(event) => dispatch(setStatusFilter(event.target.value))}
            options={statusOptions}
            className="sm:max-w-56"
          />
          <Select
            value={categoryFilter}
            onChange={(event) => dispatch(setCategoryFilter(event.target.value))}
            options={[{ value: "all", label: "All categories" }, ...categories.map((category) => ({ value: category, label: category }))]}
            className="sm:max-w-56"
          />
        </div>
        <Button onClick={() => setIsImportOpen(true)}>
          <Download className="size-4" /> Import submission
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(client) => client.id}
        isLoading={status === "loading" && items.length === 0}
        emptyState={
          <EmptyState
            icon={<Users className="size-6" />}
            title="No clients match these filters"
            description={items.length === 0 ? "Import a client submission from the Client Portal to get started." : undefined}
            action={items.length === 0 ? <Button onClick={() => setIsImportOpen(true)}>Import submission</Button> : undefined}
          />
        }
      />

      <ImportSubmissionDialog isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />
    </div>
  );
}
