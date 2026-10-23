"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Location } from "@sandy/shared-types";
import { Button, FormField, Input } from "@sandy/ui";
import { locationSchema, type LocationFormValues } from "./schema";
import type { LocationInput } from "../../services/locationService";

export interface LocationFormProps {
  location?: Location;
  onSubmit: (input: LocationInput) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

function toDefaults(location?: Location): LocationFormValues {
  return {
    name: location?.name ?? "",
    line1: location?.address.line1 ?? "",
    line2: location?.address.line2 ?? "",
    city: location?.address.city ?? "",
    region: location?.address.region ?? "",
    country: location?.address.country ?? "",
    postalCode: location?.address.postalCode ?? "",
    latitude: location?.coordinates ? String(location.coordinates.latitude) : "",
    longitude: location?.coordinates ? String(location.coordinates.longitude) : "",
  };
}

export function LocationForm({ location, onSubmit, onCancel, isSubmitting }: LocationFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LocationFormValues>({ resolver: zodResolver(locationSchema), defaultValues: toDefaults(location) });

  useEffect(() => {
    reset(toDefaults(location));
  }, [location, reset]);

  const submit = async (values: LocationFormValues) => {
    const latitude = values.latitude ? Number(values.latitude) : undefined;
    const longitude = values.longitude ? Number(values.longitude) : undefined;
    await onSubmit({
      name: values.name,
      address: {
        line1: values.line1,
        line2: values.line2 || undefined,
        city: values.city,
        region: values.region,
        country: values.country,
        postalCode: values.postalCode || undefined,
      },
      coordinates: latitude !== undefined && longitude !== undefined && !Number.isNaN(latitude) && !Number.isNaN(longitude)
        ? { latitude, longitude }
        : undefined,
      relatedPropertyIds: location?.relatedPropertyIds ?? [],
      relatedCompoundIds: location?.relatedCompoundIds ?? [],
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
      <FormField label="Location name" htmlFor="name" required error={errors.name?.message}>
        <Input id="name" hasError={Boolean(errors.name)} {...register("name")} />
      </FormField>
      <FormField label="Street address" htmlFor="line1" required error={errors.line1?.message}>
        <Input id="line1" hasError={Boolean(errors.line1)} {...register("line1")} />
      </FormField>
      <FormField label="Address line 2" htmlFor="line2" hint="Optional">
        <Input id="line2" {...register("line2")} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="City" htmlFor="city" required error={errors.city?.message}>
          <Input id="city" hasError={Boolean(errors.city)} {...register("city")} />
        </FormField>
        <FormField label="Region" htmlFor="region" required error={errors.region?.message}>
          <Input id="region" hasError={Boolean(errors.region)} {...register("region")} />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Country" htmlFor="country" required error={errors.country?.message}>
          <Input id="country" hasError={Boolean(errors.country)} {...register("country")} />
        </FormField>
        <FormField label="Postal code" htmlFor="postalCode" hint="Optional">
          <Input id="postalCode" {...register("postalCode")} />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Latitude" htmlFor="latitude" hint="Optional">
          <Input id="latitude" {...register("latitude")} />
        </FormField>
        <FormField label="Longitude" htmlFor="longitude" hint="Optional">
          <Input id="longitude" {...register("longitude")} />
        </FormField>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {location ? "Save changes" : "Create location"}
        </Button>
      </div>
    </form>
  );
}
