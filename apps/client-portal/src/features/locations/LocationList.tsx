"use client";

import { useEffect, useState } from "react";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import type { Location } from "@sandy/shared-types";
import {
  Button,
  ConfirmationDialog,
  DataTable,
  EmptyState,
  Modal,
  SearchInput,
  useToast,
  type DataTableColumn,
} from "@sandy/ui";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { createLocation, fetchLocations, removeLocation, updateLocation } from "../../store/slices/locationsSlice";
import { LocationForm } from "./LocationForm";
import type { LocationInput } from "../../services/locationService";

export function LocationList() {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const { items, status, mutationStatus } = useAppSelector((state) => state.locations);

  const [searchTerm, setSearchTermState] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);

  const debouncedSearch = useDebouncedValue(searchTerm);

  useEffect(() => {
    if (status === "idle") dispatch(fetchLocations());
  }, [dispatch, status]);

  const filtered = items.filter(
    (location) =>
      location.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      location.address.city.toLowerCase().includes(debouncedSearch.toLowerCase()),
  );

  const openCreateForm = () => {
    setEditingLocation(undefined);
    setIsFormOpen(true);
  };

  const handleSubmit = async (input: LocationInput) => {
    const result = editingLocation
      ? await dispatch(updateLocation({ id: editingLocation.id, input }))
      : await dispatch(createLocation(input));
    if (updateLocation.rejected.match(result) || createLocation.rejected.match(result)) {
      showToast({ tone: "error", title: "Something went wrong" });
      return;
    }
    showToast({ tone: "success", title: editingLocation ? "Location updated" : "Location created", description: input.name });
    setIsFormOpen(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await dispatch(removeLocation(deleteTarget.id));
    showToast({ tone: "success", title: "Location removed", description: deleteTarget.name });
    setDeleteTarget(null);
  };

  const columns: DataTableColumn<Location>[] = [
    { id: "name", header: "Location", cell: (location) => <span className="font-medium text-[var(--sandy-foreground)]">{location.name}</span> },
    { id: "city", header: "City", cell: (location) => location.address.city },
    { id: "region", header: "Region", cell: (location) => location.address.region, hideBelow: "sm" },
    { id: "country", header: "Country", cell: (location) => location.address.country, hideBelow: "md" },
    {
      id: "related",
      header: "Linked",
      cell: (location) => `${location.relatedPropertyIds.length} properties · ${location.relatedCompoundIds.length} compounds`,
      hideBelow: "lg",
    },
    {
      id: "actions",
      header: "",
      cell: (location) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingLocation(location);
              setIsFormOpen(true);
            }}
            aria-label="Edit location"
          >
            <Pencil className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(location)} aria-label="Delete location">
            <Trash2 className="size-4 text-[var(--sandy-danger)]" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          placeholder="Search by name or city…"
          value={searchTerm}
          onChange={(event) => setSearchTermState(event.target.value)}
          onClear={() => setSearchTermState("")}
          className="sm:max-w-xs"
        />
        <Button onClick={openCreateForm}>
          <Plus className="size-4" /> Add location
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(location) => location.id}
        isLoading={status === "loading" && items.length === 0}
        emptyState={
          <EmptyState
            icon={<MapPin className="size-6" />}
            title="No locations yet"
            description="Add the addresses your properties and compounds belong to."
            action={
              <Button onClick={openCreateForm}>
                <Plus className="size-4" /> Add location
              </Button>
            }
          />
        }
      />

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingLocation ? "Edit location" : "Add location"} size="lg">
        <LocationForm
          location={editingLocation}
          onSubmit={handleSubmit}
          onCancel={() => setIsFormOpen(false)}
          isSubmitting={mutationStatus === "loading"}
        />
      </Modal>

      <ConfirmationDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete location?"
        description={`"${deleteTarget?.name}" will be permanently removed from your account.`}
        confirmLabel="Delete"
        tone="danger"
      />
    </div>
  );
}
