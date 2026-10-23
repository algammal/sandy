"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleDashed, Download, Send } from "lucide-react";
import { formatDateTime } from "@sandy/shared-utils";
import { Button, ConfirmationDialog, GlassPanel, LoadingState, StatusBadge, useToast } from "@sandy/ui";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchBusinessProfile } from "../../store/slices/businessProfileSlice";
import { fetchProperties } from "../../store/slices/propertiesSlice";
import { fetchCompounds } from "../../store/slices/compoundsSlice";
import { fetchLocations } from "../../store/slices/locationsSlice";
import { fetchContacts } from "../../store/slices/contactsSlice";
import { fetchFaqs } from "../../store/slices/faqsSlice";
import { fetchAmenities } from "../../store/slices/referenceDataSlice";
import { fetchSubmission, transitionSubmission } from "../../store/slices/submissionSlice";
import { computeOverallCompletion, computeProfileCompletion } from "../../utils/completion";
import { SubmissionStatusBadge } from "../../components/SubmissionStatusBadge";
import { DEMO_CLIENT_CATEGORY, DEMO_CLIENT_EMAIL, DEMO_CLIENT_ID, DEMO_CLIENT_NAME, DEMO_CLIENT_PHONE } from "../../utils/constants";
import { buildSubmissionBundle } from "./buildSubmissionBundle";
import { submissionBridgeService } from "../../services/submissionBridgeService";

