"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button, FormField, Input } from "@sandy/ui";
import { simulateRequest } from "../../services/simulate";
import { resetPasswordSchema, type ResetPasswordFormValues } from "./schemas";

export function ResetPasswordForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = async () => {
    setIsSubmitting(true);
    await simulateRequest(() => true, { delayMs: 600 });
    setIsSubmitting(false);
    setIsComplete(true);
  };

  if (isComplete) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-[var(--sandy-success-bg)] text-[var(--sandy-success)]">
          <CheckCircle2 className="size-6" />
        </span>
        <h1 className="text-lg font-semibold text-[var(--sandy-foreground)]">Password updated (demo)</h1>
        <p className="text-sm text-[var(--sandy-muted-foreground)]">
          This frontend demo does not persist a real password change.
        </p>
        <Link href="/sign-in" className="text-sm text-[var(--sandy-primary)] hover:underline">
          Return to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--sandy-foreground)]">Set a new password</h1>
        <p className="mt-1 text-sm text-[var(--sandy-muted-foreground)]">Demo flow — no account is actually updated.</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField label="New password" htmlFor="password" required error={errors.password?.message}>
          <Input id="password" type="password" hasError={Boolean(errors.password)} {...register("password")} />
        </FormField>
        <FormField label="Confirm new password" htmlFor="confirmPassword" required error={errors.confirmPassword?.message}>
          <Input id="confirmPassword" type="password" hasError={Boolean(errors.confirmPassword)} {...register("confirmPassword")} />
        </FormField>
        <Button type="submit" isLoading={isSubmitting}>
          Update password
        </Button>
      </form>
    </div>
  );
}
