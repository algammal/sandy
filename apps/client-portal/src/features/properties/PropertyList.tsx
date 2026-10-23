"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, Building2, Pencil, Plus } from "lucide-react";
import type { Property } from "@sandy/shared-types";
import { titleCase } from "@sandy/shared-utils";
import {
  Button,
  Checkbox,
  ConfirmationDialog,
  DataTable,
  Drawer,
  EmptyState,
  Select,
  SearchInput,
  StatusBadge,
  useToast,
  type DataTableColumn,
} from "@sandy/ui";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import {
  createProperty,
  fetchProperties,
  setIncludeArchived,
  setPropertyArchived,
  setSearchTerm,
  setTypeFilter,
  updateProperty,
} from "../../store/slices/propertiesSlice";
import { fetchCompounds } from "../../store/slices/compoundsSlice";
import { fetchLocations } from "../../store/slices/locationsSlice";
import { fetchContacts } from "../../store/slices/contactsSlice";
import { fetchAmenities } from "../../store/slices/referenceDataSlice";
import { propertyTypeOptions } from "./propertyOptions";
import { PropertyForm } from "./PropertyForm";
import type { PropertyInput } from "../../services/propertyService";

export function PropertyList() {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const { items, status, mutationStatus, searchTerm, typeFilter, includeArchived } = useAppSelector((state) => state.properties);
  const compounds = useAppSelector((state) => state.compounds.items);
  const locations = useAppSelector((state) => state.locations.items);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | undefined>(undefined);
  const [archiveTarget, setArchiveTarget] = useState<Property | null>(null);

  const debouncedSearch = useDebouncedValue(searchTerm);

  useEffect(() => {
    if (status === "idle") dispatch(fetchProperties());
    dispatch(fetchCompounds());
    dispatch(fetchLocations());
    dispatch(fetchContacts());
    dispatch(fetchAmenities());
  }, [dispatch, status]);

  const compoundNameById = useMemo(() => new Map(compounds.map((compound) => [compound.id, compound.name])), [compounds]);
  const locationNameById = useMemo(() => new Map(locations.map((location) => [location.id, location.name])), [locations]);

  const filteredProperties = items.filter((property) => {
    if (!includeArchived && property.isArchived) return false;
    if (typeFilter !== "all" && property.type !== typeFilter) return false;
    if (debouncedSearch && !property.name.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
    return true;
  });

  const openCreateForm = () => {
    setEditingProperty(undefined);
    setIsFormOpen(true);
  };

  const openEditForm = (property: Property) => {
    setEditingProperty(property);
    setIsFormOpen(true);
  };

  const handleSubmit = async (input: PropertyInput) => {
    const result = editingProperty
      ? await dispatch(updateProperty({ id: editingProperty.id, input }))
      : await dispatch(createProperty(input));
    if (updateProperty.rejected.match(result) || createProperty.rejected.match(result)) {
      showToast({ tone: "error", title: "Something went wrong", description: "Please try again." });
      return;
    }
    showToast({
      tone: "success",
      title: editingProperty ? "Property updated" : "Property created",
      description: input.name,
    });
    setIsFormOpen(false);
  };

  const confirmArchiveToggle = async () => {
    if (!archiveTarget) return;
    await dispatch(setPropertyArchived({ id: archiveTarget.id, isArchived: !archiveTarget.isArchived }));
    showToast({
      tone: "success",
      title: archiveTarget.isArchived ? "Property restored" : "Property archived",
      description: archiveTarget.name,
    });
    setArchiveTarget(null);
  };

  const columns: DataTableColumn<Property>[] = [
    {
      id: "name",
      header: "Property",
      cell: (property) => (
        <div className="flex flex-col">
          <Link href={`/properties/${property.id}`} className="font-medium text-[var(--sandy-foreground)] hover:text-[var(--sandy-primary)]">
            {property.name}
          </Link>
          <span className="text-xs text-[var(--sandy-muted-foreground)]">{titleCase(property.type)}</span>
        </div>
      ),
    },
    {
      id: "compound",
      header: "Compound",
      cell: (property) => compoundNameById.get(property.compoundId ?? "") ?? "—",
      hideBelow: "md",
    },
    {
      id: "location",
      header: "Location",
      cell: (property) => locationNameById.get(property.locationId ?? "") ?? "—",
      hideBelow: "lg",
    },
    {
      id: "status",
      header: "Status",
      cell: (property) => (
        <StatusBadge label={property.isArchived ? "Archived" : "Active"} tone={property.isArchived ? "neutral" : "success"} />
      ),
    },
    {
      id: "actions",
      header: "",
      cell: (property) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEditForm(property)} aria-label="Edit property">
            <Pencil className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setArchiveTarget(property)} aria-label={property.isArchived ? "Restore property" : "Archive property"}>
            {property.isArchived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <SearchInput
            placeholder="Search properties…"
            value={searchTerm}
            onChange={(event) => dispatch(setSearchTerm(event.target.value))}
            onClear={() => dispatch(setSearchTerm(""))}
            className="sm:max-w-xs"
          />
          <Select
            value={typeFilter}
            onChange={(event) => dispatch(setTypeFilter(event.target.value))}
            options={[{ value: "all", label: "All types" }, ...propertyTypeOptions]}
            className="sm:max-w-48"
          />
          <Checkbox
            label="Show archived"
            checked={includeArchived}
            onChange={(event) => dispatch(setIncludeArchived(event.target.checked))}
          />
        </div>
        <Button onClick={openCreateForm}>
          <Plus className="size-4" /> Add property
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={filteredProperties}
        rowKey={(property) => property.id}
        isLoading={status === "loading" && items.length === 0}
        emptyState={
          <EmptyState
            icon={<Building2 className="size-6" />}
            title="No properties yet"
            description="Add your first property so your voice agent knows what to describe to callers."
            action={
              <Button onClick={openCreateForm}>
                <Plus className="size-4" /> Add property
              </Button>
            }
          />
        }
      />

      <Drawer isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingProperty ? "Edit property" : "Add property"}>
        <PropertyForm
          property={editingProperty}
          onSubmit={handleSubmit}
          onCancel={() => setIsFormOpen(false)}
          isSubmitting={mutationStatus === "loading"}
        />
      </Drawer>

      <ConfirmationDialog
        isOpen={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={confirmArchiveToggle}
        title={archiveTarget?.isArchived ? "Restore property?" : "Archive property?"}
        description={
          archiveTarget?.isArchived
            ? `"${archiveTarget?.name}" will become active again and visible to your voice agent.`
            : `"${archiveTarget?.name}" will be hidden from your voice agent configuration until restored.`
        }
        confirmLabel={archiveTarget?.isArchived ? "Restore" : "Archive"}
        tone={archiveTarget?.isArchived ? "default" : "danger"}
      />
    </div>
  );
}