export function ReviewSubmission() {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const profileState = useAppSelector((state) => state.businessProfile);
  const properties = useAppSelector((state) => state.properties);
  const compounds = useAppSelector((state) => state.compounds);
  const locations = useAppSelector((state) => state.locations);
  const contacts = useAppSelector((state) => state.contacts);
  const faqs = useAppSelector((state) => state.faqs);
  const amenities = useAppSelector((state) => state.referenceData.amenities);
  const agentRequests = useAppSelector((state) => state.agentRequests.items);
  const submissionState = useAppSelector((state) => state.submission);

  useEffect(() => {
    if (profileState.status === "idle") dispatch(fetchBusinessProfile());
    if (properties.status === "idle") dispatch(fetchProperties());
    if (compounds.status === "idle") dispatch(fetchCompounds());
    if (locations.status === "idle") dispatch(fetchLocations());
    if (contacts.status === "idle") dispatch(fetchContacts());
    if (faqs.status === "idle") dispatch(fetchFaqs());
    dispatch(fetchAmenities());
    if (submissionState.status === "idle") dispatch(fetchSubmission());
  }, [dispatch, profileState.status, properties.status, compounds.status, locations.status, contacts.status, faqs.status, submissionState.status]);

  if (submissionState.status === "loading" && !submissionState.submission) {
    return <LoadingState label="Loading submission status…" />;
  }

  if (!submissionState.submission) return null;

  const activeProperties = properties.items.filter((item) => !item.isArchived);
  const activeCompounds = compounds.items.filter((item) => !item.isArchived);
  const profileCompletion = computeProfileCompletion(profileState.profile);
  const overallCompletion = computeOverallCompletion({
    profile: profileState.profile,
    propertyCount: activeProperties.length,
    compoundCount: activeCompounds.length,
    locationCount: locations.items.length,
    contactCount: contacts.items.length,
    faqCount: faqs.items.length,
  });

  const sections = [
    { label: "Requested agents", complete: agentRequests.length > 0, detail: `${agentRequests.length} configured` },
    { label: "Business profile", complete: profileCompletion === 100, detail: `${profileCompletion}% complete` },
    { label: "Properties", complete: activeProperties.length > 0, detail: `${activeProperties.length} active` },
    { label: "Compounds", complete: activeCompounds.length > 0, detail: `${activeCompounds.length} active` },
    { label: "Locations", complete: locations.items.length > 0, detail: `${locations.items.length} added` },
    { label: "Contact numbers", complete: contacts.items.length > 0, detail: `${contacts.items.length} added` },
    { label: "FAQs & knowledge", complete: faqs.items.length > 0, detail: `${faqs.items.length} added` },
  ];

  const status = submissionState.submission.status;
  const canSubmit = (status === "draft" || status === "changes_requested") && agentRequests.length > 0;

  const buildCurrentBundle = () => {
    if (!profileState.profile) return null;
    return buildSubmissionBundle({
      client: {
        id: DEMO_CLIENT_ID,
        name: profileState.profile.businessName || DEMO_CLIENT_NAME,
        businessCategory: profileState.profile.category || DEMO_CLIENT_CATEGORY,
        contactEmail: profileState.profile.contactEmail || DEMO_CLIENT_EMAIL,
        contactPhone: profileState.profile.contactPhone || DEMO_CLIENT_PHONE,
      },
      businessProfile: profileState.profile,
      properties: activeProperties,
      compounds: activeCompounds,
      locations: locations.items,
      contacts: contacts.items,
      faqs: faqs.items,
      amenities,
      agentRequests,
      submissionId: submissionState.submission?.id,
    });
  };

  const handleSubmit = async () => {
    const bundle = buildCurrentBundle();
    if (bundle) {
      submissionBridgeService.persistLocally(bundle);
    }
    await dispatch(transitionSubmission({ status: "submitted", note: "Resubmitted after updates." }));
    showToast({ tone: "success", title: "Submitted for review", description: "The internal team will review your information." });
    setIsConfirmOpen(false);
  };

  const handleDownloadBundle = () => {
    const bundle = buildCurrentBundle();
    if (!bundle) {
      showToast({ tone: "error", title: "Business profile not loaded yet" });
      return;
    }
    submissionBridgeService.downloadAsFile(bundle);
    showToast({
      tone: "info",
      title: "Submission file downloaded",
      description: "Hand this file to the internal team, or import it yourself on the Internal Dashboard's Agent Studio import screen.",
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <GlassPanel className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--sandy-foreground)]">Submission status</h2>
            <p className="text-sm text-[var(--sandy-muted-foreground)]">
              {submissionState.submission.submittedAt
                ? `Last submitted ${formatDateTime(submissionState.submission.submittedAt)}`
                : "Not submitted yet"}
            </p>
          </div>
          <SubmissionStatusBadge status={status} />
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--sandy-border)]">
          <div className="h-full rounded-full bg-[var(--sandy-primary)] transition-all" style={{ width: `${overallCompletion}%` }} />
        </div>
        <p className="text-sm text-[var(--sandy-muted-foreground)]">{overallCompletion}% ready for voice agent configuration.</p>
        <div className="flex flex-wrap items-center gap-2">
          {(status === "draft" || status === "changes_requested") && (
            <Button onClick={() => setIsConfirmOpen(true)} disabled={!canSubmit}>
              <Send className="size-4" /> {status === "changes_requested" ? "Resubmit for review" : "Submit for review"}
            </Button>
          )}
          <Button variant="outline" onClick={handleDownloadBundle}>
            <Download className="size-4" /> Download submission file
          </Button>
        </div>
        {agentRequests.length === 0 && (status === "draft" || status === "changes_requested") && (
          <p className="text-xs text-[var(--sandy-warning)]">
            Add at least one <Link href="/agent-requests" className="underline">requested agent</Link> before submitting.
          </p>
        )}
        {status === "changes_requested" && (
          <p className="rounded-lg bg-[var(--sandy-warning-bg)] px-3 py-2 text-sm text-[var(--sandy-warning)]">
            The internal team requested changes. Review their notes, update the relevant sections, then resubmit.
          </p>
        )}
      </GlassPanel>

      <GlassPanel className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--sandy-foreground)]">Requested agents</h2>
          <Link href="/agent-requests" className="text-xs font-medium text-[var(--sandy-primary)] hover:underline">
            Edit
          </Link>
        </div>
        {agentRequests.length === 0 ? (
          <p className="text-sm text-[var(--sandy-muted-foreground)]">No agents configured yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {agentRequests.map((request) => (
              <li key={request.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--sandy-border)] px-3 py-2.5 text-sm">
                <span className="font-medium text-[var(--sandy-foreground)]">{request.label}</span>
                <div className="flex flex-wrap gap-1.5">
                  <StatusBadge label={request.businessType} tone="neutral" />
                  <StatusBadge label={request.voiceGender} tone="info" />
                  <StatusBadge label={request.language} tone="info" />
                  <StatusBadge label={request.tone.replace("_", " ")} tone="primary" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>

      <GlassPanel className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-[var(--sandy-foreground)]">Section checklist</h2>
        <ul className="flex flex-col gap-2">
          {sections.map((section) => (
            <li key={section.label} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--sandy-border)] px-3 py-2.5 text-sm">
              <span className="flex items-center gap-2 text-[var(--sandy-foreground)]">
                {section.complete ? (
                  <CheckCircle2 className="size-4 text-[var(--sandy-success)]" />
                ) : (
                  <CircleDashed className="size-4 text-[var(--sandy-muted-foreground)]" />
                )}
                {section.label}
              </span>
              <span className="text-xs text-[var(--sandy-muted-foreground)]">{section.detail}</span>
            </li>
          ))}
        </ul>
      </GlassPanel>

      <GlassPanel className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-[var(--sandy-foreground)]">Submission history</h2>
        <ol className="flex flex-col gap-3 border-l border-[var(--sandy-border)] pl-4">
          {submissionState.submission.history
            .slice()
            .reverse()
            .map((entry) => {
              return (
                <li key={entry.id} className="relative">
                  <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-[var(--sandy-primary)]" />
                  <div className="flex flex-wrap items-center gap-2">
                    <SubmissionStatusBadge status={entry.status} />
                    <span className="text-xs text-[var(--sandy-muted-foreground)]">{formatDateTime(entry.createdAt)}</span>
                  </div>
                  {entry.note && <p className="mt-1 text-sm text-[var(--sandy-muted-foreground)]">{entry.note}</p>}
                  <p className="text-xs text-[var(--sandy-muted-foreground)]">by {entry.actorName}</p>
                </li>
              );
            })}
        </ol>
      </GlassPanel>

      <ConfirmationDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleSubmit}
        title="Submit for review?"
        description="Your current business information will be sent to our team for review. You can keep editing afterwards, but changes won't be reflected until you resubmit."
        confirmLabel="Submit"
        isConfirming={submissionState.transitionStatus === "loading"}
      />
    </div>
  );
}
