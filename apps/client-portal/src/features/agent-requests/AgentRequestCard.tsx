"use client";

import { Trash2 } from "lucide-react";
import type { AgentRequest } from "@sandy/shared-types";
import { Button, FormField, GlassPanel, Input, RadioGroup, Select, Textarea } from "@sandy/ui";
import { useAppDispatch } from "../../store/hooks";
import { removeAgentRequest, updateAgentRequest, type AgentRequestInput } from "../../store/slices/agentRequestsSlice";
import { arabicDialectOptions, businessTypeOptions, languageOptions, robotSensitivityOptions, toneOptions } from "./options";
import { validateAgentRequest } from "./schema";

export interface AgentRequestCardProps {
  request: AgentRequest;
  index: number;
  canRemove: boolean;
}

const presetBusinessTypes = new Set(businessTypeOptions.map((option) => option.value).filter((value) => value !== "Other"));

export function AgentRequestCard({ request, index, canRemove }: AgentRequestCardProps) {
  const dispatch = useAppDispatch();
  const errors = validateAgentRequest(request);
  const isCustomBusinessType = !presetBusinessTypes.has(request.businessType);
  const showArabicDialect = request.language === "arabic" || request.language === "bilingual";

  const patch = (input: Partial<AgentRequestInput>) => {
    dispatch(
      updateAgentRequest({
        id: request.id,
        input: {
          label: request.label,
          businessType: request.businessType,
          voiceGender: request.voiceGender,
          language: request.language,
          arabicDialect: request.arabicDialect,
          tone: request.tone,
          robotSensitivity: request.robotSensitivity,
          customInstructions: request.customInstructions,
          ...input,
        },
      }),
    );
  };

  return (
    <GlassPanel className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Input
          value={request.label}
          onChange={(event) => patch({ label: event.target.value })}
          className="max-w-xs font-medium"
          aria-label={`Agent ${index + 1} label`}
        />
        {canRemove && (
          <Button variant="ghost" size="sm" onClick={() => dispatch(removeAgentRequest(request.id))} aria-label="Remove this agent request">
            <Trash2 className="size-4 text-[var(--sandy-danger)]" />
          </Button>
        )}
      </div>

      <FormField label="Business type" htmlFor={`${request.id}-businessType`}>
        <Select
          id={`${request.id}-businessType`}
          options={businessTypeOptions}
          value={isCustomBusinessType ? "Other" : request.businessType}
          onChange={(event) => {
            const value = event.target.value;
            patch({ businessType: value === "Other" ? "" : value });
          }}
        />
        {isCustomBusinessType && (
          <Input
            className="mt-2"
            placeholder="Describe your business type"
            value={request.businessType}
            onChange={(event) => patch({ businessType: event.target.value })}
          />
        )}
      </FormField>

      <FormField label="Voice gender">
        <RadioGroup
          name={`${request.id}-voiceGender`}
          orientation="horizontal"
          value={request.voiceGender}
          onChange={(value) => patch({ voiceGender: value as AgentRequest["voiceGender"] })}
          options={[
            { value: "female", label: "Female voice" },
            { value: "male", label: "Male voice" },
          ]}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Language" htmlFor={`${request.id}-language`}>
          <Select
            id={`${request.id}-language`}
            options={languageOptions}
            value={request.language}
            onChange={(event) => patch({ language: event.target.value as AgentRequest["language"] })}
          />
        </FormField>
        {showArabicDialect && (
          <FormField label="Arabic dialect" htmlFor={`${request.id}-dialect`}>
            <Select
              id={`${request.id}-dialect`}
              options={arabicDialectOptions}
              value={request.arabicDialect ?? "egyptian"}
              onChange={(event) => patch({ arabicDialect: event.target.value as AgentRequest["arabicDialect"] })}
            />
          </FormField>
        )}
      </div>

      <FormField label="Voice tone & personality" htmlFor={`${request.id}-tone`}>
        <Select
          id={`${request.id}-tone`}
          options={toneOptions}
          value={request.tone}
          onChange={(event) => patch({ tone: event.target.value as AgentRequest["tone"] })}
        />
      </FormField>

      <FormField
        label="How natural vs. controlled should it sound?"
        hint="This is a frontend preference for your agent's delivery — it doesn't measure or guarantee a specific result, but it guides how the agent is configured."
      >
        <RadioGroup
          name={`${request.id}-robotSensitivity`}
          value={request.robotSensitivity}
          onChange={(value) => patch({ robotSensitivity: value as AgentRequest["robotSensitivity"] })}
          options={robotSensitivityOptions.map((option) => ({ value: option.value, label: option.label, description: option.description }))}
        />
      </FormField>

      <FormField
        label="Additional instructions"
        htmlFor={`${request.id}-instructions`}
        hint="Optional — how this agent should behave or what it should focus on."
      >
        <Textarea
          id={`${request.id}-instructions`}
          rows={3}
          maxLength={600}
          value={request.customInstructions ?? ""}
          onChange={(event) => patch({ customInstructions: event.target.value })}
        />
      </FormField>

      {errors.length > 0 && (
        <ul className="list-inside list-disc text-xs text-[var(--sandy-danger)]">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
    </GlassPanel>
  );
}
