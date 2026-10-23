"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Archive, ArchiveRestore, Pencil } from "lucide-react";
import { Button, ConfirmationDialog, Drawer, ErrorState, GlassPanel, LoadingState, StatusBadge, useToast } from "@sandy/ui";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchCompounds, setCompoundArchived, updateCompound } from "../../store/slices/compoundsSlice";
import { fetchProperties } from "../../store/slices/propertiesSlice";
import { fetchLocations } from "../../store/slices/locationsSlice";
import { fetchContacts } from "../../store/slices/contactsSlice";
import { fetchFaqs } from "../../store/slices/faqsSlice";
import { fetchAmenities } from "../../store/slices/referenceDataSlice";
import { CompoundForm } from "./CompoundForm";
import type { CompoundInput } from "../../services/compoundService";

export function CompoundDetail({ compoundId }: { compoundId: string }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { showToast } = useToast();
  const { items, status } = useAppSelector((state) => state.compounds);
  const properties = useAppSelector((state) => state.properties.items);
  const locations = useAppSelector((state) => state.locations.items);
  const contacts = useAppSelector((state) => state.contacts.items);
  const faqs = useAppSelector((state) => state.faqs.items);
  const amenities = useAppSelector((state) => state.referenceData.amenities);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);

  useEffect(() => {
    if (status === "idle") dispatch(fetchCompounds());
    dispatch(fetchProperties());
    dispatch(fetchLocations());
    dispatch(fetchContacts());
    dispatch(fetchFaqs());
    dispatch(fetchAmenities());
  }, [dispatch, status]);

  const compound = items.find((item) => item.id === compoundId);

  if (status === "loading" && !compound) return <LoadingState label="Loading compound…" />;
  if (!compound) {
    return <ErrorState title="Compound not found" onRetry={() => router.push("/compounds")} />;
  }

  const location = locations.find((item) => item.id === compound.locationId);
  const compoundProperties = properties.filter((property) => property.compoundId === compound.id);
  const compoundContacts = contacts.filter((contact) => compound.contactNumberIds.includes(contact.id));
  const compoundFaqs = faqs.filter((faq) => compound.faqIds.includes(faq.id));
  const compoundAmenities = amenities.filter((amenity) => compound.amenityIds.includes(amenity.id));

  const handleSubmit = async (input: CompoundInput) => {
    await dispatch(updateCompound({ id: compound.id, input }));
    showToast({ tone: "success", title: "Compound updated" });
    setIsEditOpen(false);
  };

  const toggleArchive = async () => {
    await dispatch(setCompoundArchived({ id: compound.id, isArchived: !compound.isArchived }));
    showToast({ tone: "success", title: compound.isArchived ? "Compound restored" : "Compound archived" });
    setIsArchiveConfirmOpen(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h1 className="text-xl font-semibold text-[var(--sandy-foreground)]">{compound.name}</h1>
            <StatusBadge label={compound.isArchived ? "Archived" : "Active"} tone={compound.isArchived ? "neutral" : "success"} />
          </div>
          <p className="text-sm text-[var(--sandy-muted-foreground)]">{location?.name ?? "No location assigned"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setIsEditOpen(true)}>
            <Pencil className="size-4" /> Edit
          </Button>
          <Button variant="outline" onClick={() => setIsArchiveConfirmOpen(true)}>
            {compound.isArchived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
            {compound.isArchived ? "Restore" : "Archive"}
          </Button>
        </div>
      </div>

      <GlassPanel>
        <h2 className="mb-2 text-sm font-semibold text-[var(--sandy-foreground)]">Description</h2>
        <p className="text-sm text-[var(--sandy-muted-foreground)]">{compound.description}</p>
      </GlassPanel>

      <GlassPanel>
        <h2 className="mb-2 text-sm font-semibold text-[var(--sandy-foreground)]">Associated properties</h2>
        {compoundProperties.length === 0 ? (
          <p className="text-sm text-[var(--sandy-muted-foreground)]">No properties linked yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {compoundProperties.map((property) => (
              <li key={property.id}>
                <Link href={`/properties/${property.id}`} className="text-sm text-[var(--sandy-primary)] hover:underline">
                  {property.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>

      <div className="grid gap-4 sm:grid-cols-2">
        <GlassPanel>
          <h2 className="mb-2 text-sm font-semibold text-[var(--sandy-foreground)]">Amenities</h2>
          {compoundAmenities.length === 0 ? (
            <p className="text-sm text-[var(--sandy-muted-foreground)]">No amenities selected.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {compoundAmenities.map((amenity) => (
                <StatusBadge key={amenity.id} label={amenity.name} tone="info" />
              ))}
            </div>
          )}
        </GlassPanel>
        <GlassPanel>
          <h2 className="mb-2 text-sm font-semibold text-[var(--sandy-foreground)]">Contact numbers</h2>
          {compoundContacts.length === 0 ? (
            <p className="text-sm text-[var(--sandy-muted-foreground)]">No contact numbers linked.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm text-[var(--sandy-foreground)]">
              {compoundContacts.map((contact) => (
                <li key={contact.id}>
                  {contact.displayName} — {contact.phoneNumber}
                </li>
              ))}
            </ul>
          )}
        </GlassPanel>
      </div>

      <GlassPanel>
        <h2 className="mb-2 text-sm font-semibold text-[var(--sandy-foreground)]">FAQs</h2>
        {compoundFaqs.length === 0 ? (
          <p className="text-sm text-[var(--sandy-muted-foreground)]">No FAQs linked yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {compoundFaqs.map((faq) => (
              <li key={faq.id} className="text-sm">
                <p className="font-medium text-[var(--sandy-foreground)]">{faq.question}</p>
                <p className="text-[var(--sandy-muted-foreground)]">{faq.answer}</p>
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>

      <Drawer isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit compound">
        <CompoundForm compound={compound} onSubmit={handleSubmit} onCancel={() => setIsEditOpen(false)} />
      </Drawer>

      <ConfirmationDialog
        isOpen={isArchiveConfirmOpen}
        onClose={() => setIsArchiveConfirmOpen(false)}
        onConfirm={toggleArchive}
        title={compound.isArchived ? "Restore compound?" : "Archive compound?"}
        confirmLabel={compound.isArchived ? "Restore" : "Archive"}
        tone={compound.isArchived ? "default" : "danger"}
      />
    </div>
  );
}
