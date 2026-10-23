"use client";

import { Bot, Plus } from "lucide-react";
import { Button, EmptyState } from "@sandy/ui";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { addAgentRequest } from "../../store/slices/agentRequestsSlice";
import { MAX_AGENT_REQUESTS } from "../../utils/constants";
import { AgentRequestCard } from "./AgentRequestCard";

export function AgentRequestsManager() {
  const dispatch = useAppDispatch();
  const requests = useAppSelector((state) => state.agentRequests.items);

  const addDefaultAgent = () => {
    dispatch(
      addAgentRequest({
        label: `Agent ${requests.length + 1}`,
        businessType: "Property Management",
        voiceGender: "female",
        language: "english",
        tone: "professional",
        robotSensitivity: "balanced",
        customInstructions: "",
      }),
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--sandy-muted-foreground)]">
          {requests.length} of {MAX_AGENT_REQUESTS} agents configured
        </p>
        <Button onClick={addDefaultAgent} disabled={requests.length >= MAX_AGENT_REQUESTS}>
          <Plus className="size-4" /> Add agent
        </Button>
      </div>

      {requests.length === 0 ? (
        <EmptyState
          icon={<Bot className="size-6" />}
          title="No agents configured yet"
          description="Add at least one AI voice agent you'd like us to prepare for your business."
          action={
            <Button onClick={addDefaultAgent}>
              <Plus className="size-4" /> Add agent
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {requests.map((request, index) => (
            <AgentRequestCard key={request.id} request={request} index={index} canRemove={requests.length > 0} />
          ))}
        </div>
      )}
    </div>
  );
}
