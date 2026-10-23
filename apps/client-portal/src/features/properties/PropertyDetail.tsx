"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Pencil } from "lucide-react";
import { titleCase } from "@sandy/shared-utils";
import { Button, ConfirmationDialog, Drawer, ErrorState, GlassPanel, LoadingState, StatusBadge, useToast } from "@sandy/ui";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchProperties, setPropertyArchived, updateProperty } from "../../store/slices/propertiesSlice";
import { fetchCompounds } from "../../store/slices/compoundsSlice";
import { fetchLocations } from "../../store/slices/locationsSlice";
import { fetchContacts } from "../../store/slices/contactsSlice";
import { fetchAmenities } from "../../store/slices/referenceDataSlice";
import { PropertyForm } from "./PropertyForm";
import type { PropertyInput } from "../../services/propertyService";

export function PropertyDetail({ propertyId }: { propertyId: string }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { showToast } = useToast();
  const { items, status } = useAppSelector((state) => state.properties);
  const compounds = useAppSelector((state) => state.compounds.items);
  const locations = useAppSelector((state) => state.locations.items);
  const contacts = useAppSelector((state) => state.contacts.items);
  const amenities = useAppSelector((state) => state.referenceData.amenities);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);

  useEffect(() => {
    if (status === "idle") dispatch(fetchProperties());
    dispatch(fetchCompounds());
    dispatch(fetchLocations());
    dispatch(fetchContacts());
    dispatch(fetchAmenities());
  }, [dispatch, status]);

  const property = items.find((item) => item.id === propertyId);

  if (status === "loading" && !property) return <LoadingState label="Loading property…" />;
  if (!property) {
    return <ErrorState title="Property not found" description="It may have been removed." onRetry={() => router.push("/properties")} />;
  }

  const compound = compounds.find((item) => item.id === property.compoundId);
  const location = locations.find((item) => item.id === property.locationId);
  const propertyContacts = contacts.filter((contact) => property.contactNumberIds.includes(contact.id));
  const propertyAmenities = amenities.filter((amenity) => property.amenityIds.includes(amenity.id));

  const handleSubmit = async (input: PropertyInput) => {
    await dispatch(updateProperty({ id: property.id, input }));
    showToast({ tone: "success", title: "Property updated", description: property.name });
    setIsEditOpen(false);
  };

  const toggleArchive = async () => {
    await dispatch(setPropertyArchived({ id: property.id, isArchived: !property.isArchived }));
    showToast({ tone: "success", title: property.isArchived ? "Property restored" : "Property archived" });
    setIsArchiveConfirmOpen(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h1 className="text-xl font-semibold text-[var(--sandy-foreground)]">{property.name}</h1>
            <StatusBadge label={property.isArchived ? "Archived" : "Active"} tone={property.isArchived ? "neutral" : "success"} />
          </div>
          <p className="text-sm text-[var(--sandy-muted-foreground)]">{titleCase(property.type)}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setIsEditOpen(true)}>
            <Pencil className="size-4" /> Edit
          </Button>
          <Button variant="outline" onClick={() => setIsArchiveConfirmOpen(true)}>
            {property.isArchived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
            {property.isArchived ? "Restore" : "Archive"}
          </Button>
        </div>
      </div>

      <GlassPanel>
        <h2 className="mb-2 text-sm font-semibold text-[var(--sandy-foreground)]">Description</h2>
        <p className="text-sm text-[var(--sandy-muted-foreground)]">{property.description}</p>
      </GlassPanel>

      <div className="grid gap-4 sm:grid-cols-2">
        <GlassPanel>
          <h2 className="mb-2 text-sm font-semibold text-[var(--sandy-foreground)]">Compound &amp; location</h2>
          <p className="text-sm text-[var(--sandy-foreground)]">{compound?.name ?? "No compound assigned"}</p>
          <p className="text-sm text-[var(--sandy-muted-foreground)]">{location?.name ?? "No location assigned"}</p>
        </GlassPanel>
        <GlassPanel>
          <h2 className="mb-2 text-sm font-semibold text-[var(--sandy-foreground)]">Contact numbers</h2>
          {propertyContacts.length === 0 ? (
            <p className="text-sm text-[var(--sandy-muted-foreground)]">No contact numbers linked.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm text-[var(--sandy-foreground)]">
              {propertyContacts.map((contact) => (
                <li key={contact.id}>
                  {contact.displayName} — {contact.phoneNumber}
                </li>
              ))}
            </ul>
          )}
        </GlassPanel>
      </div>

      <GlassPanel>
        <h2 className="mb-2 text-sm font-semibold text-[var(--sandy-foreground)]">Amenities</h2>
        {propertyAmenities.length === 0 ? (
          <p className="text-sm text-[var(--sandy-muted-foreground)]">No amenities selected.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {propertyAmenities.map((amenity) => (
              <StatusBadge key={amenity.id} label={amenity.name} tone="info" />
            ))}
          </div>
        )}
      </GlassPanel>

      {property.metadata && Object.keys(property.metadata).length > 0 && (
        <GlassPanel>
          <h2 className="mb-2 text-sm font-semibold text-[var(--sandy-foreground)]">Additional metadata</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            {Object.entries(property.metadata).map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs uppercase text-[var(--sandy-muted-foreground)]">{titleCase(key)}</dt>
                <dd className="text-[var(--sandy-foreground)]">{value}</dd>
              </div>
            ))}
          </dl>
        </GlassPanel>
      )}

      <Drawer isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit property">
        <PropertyForm property={property} onSubmit={handleSubmit} onCancel={() => setIsEditOpen(false)} />
      </Drawer>

      <ConfirmationDialog
        isOpen={isArchiveConfirmOpen}
        onClose={() => setIsArchiveConfirmOpen(false)}
        onConfirm={toggleArchive}
        title={property.isArchived ? "Restore property?" : "Archive property?"}
        confirmLabel={property.isArchived ? "Restore" : "Archive"}
        tone={property.isArchived ? "default" : "danger"}
      />
    </div>
  );
}
