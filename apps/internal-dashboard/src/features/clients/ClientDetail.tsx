"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate, formatDateTime } from "@sandy/shared-utils";
import { ErrorState, GlassPanel, LoadingState, Tabs } from "@sandy/ui";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchClients } from "../../store/slices/clientsSlice";
import { fetchBusinessInfo } from "../../store/slices/businessInfoSlice";
import { SubmissionStatusBadge } from "../../components/SubmissionStatusBadge";
import { AgentStatusBadge } from "../../components/AgentStatusBadge";
import {
  BusinessProfileSection,
  CompoundsSection,
  ContactsSection,
  FaqsSection,
  LocationsSection,
  PropertiesSection,
} from "./BusinessInfoSections";
import { ReviewWorkspace } from "./ReviewWorkspace";
import { ClientAgentTab } from "./ClientAgentTab";
import { ClientActivityTab } from "./ClientActivityTab";
import { RequestedAgentsTab } from "./RequestedAgentsTab";

const tabItems = [
  { value: "overview", label: "Overview" },
  { value: "profile", label: "Business Profile" },
  { value: "properties", label: "Properties" },
  { value: "compounds", label: "Compounds" },
  { value: "locations", label: "Locations" },
  { value: "contacts", label: "Contact Info" },
  { value: "faqs", label: "FAQs" },
  { value: "review", label: "Review" },
  { value: "requested-agents", label: "Requested Agents" },
  { value: "agent", label: "Agent Configuration" },
  { value: "activity", label: "Activity" },
];

export function ClientDetail({ clientId }: { clientId: string }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");

  const { items, status } = useAppSelector((state) => state.clients);
  const businessInfoState = useAppSelector((state) => state.businessInfo);

  useEffect(() => {
    if (status === "idle") dispatch(fetchClients());
    dispatch(fetchBusinessInfo(clientId));
  }, [dispatch, status, clientId]);

  const client = items.find((item) => item.id === clientId);
  const info = businessInfoState.byClientId[clientId];

  if ((status === "loading" && !client) || businessInfoState.statusByClientId[clientId] === "loading") {
    return <LoadingState label="Loading client…" />;
  }

  if (!client) {
    return <ErrorState title="Client not found" onRetry={() => router.push("/clients")} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--sandy-foreground)]">{client.name}</h1>
          <p className="text-sm text-[var(--sandy-muted-foreground)]">{client.businessCategory}</p>
        </div>
        <div className="flex gap-2">
          <SubmissionStatusBadge status={client.submissionStatus} />
          <AgentStatusBadge status={client.agentStatus} />
        </div>
      </div>

      <Tabs items={tabItems} value={activeTab} onChange={setActiveTab} />

      {activeTab === "overview" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <GlassPanel>
            <h3 className="mb-2 text-sm font-semibold text-[var(--sandy-foreground)]">Contact</h3>
            <p className="text-sm text-[var(--sandy-foreground)]">{client.contactEmail}</p>
            <p className="text-sm text-[var(--sandy-foreground)]">{client.contactPhone}</p>
          </GlassPanel>
          <GlassPanel>
            <h3 className="mb-2 text-sm font-semibold text-[var(--sandy-foreground)]">Record</h3>
            <p className="text-sm text-[var(--sandy-muted-foreground)]">Created {formatDate(client.createdAt)}</p>
            <p className="text-sm text-[var(--sandy-muted-foreground)]">Updated {formatDateTime(client.updatedAt)}</p>
          </GlassPanel>
          <GlassPanel>
            <h3 className="mb-2 text-sm font-semibold text-[var(--sandy-foreground)]">Submitted counts</h3>
            <p className="text-sm text-[var(--sandy-foreground)]">{client.propertyCount} properties · {client.compoundCount} compounds</p>
            <p className="text-sm text-[var(--sandy-foreground)]">{client.locationCount} locations · {client.contactNumberCount} contact numbers</p>
          </GlassPanel>
        </div>
      )}

      {info && activeTab === "profile" && <BusinessProfileSection info={info} />}
      {info && activeTab === "properties" && <PropertiesSection info={info} />}
      {info && activeTab === "compounds" && <CompoundsSection info={info} />}
      {info && activeTab === "locations" && <LocationsSection info={info} />}
      {info && activeTab === "contacts" && <ContactsSection info={info} />}
      {info && activeTab === "faqs" && <FaqsSection info={info} />}
      {info && activeTab === "review" && <ReviewWorkspace client={client} info={info} />}
      {activeTab === "requested-agents" && <RequestedAgentsTab client={client} />}
      {activeTab === "agent" && <ClientAgentTab client={client} />}
      {activeTab === "activity" && <ClientActivityTab clientId={client.id} />}
    </div>
  );
}
