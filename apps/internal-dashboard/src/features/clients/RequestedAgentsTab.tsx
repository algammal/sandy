"use client";

import { useRouter } from "next/navigation";
import { Bot, Sparkles } from "lucide-react";
import type { Client } from "@sandy/shared-types";
import { titleCase } from "@sandy/shared-utils";
import { Button, EmptyState, GlassPanel, StatusBadge } from "@sandy/ui";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectClientForMapping, setActiveConfiguration } from "../../store/slices/agentConfigurationsSlice";

export function RequestedAgentsTab({ client }: { client: Client }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const requests = useAppSelector((state) => state.agentRequests.byClientId[client.id] ?? []);
  const configurations = useAppSelector((state) => state.agentConfigurations.configurations);

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={<Bot className="size-6" />}
        title="No agents requested yet"
        description="This client hasn't configured any agent requests in the Client Portal."
      />
    );
  }

  const openInAgentStudio = (agentRequestId: string) => {
    dispatch(selectClientForMapping(client.id));
    const draft = configurations.find((config) => config.agentRequestId === agentRequestId);
    if (draft) dispatch(setActiveConfiguration(draft.id));
    router.push("/agent-studio");
  };

  return (
    <div className="flex flex-col gap-3">
      {requests.map((request) => {
        const draft = configurations
          .filter((config) => config.agentRequestId === request.id)
          .sort((a, b) => b.version - a.version)[0];
        return (
          <GlassPanel key={request.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-medium text-[var(--sandy-foreground)]">{request.label}</h3>
              <p className="text-sm text-[var(--sandy-muted-foreground)]">{titleCase(request.businessType)}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge label={titleCase(request.voiceGender)} tone="neutral" />
                <StatusBadge label={titleCase(request.language)} tone="info" />
                {request.arabicDialect && <StatusBadge label={titleCase(request.arabicDialect)} tone="neutral" />}
                <StatusBadge label={titleCase(request.tone)} tone="primary" />
                <StatusBadge label={`${titleCase(request.robotSensitivity)} delivery`} tone="neutral" />
              </div>
              {request.customInstructions && (
                <p className="mt-2 max-w-xl text-sm text-[var(--sandy-muted-foreground)]">&ldquo;{request.customInstructions}&rdquo;</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge
                label={draft ? `Draft v${draft.version} generated` : "No draft yet"}
                tone={draft ? "success" : "neutral"}
              />
              <Button size="sm" onClick={() => openInAgentStudio(request.id)}>
                <Sparkles className="size-4" /> Open in Agent Studio
              </Button>
            </div>
          </GlassPanel>
        );
      })}
    </div>
  );
}
