"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Bot, Building2, Landmark, MapPin, Phone, ArrowRight, CheckCircle2, CircleAlert } from "lucide-react";
import { formatRelativeTime } from "@sandy/shared-utils";
import { GlassPanel, LoadingState, StatCard } from "@sandy/ui";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchBusinessProfile } from "../../store/slices/businessProfileSlice";
import { fetchProperties } from "../../store/slices/propertiesSlice";
import { fetchCompounds } from "../../store/slices/compoundsSlice";
import { fetchLocations } from "../../store/slices/locationsSlice";
import { fetchContacts } from "../../store/slices/contactsSlice";
import { fetchFaqs } from "../../store/slices/faqsSlice";
import { fetchSubmission } from "../../store/slices/submissionSlice";
import { computeOverallCompletion, computeProfileCompletion } from "../../utils/completion";
import { SubmissionStatusBadge } from "../../components/SubmissionStatusBadge";

export function DashboardOverview() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.session.user);

  const profileState = useAppSelector((state) => state.businessProfile);
  const properties = useAppSelector((state) => state.properties);
  const compounds = useAppSelector((state) => state.compounds);
  const locations = useAppSelector((state) => state.locations);
  const contacts = useAppSelector((state) => state.contacts);
  const faqs = useAppSelector((state) => state.faqs);
  const agentRequests = useAppSelector((state) => state.agentRequests.items);
  const submissionState = useAppSelector((state) => state.submission);

  useEffect(() => {
    if (profileState.status === "idle") dispatch(fetchBusinessProfile());
    if (properties.status === "idle") dispatch(fetchProperties());
    if (compounds.status === "idle") dispatch(fetchCompounds());
    if (locations.status === "idle") dispatch(fetchLocations());
    if (contacts.status === "idle") dispatch(fetchContacts());
    if (faqs.status === "idle") dispatch(fetchFaqs());
    if (submissionState.status === "idle") dispatch(fetchSubmission());
  }, [dispatch, profileState.status, properties.status, compounds.status, locations.status, contacts.status, faqs.status, submissionState.status]);

  const isLoading = [profileState.status, properties.status, compounds.status, locations.status, contacts.status, faqs.status].includes(
    "loading",
  );

  if (isLoading && !profileState.profile) {
    return <LoadingState label="Loading your dashboard…" />;
  }

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

  const outstandingTasks: { label: string; href: string }[] = [];
  if (agentRequests.length === 0) outstandingTasks.push({ label: "Configure at least one AI agent", href: "/agent-requests" });
  if (profileCompletion < 100) outstandingTasks.push({ label: "Finish your business profile", href: "/business-profile" });
  if (activeProperties.length === 0) outstandingTasks.push({ label: "Add your first property", href: "/properties" });
  if (activeCompounds.length === 0) outstandingTasks.push({ label: "Add a compound or community", href: "/compounds" });
  if (contacts.items.length === 0) outstandingTasks.push({ label: "Add a contact number", href: "/contacts" });
  if (faqs.items.length === 0) outstandingTasks.push({ label: "Add FAQs for your voice agent", href: "/faqs" });
  if (submissionState.submission?.status === "changes_requested") {
    outstandingTasks.push({ label: "Address reviewer feedback and resubmit", href: "/review" });
  }
  if (outstandingTasks.length === 0) outstandingTasks.push({ label: "Review and submit your information", href: "/review" });

  const recentUpdates = [
    ...submissionState.submission?.history.slice(-3).map((entry) => ({
      label: `Submission ${entry.status.replace("_", " ")}`,
      detail: entry.note,
      at: entry.createdAt,
    })) ?? [],
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <div className="flex flex-col gap-6">
      <GlassPanel className="flex flex-col gap-2">
        <p className="text-sm text-[var(--sandy-muted-foreground)]">Welcome back,</p>
        <h1 className="text-2xl font-semibold text-[var(--sandy-foreground)]">{user?.name ?? "Guest"} 👋</h1>
        <p className="text-sm text-[var(--sandy-muted-foreground)]">
          Here&apos;s how ready Sandcastle Living is for its AI voice agent.
        </p>
      </GlassPanel>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Requested agents" value={agentRequests.length} accent="primary" icon={<Bot className="size-4" />} />
        <StatCard label="Business profile completion" value={`${profileCompletion}%`} accent="primary" icon={<CheckCircle2 className="size-4" />} />
        <StatCard label="Properties" value={activeProperties.length} accent="info" icon={<Building2 className="size-4" />} />
        <StatCard label="Compounds" value={activeCompounds.length} accent="success" icon={<Landmark className="size-4" />} />
        <StatCard label="Locations" value={locations.items.length} accent="warning" icon={<MapPin className="size-4" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <GlassPanel className="flex flex-col gap-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--sandy-foreground)]">Overall submission readiness</h2>
            {submissionState.submission && <SubmissionStatusBadge status={submissionState.submission.status} />}
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--sandy-border)]">
            <div
              className="h-full rounded-full bg-[var(--sandy-primary)] transition-all"
              style={{ width: `${overallCompletion}%` }}
            />
          </div>
          <p className="text-sm text-[var(--sandy-muted-foreground)]">
            {overallCompletion}% of the information your voice agent needs is in place.
          </p>
          <Link href="/review" className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--sandy-primary)] hover:underline">
            Go to review &amp; submission <ArrowRight className="size-3.5" />
          </Link>

          <div className="mt-2 border-t border-[var(--sandy-border)] pt-4">
            <h3 className="mb-2 text-sm font-semibold text-[var(--sandy-foreground)]">Recent updates</h3>
            {recentUpdates.length === 0 ? (
              <p className="text-sm text-[var(--sandy-muted-foreground)]">No recent activity yet.</p>
            ) : (
              <ul className="space-y-2">
                {recentUpdates.map((update, index) => (
                  <li key={index} className="flex items-start justify-between gap-3 text-sm">
                    <span className="capitalize text-[var(--sandy-foreground)]">{update.label}</span>
                    <span className="shrink-0 text-xs text-[var(--sandy-muted-foreground)]">{formatRelativeTime(update.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </GlassPanel>

        <GlassPanel className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-[var(--sandy-foreground)]">Outstanding tasks</h2>
          <ul className="flex flex-col gap-2">
            {outstandingTasks.map((task) => (
              <li key={task.href}>
                <Link
                  href={task.href}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[var(--sandy-border)] px-3 py-2.5 text-sm text-[var(--sandy-foreground)] hover:bg-[var(--sandy-surface-glass)]"
                >
                  <span className="flex items-center gap-2">
                    <CircleAlert className="size-4 text-[var(--sandy-warning)]" />
                    {task.label}
                  </span>
                  <ArrowRight className="size-3.5 text-[var(--sandy-muted-foreground)]" />
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-[var(--sandy-muted-foreground)]">
            <div className="flex items-center gap-1.5">
              <Phone className="size-3.5" /> {contacts.items.length} contacts
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5" /> {faqs.items.length} FAQs
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
