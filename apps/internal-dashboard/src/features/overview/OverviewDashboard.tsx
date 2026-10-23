"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Bot, CheckCircle2, Clock, FileJson2, Users, XCircle } from "lucide-react";
import { formatRelativeTime } from "@sandy/shared-utils";
import { GlassPanel, LoadingState, StatCard } from "@sandy/ui";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchClients } from "../../store/slices/clientsSlice";
import { fetchAgentInstances } from "../../store/slices/agentInstancesSlice";
import { fetchActivity } from "../../store/slices/activitySlice";
import { SubmissionStatusBadge } from "../../components/SubmissionStatusBadge";

export function OverviewDashboard() {
  const dispatch = useAppDispatch();
  const clients = useAppSelector((state) => state.clients);
  const agentInstances = useAppSelector((state) => state.agentInstances);
  const activity = useAppSelector((state) => state.activity);
  const agentRequestsByClient = useAppSelector((state) => state.agentRequests.byClientId);
  const configurations = useAppSelector((state) => state.agentConfigurations.configurations);

  useEffect(() => {
    if (clients.status === "idle") dispatch(fetchClients());
    if (agentInstances.status === "idle") dispatch(fetchAgentInstances());
    if (activity.status === "idle") dispatch(fetchActivity());
  }, [dispatch, clients.status, agentInstances.status, activity.status]);

  if (clients.status === "loading" && clients.items.length === 0) {
    return <LoadingState label="Loading overview…" />;
  }

  const totalClients = clients.items.length;
  const pendingSubmissions = clients.items.filter((c) => c.submissionStatus === "submitted" || c.submissionStatus === "under_review").length;
  const changesRequested = clients.items.filter((c) => c.submissionStatus === "changes_requested").length;
  const approvedClients = clients.items.filter((c) => c.submissionStatus === "approved").length;
  const activeAgents = agentInstances.items.filter((a) => a.status === "active").length;
  const provisioningFailures = agentInstances.items.filter((a) => a.status === "provisioning_failed").length;
  const requestedAgentCount = Object.values(agentRequestsByClient).reduce((sum, requests) => sum + requests.length, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total clients" value={totalClients} accent="primary" icon={<Users className="size-4" />} />
        <StatCard label="Pending submissions" value={pendingSubmissions} accent="info" icon={<Clock className="size-4" />} />
        <StatCard label="Changes requested" value={changesRequested} accent="warning" icon={<AlertTriangle className="size-4" />} />
        <StatCard label="Approved clients" value={approvedClients} accent="success" icon={<CheckCircle2 className="size-4" />} />
        <StatCard label="Requested agents" value={requestedAgentCount} accent="primary" icon={<Bot className="size-4" />} />
        <StatCard label="Configuration drafts" value={configurations.length} accent="info" icon={<FileJson2 className="size-4" />} />
        <StatCard label="Active agents" value={activeAgents} accent="success" icon={<Bot className="size-4" />} />
        <StatCard label="Provisioning failures" value={provisioningFailures} accent="danger" icon={<XCircle className="size-4" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <GlassPanel className="flex flex-col gap-3 lg:col-span-2">
          <h2 className="text-sm font-semibold text-[var(--sandy-foreground)]">Clients needing attention</h2>
          <ul className="flex flex-col gap-2">
            {clients.items
              .filter((client) => client.submissionStatus === "submitted" || client.submissionStatus === "under_review" || client.submissionStatus === "changes_requested")
              .slice(0, 6)
              .map((client) => (
                <li key={client.id}>
                  <Link
                    href={`/clients/${client.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--sandy-border)] px-3 py-2.5 text-sm hover:bg-[var(--sandy-surface-glass)]"
                  >
                    <span className="text-[var(--sandy-foreground)]">{client.name}</span>
                    <SubmissionStatusBadge status={client.submissionStatus} />
                  </Link>
                </li>
              ))}
          </ul>
        </GlassPanel>

        <GlassPanel className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-[var(--sandy-foreground)]">Recent activity</h2>
          <ul className="flex flex-col gap-3">
            {activity.items.slice(0, 6).map((entry) => (
              <li key={entry.id} className="text-sm">
                <p className="text-[var(--sandy-foreground)]">{entry.description}</p>
                <p className="text-xs text-[var(--sandy-muted-foreground)]">{formatRelativeTime(entry.createdAt)}</p>
              </li>
            ))}
          </ul>
        </GlassPanel>
      </div>
    </div>
  );
}
