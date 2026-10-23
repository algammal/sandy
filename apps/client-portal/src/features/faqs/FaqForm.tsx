"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Faq } from "@sandy/shared-types";
import { Button, FormField, Input, Select, Textarea } from "@sandy/ui";
import { useAppSelector } from "../../store/hooks";
import { faqCategoryOptions, faqSchema, type FaqFormValues } from "./schema";
import type { FaqInput } from "../../services/faqService";

export interface FaqFormProps {
  faq?: Faq;
  onSubmit: (input: FaqInput) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

function toDefaults(faq?: Faq): FaqFormValues {
  return {
    question: faq?.question ?? "",
    answer: faq?.answer ?? "",
    category: faq?.category ?? "general",
    compoundId: faq?.compoundId ?? "",
    propertyId: faq?.propertyId ?? "",
  };
}

export function FaqForm({ faq, onSubmit, onCancel, isSubmitting }: FaqFormProps) {
  const compounds = useAppSelector((state) => state.compounds.items);
  const properties = useAppSelector((state) => state.properties.items);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FaqFormValues>({ resolver: zodResolver(faqSchema), defaultValues: toDefaults(faq) });

  useEffect(() => {
    reset(toDefaults(faq));
  }, [faq, reset]);

  const submit = async (values: FaqFormValues) => {
    await onSubmit({
      question: values.question,
      answer: values.answer,
      category: values.category,
      compoundId: values.compoundId || undefined,
      propertyId: values.propertyId || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
      <FormField label="Question" htmlFor="question" required error={errors.question?.message}>
        <Input id="question" hasError={Boolean(errors.question)} {...register("question")} />
      </FormField>
      <FormField label="Answer" htmlFor="answer" required error={errors.answer?.message}>
        <Textarea id="answer" rows={3} hasError={Boolean(errors.answer)} {...register("answer")} />
      </FormField>
      <FormField label="Category" htmlFor="category" required error={errors.category?.message}>
        <Select id="category" options={faqCategoryOptions} {...register("category")} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Compound" htmlFor="compoundId" hint="Optional">
          <Select
            id="compoundId"
            placeholder="General (all compounds)"
            options={compounds.map((compound) => ({ value: compound.id, label: compound.name }))}
            {...register("compoundId")}
          />
        </FormField>
        <FormField label="Property" htmlFor="propertyId" hint="Optional">
          <Select
            id="propertyId"
            placeholder="General (all properties)"
            options={properties.map((property) => ({ value: property.id, label: property.name }))}
            {...register("propertyId")}
          />
        </FormField>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {faq ? "Save changes" : "Add FAQ"}
        </Button>
      </div>
    </form>
  );
}
