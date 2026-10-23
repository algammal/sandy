"use client";

import { useEffect, useState } from "react";
import { HelpCircle, Pencil, Plus, Trash2 } from "lucide-react";
import type { Faq } from "@sandy/shared-types";
import {
  Button,
  ConfirmationDialog,
  EmptyState,
  Modal,
  SearchInput,
  Select,
  StatusBadge,
  useToast,
} from "@sandy/ui";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { createFaq, fetchFaqs, removeFaq, setCategoryFilter, setSearchTerm, updateFaq } from "../../store/slices/faqsSlice";
import { fetchCompounds } from "../../store/slices/compoundsSlice";
import { fetchProperties } from "../../store/slices/propertiesSlice";
import { faqCategoryOptions } from "./schema";
import { FaqForm } from "./FaqForm";
import type { FaqInput } from "../../services/faqService";

export function FaqList() {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const { items, status, mutationStatus, searchTerm, categoryFilter } = useAppSelector((state) => state.faqs);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Faq | null>(null);

  const debouncedSearch = useDebouncedValue(searchTerm);

  useEffect(() => {
    if (status === "idle") dispatch(fetchFaqs());
    dispatch(fetchCompounds());
    dispatch(fetchProperties());
  }, [dispatch, status]);

  const filtered = items.filter((faq) => {
    if (categoryFilter !== "all" && faq.category !== categoryFilter) return false;
    if (debouncedSearch && !faq.question.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
    return true;
  });

  const openCreateForm = () => {
    setEditingFaq(undefined);
    setIsFormOpen(true);
  };

  const handleSubmit = async (input: FaqInput) => {
    const result = editingFaq ? await dispatch(updateFaq({ id: editingFaq.id, input })) : await dispatch(createFaq(input));
    if (updateFaq.rejected.match(result) || createFaq.rejected.match(result)) {
      showToast({ tone: "error", title: "Something went wrong" });
      return;
    }
    showToast({ tone: "success", title: editingFaq ? "FAQ updated" : "FAQ added" });
    setIsFormOpen(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await dispatch(removeFaq(deleteTarget.id));
    showToast({ tone: "success", title: "FAQ removed" });
    setDeleteTarget(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <SearchInput
            placeholder="Search FAQs…"
            value={searchTerm}
            onChange={(event) => dispatch(setSearchTerm(event.target.value))}
            onClear={() => dispatch(setSearchTerm(""))}
            className="sm:max-w-xs"
          />
          <Select
            value={categoryFilter}
            onChange={(event) => dispatch(setCategoryFilter(event.target.value))}
            options={[{ value: "all", label: "All categories" }, ...faqCategoryOptions]}
            className="sm:max-w-48"
          />
        </div>
        <Button onClick={openCreateForm}>
          <Plus className="size-4" /> Add FAQ
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<HelpCircle className="size-6" />}
          title="No FAQs yet"
          description="Add the questions and answers your voice agent should know."
          action={
            <Button onClick={openCreateForm}>
              <Plus className="size-4" /> Add FAQ
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((faq) => (
            <div key={faq.id} className="rounded-2xl border border-[var(--sandy-border)] bg-[var(--sandy-surface-glass)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <StatusBadge label={faq.category} tone="info" />
                  </div>
                  <p className="font-medium text-[var(--sandy-foreground)]">{faq.question}</p>
                  <p className="mt-1 text-sm text-[var(--sandy-muted-foreground)]">{faq.answer}</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingFaq(faq);
                      setIsFormOpen(true);
                    }}
                    aria-label="Edit FAQ"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(faq)} aria-label="Delete FAQ">
                    <Trash2 className="size-4 text-[var(--sandy-danger)]" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingFaq ? "Edit FAQ" : "Add FAQ"} size="lg">
        <FaqForm faq={editingFaq} onSubmit={handleSubmit} onCancel={() => setIsFormOpen(false)} isSubmitting={mutationStatus === "loading"} />
      </Modal>

      <ConfirmationDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete FAQ?"
        description="This question and answer will be permanently removed."
        confirmLabel="Delete"
        tone="danger"
      />
    </div>
  );
}
