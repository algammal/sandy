"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Property } from "@sandy/shared-types";
import { Button, CheckboxGroup, FormField, Input, Select, Textarea } from "@sandy/ui";
import { useAppSelector } from "../../store/hooks";
import { propertyTypeOptions } from "./propertyOptions";
import { formatMetadataText, parseMetadataText, propertySchema, type PropertyFormValues } from "./schema";
import type { PropertyInput } from "../../services/propertyService";

export interface PropertyFormProps {
  property?: Property;
  onSubmit: (input: PropertyInput) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

function toDefaults(property?: Property): PropertyFormValues {
  return {
    name: property?.name ?? "",
    type: property?.type ?? "apartment",
    description: property?.description ?? "",
    compoundId: property?.compoundId ?? "",
    locationId: property?.locationId ?? "",
    amenityIds: property?.amenityIds ?? [],
    contactNumberIds: property?.contactNumberIds ?? [],
    metadataText: formatMetadataText(property?.metadata),
  };
}

export function PropertyForm({ property, onSubmit, onCancel, isSubmitting }: PropertyFormProps) {
  const compounds = useAppSelector((state) => state.compounds.items);
  const locations = useAppSelector((state) => state.locations.items);
  const contacts = useAppSelector((state) => state.contacts.items);
  const amenities = useAppSelector((state) => state.referenceData.amenities);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PropertyFormValues>({ resolver: zodResolver(propertySchema), defaultValues: toDefaults(property) });

  useEffect(() => {
    reset(toDefaults(property));
  }, [property, reset]);

  const amenityIds = watch("amenityIds");
  const contactNumberIds = watch("contactNumberIds");

  const submit = async (values: PropertyFormValues) => {
    await onSubmit({
      name: values.name,
      type: values.type,
      description: values.description,
      compoundId: values.compoundId || undefined,
      locationId: values.locationId || undefined,
      amenityIds: values.amenityIds,
      contactNumberIds: values.contactNumberIds,
      metadata: parseMetadataText(values.metadataText),
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
      <FormField label="Property name" htmlFor="name" required error={errors.name?.message}>
        <Input id="name" hasError={Boolean(errors.name)} {...register("name")} />
      </FormField>
      <FormField label="Property type" htmlFor="type" required error={errors.type?.message}>
        <Select id="type" options={propertyTypeOptions} {...register("type")} />
      </FormField>
      <FormField label="Description" htmlFor="description" required error={errors.description?.message}>
        <Textarea id="description" rows={3} hasError={Boolean(errors.description)} {...register("description")} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Compound" htmlFor="compoundId" hint="Optional">
          <Select
            id="compoundId"
            placeholder="No compound"
            options={compounds.map((compound) => ({ value: compound.id, label: compound.name }))}
            {...register("compoundId")}
          />
        </FormField>
        <FormField label="Location" htmlFor="locationId" hint="Optional">
          <Select
            id="locationId"
            placeholder="No location"
            options={locations.map((location) => ({ value: location.id, label: location.name }))}
            {...register("locationId")}
          />
        </FormField>
      </div>
      <FormField label="Amenities" hint="Select amenities available at this property">
        <CheckboxGroup
          options={amenities.map((amenity) => ({ value: amenity.id, label: amenity.name }))}
          value={amenityIds}
          onChange={(next) => setValue("amenityIds", next)}
        />
      </FormField>
      <FormField label="Contact numbers" hint="Select numbers callers should reach for this property">
        <CheckboxGroup
          options={contacts.map((contact) => ({ value: contact.id, label: `${contact.displayName} (${contact.phoneNumber})` }))}
          value={contactNumberIds}
          onChange={(next) => setValue("contactNumberIds", next)}
        />
      </FormField>
      <FormField label="Additional metadata" htmlFor="metadataText" hint="One key: value pair per line, e.g. bedrooms: 2">
        <Textarea id="metadataText" rows={3} {...register("metadataText")} />
      </FormField>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {property ? "Save changes" : "Create property"}
        </Button>
      </div>
    </form>
  );
}
