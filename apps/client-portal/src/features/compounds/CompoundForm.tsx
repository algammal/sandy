"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Compound } from "@sandy/shared-types";
import { Button, CheckboxGroup, FormField, Input, Select, Textarea } from "@sandy/ui";
import { useAppSelector } from "../../store/hooks";
import { compoundSchema, type CompoundFormValues } from "./schema";
import type { CompoundInput } from "../../services/compoundService";

export interface CompoundFormProps {
  compound?: Compound;
  onSubmit: (input: CompoundInput) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

function toDefaults(compound?: Compound): CompoundFormValues {
  return {
    name: compound?.name ?? "",
    description: compound?.description ?? "",
    locationId: compound?.locationId ?? "",
    amenityIds: compound?.amenityIds ?? [],
    contactNumberIds: compound?.contactNumberIds ?? [],
    faqIds: compound?.faqIds ?? [],
  };
}

export function CompoundForm({ compound, onSubmit, onCancel, isSubmitting }: CompoundFormProps) {
  const locations = useAppSelector((state) => state.locations.items);
  const contacts = useAppSelector((state) => state.contacts.items);
  const amenities = useAppSelector((state) => state.referenceData.amenities);
  const faqs = useAppSelector((state) => state.faqs.items);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CompoundFormValues>({ resolver: zodResolver(compoundSchema), defaultValues: toDefaults(compound) });

  useEffect(() => {
    reset(toDefaults(compound));
  }, [compound, reset]);

  const amenityIds = watch("amenityIds");
  const contactNumberIds = watch("contactNumberIds");
  const faqIds = watch("faqIds");

  const submit = async (values: CompoundFormValues) => {
    await onSubmit({
      name: values.name,
      description: values.description,
      locationId: values.locationId || undefined,
      amenityIds: values.amenityIds,
      contactNumberIds: values.contactNumberIds,
      faqIds: values.faqIds,
      propertyIds: compound?.propertyIds ?? [],
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
      <FormField label="Compound name" htmlFor="name" required error={errors.name?.message}>
        <Input id="name" hasError={Boolean(errors.name)} {...register("name")} />
      </FormField>
      <FormField label="Description" htmlFor="description" required error={errors.description?.message}>
        <Textarea id="description" rows={3} hasError={Boolean(errors.description)} {...register("description")} />
      </FormField>
      <FormField label="Location" htmlFor="locationId" hint="Optional">
        <Select
          id="locationId"
          placeholder="No location"
          options={locations.map((location) => ({ value: location.id, label: location.name }))}
          {...register("locationId")}
        />
      </FormField>
      <FormField label="Amenities">
        <CheckboxGroup
          options={amenities.map((amenity) => ({ value: amenity.id, label: amenity.name }))}
          value={amenityIds}
          onChange={(next) => setValue("amenityIds", next)}
        />
      </FormField>
      <FormField label="Contact numbers">
        <CheckboxGroup
          options={contacts.map((contact) => ({ value: contact.id, label: `${contact.displayName} (${contact.phoneNumber})` }))}
          value={contactNumberIds}
          onChange={(next) => setValue("contactNumberIds", next)}
        />
      </FormField>
      <FormField label="Related FAQs">
        <CheckboxGroup
          options={faqs.map((faq) => ({ value: faq.id, label: faq.question }))}
          value={faqIds}
          onChange={(next) => setValue("faqIds", next)}
          emptyLabel="No FAQs yet — add some from the FAQs page."
        />
      </FormField>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {compound ? "Save changes" : "Create compound"}
        </Button>
      </div>
    </form>
  );
}
