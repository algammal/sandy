"use client";

import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, X } from "lucide-react";
import { generateId } from "@sandy/shared-utils";
import { Button, FormField, GlassPanel, Input, LoadingState, Textarea, useToast } from "@sandy/ui";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchBusinessProfile, saveBusinessProfile } from "../../store/slices/businessProfileSlice";
import { businessProfileSchema, type BusinessProfileFormValues } from "./schema";
import { WorkingHoursEditor } from "./WorkingHoursEditor";

const weekDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

function emptyDefaults(): BusinessProfileFormValues {
  return {
    businessName: "",
    description: "",
    category: "",
    contactEmail: "",
    contactPhone: "",
    website: "",
    workingHours: weekDays.map((day) => ({ day, closed: day === "friday", openTime: "09:00", closeTime: "18:00" })),
    supportedServices: [],
    policies: [],
    additionalInformation: "",
  };
}

export function BusinessProfileForm() {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const { profile, status, saveStatus } = useAppSelector((state) => state.businessProfile);
  const [serviceDraft, setServiceDraft] = useState("");

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm<BusinessProfileFormValues>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: emptyDefaults(),
  });

  const policiesArray = useFieldArray({ control, name: "policies" });
  const workingHoursArray = useFieldArray({ control, name: "workingHours" });
  const supportedServices = watch("supportedServices");
  const watchedHours = watch("workingHours");

  useEffect(() => {
    if (status === "idle") dispatch(fetchBusinessProfile());
  }, [dispatch, status]);

  useEffect(() => {
    if (profile) {
      reset({
        businessName: profile.businessName,
        description: profile.description,
        category: profile.category,
        contactEmail: profile.contactEmail,
        contactPhone: profile.contactPhone,
        website: profile.website ?? "",
        workingHours: profile.workingHours,
        supportedServices: profile.supportedServices,
        policies: profile.policies,
        additionalInformation: profile.additionalInformation ?? "",
      });
    }
  }, [profile, reset]);

  const addService = () => {
    const value = serviceDraft.trim();
    if (!value) return;
    if (!supportedServices.includes(value)) {
      setValue("supportedServices", [...supportedServices, value], { shouldDirty: true, shouldValidate: true });
    }
    setServiceDraft("");
  };

  const removeService = (value: string) => {
    setValue(
      "supportedServices",
      supportedServices.filter((service) => service !== value),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const onSubmit = async (values: BusinessProfileFormValues) => {
    const result = await dispatch(
      saveBusinessProfile({
        ...values,
        website: values.website || undefined,
        additionalInformation: values.additionalInformation || undefined,
      }),
    );
    if (saveBusinessProfile.fulfilled.match(result)) {
      showToast({ tone: "success", title: "Business profile saved", description: "Your changes are saved for this demo session." });
    } else {
      showToast({ tone: "error", title: "Could not save profile", description: "Please try again." });
    }
  };

  if (status === "loading" && !profile) {
    return <LoadingState label="Loading business profile…" />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <GlassPanel className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-[var(--sandy-foreground)]">Business details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Business name" htmlFor="businessName" required error={errors.businessName?.message}>
            <Input id="businessName" hasError={Boolean(errors.businessName)} {...register("businessName")} />
          </FormField>
          <FormField label="Category" htmlFor="category" required error={errors.category?.message}>
            <Input id="category" hasError={Boolean(errors.category)} {...register("category")} />
          </FormField>
        </div>
        <FormField label="Description" htmlFor="description" required error={errors.description?.message} hint="This is read aloud or summarized by your voice agent, so keep it clear and concise.">
          <Textarea id="description" rows={4} hasError={Boolean(errors.description)} {...register("description")} />
        </FormField>
      </GlassPanel>

      <GlassPanel className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-[var(--sandy-foreground)]">Contact information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Contact email" htmlFor="contactEmail" required error={errors.contactEmail?.message}>
            <Input id="contactEmail" type="email" hasError={Boolean(errors.contactEmail)} {...register("contactEmail")} />
          </FormField>
          <FormField label="Contact phone" htmlFor="contactPhone" required error={errors.contactPhone?.message}>
            <Input id="contactPhone" hasError={Boolean(errors.contactPhone)} {...register("contactPhone")} />
          </FormField>
        </div>
        <FormField label="Website" htmlFor="website" error={errors.website?.message} hint="Optional">
          <Input id="website" placeholder="https://" hasError={Boolean(errors.website)} {...register("website")} />
        </FormField>
      </GlassPanel>

      <GlassPanel className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-[var(--sandy-foreground)]">Working hours</h2>
        <WorkingHoursEditor fieldArray={workingHoursArray} register={register} watchedHours={watchedHours} />
      </GlassPanel>

      <GlassPanel className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-[var(--sandy-foreground)]">Supported services</h2>
        <div className="flex flex-wrap gap-2">
          {supportedServices.map((service) => (
            <span key={service} className="flex items-center gap-1.5 rounded-full bg-[var(--sandy-primary)]/10 px-3 py-1.5 text-sm text-[var(--sandy-primary)]">
              {service}
              <button type="button" onClick={() => removeService(service)} aria-label={`Remove ${service}`}>
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. Property Leasing"
            value={serviceDraft}
            onChange={(event) => setServiceDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addService();
              }
            }}
          />
          <Button type="button" variant="secondary" onClick={addService}>
            <Plus className="size-4" /> Add
          </Button>
        </div>
        {errors.supportedServices && <p className="text-xs text-[var(--sandy-danger)]">{errors.supportedServices.message}</p>}
      </GlassPanel>

      <GlassPanel className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--sandy-foreground)]">Business policies</h2>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => policiesArray.append({ id: generateId("policy"), title: "", description: "" })}
          >
            <Plus className="size-4" /> Add policy
          </Button>
        </div>
        {policiesArray.fields.length === 0 && (
          <p className="text-sm text-[var(--sandy-muted-foreground)]">No policies added yet.</p>
        )}
        {policiesArray.fields.map((field, index) => (
          <div key={field.id} className="flex flex-col gap-2 rounded-lg border border-[var(--sandy-border)] p-3">
            <div className="flex items-center justify-between gap-2">
              <Input placeholder="Policy title" {...register(`policies.${index}.title`)} />
              <Button type="button" variant="ghost" size="sm" onClick={() => policiesArray.remove(index)} aria-label="Remove policy">
                <Trash2 className="size-4 text-[var(--sandy-danger)]" />
              </Button>
            </div>
            <Textarea placeholder="Policy description" rows={2} {...register(`policies.${index}.description`)} />
          </div>
        ))}
      </GlassPanel>

      <GlassPanel className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-[var(--sandy-foreground)]">Additional information</h2>
        <Textarea rows={3} placeholder="Anything else your voice agent should know…" {...register("additionalInformation")} />
      </GlassPanel>

      <div className="sticky bottom-4 flex items-center justify-end gap-3 rounded-2xl border border-[var(--sandy-border)] bg-[var(--sandy-surface-glass-strong)] p-4 backdrop-blur-xl">
        {isDirty && <span className="text-xs text-[var(--sandy-muted-foreground)]">You have unsaved changes</span>}
        <Button type="submit" isLoading={saveStatus === "loading"}>
          Save business profile
        </Button>
      </div>
    </form>
  );
}
