"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ContactNumber } from "@sandy/shared-types";
import { Button, Checkbox, FormField, Input, Select } from "@sandy/ui";
import { useAppSelector } from "../../store/hooks";
import { contactLabelOptions, contactSchema, type ContactFormValues } from "./schema";
import type { ContactNumberInput } from "../../services/contactService";

export interface ContactFormProps {
  contact?: ContactNumber;
  onSubmit: (input: ContactNumberInput) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

function toDefaults(contact?: ContactNumber): ContactFormValues {
  return {
    label: contact?.label ?? "main",
    displayName: contact?.displayName ?? "",
    phoneNumber: contact?.phoneNumber ?? "",
    extension: contact?.extension ?? "",
    propertyId: contact?.propertyId ?? "",
    compoundId: contact?.compoundId ?? "",
    isPrimary: contact?.isPrimary ?? false,
  };
}

export function ContactForm({ contact, onSubmit, onCancel, isSubmitting }: ContactFormProps) {
  const properties = useAppSelector((state) => state.properties.items);
  const compounds = useAppSelector((state) => state.compounds.items);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({ resolver: zodResolver(contactSchema), defaultValues: toDefaults(contact) });

  useEffect(() => {
    reset(toDefaults(contact));
  }, [contact, reset]);

  const submit = async (values: ContactFormValues) => {
    await onSubmit({
      label: values.label,
      displayName: values.displayName,
      phoneNumber: values.phoneNumber,
      extension: values.extension || undefined,
      propertyId: values.propertyId || undefined,
      compoundId: values.compoundId || undefined,
      isPrimary: values.isPrimary,
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
      <FormField label="Label" htmlFor="label" required error={errors.label?.message}>
        <Select id="label" options={contactLabelOptions} {...register("label")} />
      </FormField>
      <FormField label="Display name" htmlFor="displayName" required error={errors.displayName?.message}>
        <Input id="displayName" hasError={Boolean(errors.displayName)} {...register("displayName")} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Phone number" htmlFor="phoneNumber" required error={errors.phoneNumber?.message}>
          <Input id="phoneNumber" hasError={Boolean(errors.phoneNumber)} {...register("phoneNumber")} />
        </FormField>
        <FormField label="Extension" htmlFor="extension" hint="Optional">
          <Input id="extension" {...register("extension")} />
        </FormField>
      </div>
      <FormField label="Property" htmlFor="propertyId" hint="Optional">
        <Select
          id="propertyId"
          placeholder="No property"
          options={properties.map((property) => ({ value: property.id, label: property.name }))}
          {...register("propertyId")}
        />
      </FormField>
      <FormField label="Compound" htmlFor="compoundId" hint="Optional">
        <Select
          id="compoundId"
          placeholder="No compound"
          options={compounds.map((compound) => ({ value: compound.id, label: compound.name }))}
          {...register("compoundId")}
        />
      </FormField>
      <Checkbox label="Set as primary contact number" {...register("isPrimary")} />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {contact ? "Save changes" : "Add contact number"}
        </Button>
      </div>
    </form>
  );
}
