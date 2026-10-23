"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { CheckCircle2, CircleDashed, Send, ShieldAlert, XCircle } from "lucide-react";
import type { Client, ReviewNoteVisibility } from "@sandy/shared-types";
import { formatDateTime } from "@sandy/shared-utils";
import { Button, ConfirmationDialog, FormField, GlassPanel, RadioGroup, StatusBadge, Textarea, useToast } from "@sandy/ui";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { addReviewNote, fetchReviewNotes } from "../../store/slices/submissionsSlice";
import { transitionClientSubmission } from "../../store/slices/clientsSlice";
import type { ClientBusinessInfo } from "../../services/businessInfoSeed";
import { SubmissionStatusBadge } from "../../components/SubmissionStatusBadge";

interface NoteFormValues {
  message: string;
}

export function ReviewWorkspace({ client, info }: { client: Client; info: ClientBusinessInfo }) {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const notes = useAppSelector((state) => state.submissions.notesByClientId[client.id] ?? []);
  const mutationStatus = useAppSelector((state) => state.submissions.mutationStatus);

  const [visibility, setVisibility] = useState<ReviewNoteVisibility>("internal");
  const [confirmAction, setConfirmAction] = useState<"approved" | "changes_requested" | null>(null);

  const { register, handleSubmit, reset } = useForm<NoteFormValues>({ defaultValues: { message: "" } });

  useEffect(() => {
    dispatch(fetchReviewNotes(client.id));
  }, [dispatch, client.id]);

  const checks = [
    { label: "Business name provided", pass: Boolean(info.businessProfile.businessName) },
    { label: "Business description provided", pass: Boolean(info.businessProfile.description) },
    { label: "Contact email provided", pass: Boolean(info.businessProfile.contactEmail) },
    { label: "Contact phone provided", pass: Boolean(info.businessProfile.contactPhone) },
    { label: "At least one property or compound", pass: info.properties.length > 0 || info.compounds.length > 0 },
    { label: "At least one contact number", pass: info.contacts.length > 0 },
    { label: "At least one FAQ", pass: info.faqs.length > 0 },
  ];
  const failingChecks = checks.filter((check) => !check.pass);

  const onAddNote = async (values: NoteFormValues) => {
    if (!values.message.trim()) return;
    await dispatch(addReviewNote({ clientId: client.id, message: values.message, visibility }));
    showToast({ tone: "success", title: "Note added" });
    reset();
  };

  const confirmTransition = async () => {
    if (!confirmAction) return;
    await dispatch(transitionClientSubmission({ id: client.id, status: confirmAction }));
    showToast({
      tone: confirmAction === "approved" ? "success" : "info",
      title: confirmAction === "approved" ? "Submission approved" : "Changes requested",
    });
    setConfirmAction(null);
  };

  const canAct = client.submissionStatus === "submitted" || client.submissionStatus === "under_review";

  return (
    <div className="flex flex-col gap-6">
      <GlassPanel className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--sandy-foreground)]">Submission status</h3>
          <p className="text-sm text-[var(--sandy-muted-foreground)]">Decide whether this submission is ready for agent configuration.</p>
        </div>
        <SubmissionStatusBadge status={client.submissionStatus} />
      </GlassPanel>

      <GlassPanel className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-[var(--sandy-foreground)]">Completeness check</h3>
        <ul className="flex flex-col gap-1.5">
          {checks.map((check) => (
            <li key={check.label} className="flex items-center gap-2 text-sm">
              {check.pass ? (
                <CheckCircle2 className="size-4 text-[var(--sandy-success)]" />
              ) : (
                <CircleDashed className="size-4 text-[var(--sandy-danger)]" />
              )}
              <span className={check.pass ? "text-[var(--sandy-foreground)]" : "text-[var(--sandy-danger)]"}>{check.label}</span>
            </li>
          ))}
        </ul>
        {canAct && (
          <div className="flex gap-2 pt-2">
            <Button onClick={() => setConfirmAction("approved")}>
              <CheckCircle2 className="size-4" /> Approve submission
            </Button>
            <Button variant="outline" onClick={() => setConfirmAction("changes_requested")}>
              <XCircle className="size-4" /> Request changes
            </Button>
          </div>
        )}
        {failingChecks.length > 0 && canAct && (
          <p className="flex items-center gap-1.5 text-xs text-[var(--sandy-warning)]">
            <ShieldAlert className="size-3.5" /> {failingChecks.length} item(s) are incomplete — you can still approve, but consider requesting changes.
          </p>
        )}
      </GlassPanel>

      <GlassPanel className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-[var(--sandy-foreground)]">Review notes</h3>
        <form onSubmit={handleSubmit(onAddNote)} className="flex flex-col gap-3">
          <FormField label="Visibility">
            <RadioGroup
              name="visibility"
              value={visibility}
              onChange={(value) => setVisibility(value as ReviewNoteVisibility)}
              orientation="horizontal"
              options={[
                { value: "internal", label: "Internal only", description: "Visible to your team only" },
                { value: "client_visible", label: "Client-visible", description: "Shown to the client" },
              ]}
            />
          </FormField>
          <Textarea placeholder="Add a note…" rows={2} {...register("message")} />
          <Button type="submit" size="sm" className="self-end" isLoading={mutationStatus === "loading"}>
            <Send className="size-4" /> Add note
          </Button>
        </form>
        <div className="flex flex-col gap-2 border-t border-[var(--sandy-border)] pt-3">
          {notes.length === 0 ? (
            <p className="text-sm text-[var(--sandy-muted-foreground)]">No review notes yet.</p>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className={
                  note.visibility === "internal"
                    ? "rounded-lg border border-dashed border-[var(--sandy-border-strong)] bg-[var(--sandy-surface-glass)] p-3"
                    : "rounded-lg border border-[var(--sandy-primary)]/30 bg-[var(--sandy-primary)]/5 p-3"
                }
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <StatusBadge label={note.visibility === "internal" ? "Internal" : "Client-visible"} tone={note.visibility === "internal" ? "neutral" : "primary"} />
                  <span className="text-xs text-[var(--sandy-muted-foreground)]">{formatDateTime(note.createdAt)}</span>
                </div>
                <p className="text-sm text-[var(--sandy-foreground)]">{note.message}</p>
                <p className="text-xs text-[var(--sandy-muted-foreground)]">by {note.authorName}</p>
              </div>
            ))
          )}
        </div>
      </GlassPanel>

      <ConfirmationDialog
        isOpen={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        onConfirm={confirmTransition}
        title={confirmAction === "approved" ? "Approve this submission?" : "Request changes?"}
        description={
          confirmAction === "approved"
            ? "This marks the submission as approved and ready for agent configuration (demo state only)."
            : "The client will see their status change to \"Changes Requested\" (demo state only)."
        }
        confirmLabel={confirmAction === "approved" ? "Approve" : "Request changes"}
        tone={confirmAction === "approved" ? "default" : "danger"}
      />
    </div>
  );
}
