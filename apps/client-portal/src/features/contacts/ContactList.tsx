"use client";

import { useEffect, useState } from "react";
import { Phone, Pencil, Plus, Star, Trash2 } from "lucide-react";
import type { ContactNumber } from "@sandy/shared-types";
import { titleCase } from "@sandy/shared-utils";
import {
  Button,
  ConfirmationDialog,
  DataTable,
  EmptyState,
  Modal,
  StatusBadge,
  useToast,
  type DataTableColumn,
} from "@sandy/ui";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { createContact, fetchContacts, removeContact, updateContact } from "../../store/slices/contactsSlice";
import { fetchProperties } from "../../store/slices/propertiesSlice";
import { fetchCompounds } from "../../store/slices/compoundsSlice";
import { ContactForm } from "./ContactForm";
import type { ContactNumberInput } from "../../services/contactService";

export function ContactList() {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const { items, status, mutationStatus } = useAppSelector((state) => state.contacts);
  const properties = useAppSelector((state) => state.properties.items);
  const compounds = useAppSelector((state) => state.compounds.items);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactNumber | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<ContactNumber | null>(null);

  useEffect(() => {
    if (status === "idle") dispatch(fetchContacts());
    dispatch(fetchProperties());
    dispatch(fetchCompounds());
  }, [dispatch, status]);

  const openCreateForm = () => {
    setEditingContact(undefined);
    setIsFormOpen(true);
  };

  const handleSubmit = async (input: ContactNumberInput) => {
    const result = editingContact
      ? await dispatch(updateContact({ id: editingContact.id, input }))
      : await dispatch(createContact(input));
    if (updateContact.rejected.match(result) || createContact.rejected.match(result)) {
      showToast({ tone: "error", title: "Something went wrong" });
      return;
    }
    showToast({ tone: "success", title: editingContact ? "Contact updated" : "Contact added", description: input.displayName });
    setIsFormOpen(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await dispatch(removeContact(deleteTarget.id));
    showToast({ tone: "success", title: "Contact removed", description: deleteTarget.displayName });
    setDeleteTarget(null);
  };

  const columns: DataTableColumn<ContactNumber>[] = [
    {
      id: "name",
      header: "Contact",
      cell: (contact) => (
        <div className="flex items-center gap-2">
          {contact.isPrimary && <Star className="size-3.5 fill-[var(--sandy-warning)] text-[var(--sandy-warning)]" />}
          <span className="font-medium text-[var(--sandy-foreground)]">{contact.displayName}</span>
        </div>
      ),
    },
    { id: "label", header: "Label", cell: (contact) => <StatusBadge label={titleCase(contact.label)} tone="neutral" /> },
    { id: "phone", header: "Phone number", cell: (contact) => `${contact.phoneNumber}${contact.extension ? ` x${contact.extension}` : ""}` },
    {
      id: "linked",
      header: "Linked to",
      cell: (contact) =>
        properties.find((property) => property.id === contact.propertyId)?.name ??
        compounds.find((compound) => compound.id === contact.compoundId)?.name ??
        "—",
      hideBelow: "md",
    },
    {
      id: "actions",
      header: "",
      cell: (contact) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingContact(contact);
              setIsFormOpen(true);
            }}
            aria-label="Edit contact"
          >
            <Pencil className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(contact)} aria-label="Delete contact">
            <Trash2 className="size-4 text-[var(--sandy-danger)]" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Button onClick={openCreateForm}>
          <Plus className="size-4" /> Add contact number
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={items}
        rowKey={(contact) => contact.id}
        isLoading={status === "loading" && items.length === 0}
        emptyState={
          <EmptyState
            icon={<Phone className="size-6" />}
            title="No contact numbers yet"
            description="Add the numbers your voice agent should direct callers to."
            action={
              <Button onClick={openCreateForm}>
                <Plus className="size-4" /> Add contact number
              </Button>
            }
          />
        }
      />

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingContact ? "Edit contact number" : "Add contact number"}>
        <ContactForm
          contact={editingContact}
          onSubmit={handleSubmit}
          onCancel={() => setIsFormOpen(false)}
          isSubmitting={mutationStatus === "loading"}
        />
      </Modal>

      <ConfirmationDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete contact number?"
        description={`"${deleteTarget?.displayName}" will be permanently removed.`}
        confirmLabel="Delete"
        tone="danger"
      />
    </div>
  );
}
