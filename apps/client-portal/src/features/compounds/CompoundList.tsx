"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, Landmark, Pencil, Plus } from "lucide-react";
import type { Compound } from "@sandy/shared-types";
import {
  Button,
  ConfirmationDialog,
  DataTable,
  Drawer,
  EmptyState,
  SearchInput,
  StatusBadge,
  useToast,
  type DataTableColumn,
} from "@sandy/ui";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import {
  createCompound,
  fetchCompounds,
  setCompoundArchived,
  setSearchTerm,
  updateCompound,
} from "../../store/slices/compoundsSlice";
import { fetchLocations } from "../../store/slices/locationsSlice";
import { fetchContacts } from "../../store/slices/contactsSlice";
import { fetchFaqs } from "../../store/slices/faqsSlice";
import { fetchAmenities } from "../../store/slices/referenceDataSlice";
import { CompoundForm } from "./CompoundForm";
import type { CompoundInput } from "../../services/compoundService";

export function CompoundList() {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const { items, status, mutationStatus, searchTerm } = useAppSelector((state) => state.compounds);
  const locations = useAppSelector((state) => state.locations.items);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCompound, setEditingCompound] = useState<Compound | undefined>(undefined);
  const [archiveTarget, setArchiveTarget] = useState<Compound | null>(null);

  const debouncedSearch = useDebouncedValue(searchTerm);

  useEffect(() => {
    if (status === "idle") dispatch(fetchCompounds());
    dispatch(fetchLocations());
    dispatch(fetchContacts());
    dispatch(fetchFaqs());
    dispatch(fetchAmenities());
  }, [dispatch, status]);

  const filtered = items.filter((compound) => compound.name.toLowerCase().includes(debouncedSearch.toLowerCase()));

  const openCreateForm = () => {
    setEditingCompound(undefined);
    setIsFormOpen(true);
  };

  const handleSubmit = async (input: CompoundInput) => {
    const result = editingCompound
      ? await dispatch(updateCompound({ id: editingCompound.id, input }))
      : await dispatch(createCompound(input));
    if (updateCompound.rejected.match(result) || createCompound.rejected.match(result)) {
      showToast({ tone: "error", title: "Something went wrong", description: "Please try again." });
      return;
    }
    showToast({ tone: "success", title: editingCompound ? "Compound updated" : "Compound created", description: input.name });
    setIsFormOpen(false);
  };

  const confirmArchiveToggle = async () => {
    if (!archiveTarget) return;
    await dispatch(setCompoundArchived({ id: archiveTarget.id, isArchived: !archiveTarget.isArchived }));
    showToast({ tone: "success", title: archiveTarget.isArchived ? "Compound restored" : "Compound archived" });
    setArchiveTarget(null);
  };

  const columns: DataTableColumn<Compound>[] = [
    {
      id: "name",
      header: "Compound",
      cell: (compound) => (
        <Link href={`/compounds/${compound.id}`} className="font-medium text-[var(--sandy-foreground)] hover:text-[var(--sandy-primary)]">
          {compound.name}
        </Link>
      ),
    },
    {
      id: "location",
      header: "Location",
      cell: (compound) => locations.find((location) => location.id === compound.locationId)?.name ?? "—",
      hideBelow: "md",
    },
    {
      id: "properties",
      header: "Properties",
      cell: (compound) => compound.propertyIds.length,
      hideBelow: "sm",
    },
    {
      id: "status",
      header: "Status",
      cell: (compound) => <StatusBadge label={compound.isArchived ? "Archived" : "Active"} tone={compound.isArchived ? "neutral" : "success"} />,
    },
    {
      id: "actions",
      header: "",
      cell: (compound) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingCompound(compound);
              setIsFormOpen(true);
            }}
            aria-label="Edit compound"
          >
            <Pencil className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setArchiveTarget(compound)} aria-label={compound.isArchived ? "Restore compound" : "Archive compound"}>
            {compound.isArchived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          placeholder="Search compounds…"
          value={searchTerm}
          onChange={(event) => dispatch(setSearchTerm(event.target.value))}
          onClear={() => dispatch(setSearchTerm(""))}
          className="sm:max-w-xs"
        />
        <Button onClick={openCreateForm}>
          <Plus className="size-4" /> Add compound
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(compound) => compound.id}
        isLoading={status === "loading" && items.length === 0}
        emptyState={
          <EmptyState
            icon={<Landmark className="size-6" />}
            title="No compounds yet"
            description="Group related properties into a compound or residential community."
            action={
              <Button onClick={openCreateForm}>
                <Plus className="size-4" /> Add compound
              </Button>
            }
          />
        }
      />

      <Drawer isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingCompound ? "Edit compound" : "Add compound"}>
        <CompoundForm
          compound={editingCompound}
          onSubmit={handleSubmit}
          onCancel={() => setIsFormOpen(false)}
          isSubmitting={mutationStatus === "loading"}
        />
      </Drawer>

      <ConfirmationDialog
        isOpen={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={confirmArchiveToggle}
        title={archiveTarget?.isArchived ? "Restore compound?" : "Archive compound?"}
        confirmLabel={archiveTarget?.isArchived ? "Restore" : "Archive"}
        tone={archiveTarget?.isArchived ? "default" : "danger"}
      />
    </div>
  );
}
