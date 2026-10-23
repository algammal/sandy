"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button, FormField, Input } from "@sandy/ui";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { requestPasswordReset } from "../../store/slices/sessionSlice";
import { forgotPasswordSchema, type ForgotPasswordFormValues } from "./schemas";

export function ForgotPasswordForm() {
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.session.passwordResetStatus);
  const error = useAppSelector((state) => state.session.error);
  const sentTo = useAppSelector((state) => state.session.passwordResetSentTo);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = (values: ForgotPasswordFormValues) => {
    dispatch(requestPasswordReset(values.email));
  };

  if (status === "succeeded" && sentTo) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-[var(--sandy-success-bg)] text-[var(--sandy-success)]">
          <CheckCircle2 className="size-6" />
        </span>
        <h1 className="text-lg font-semibold text-[var(--sandy-foreground)]">Check your email</h1>
        <p className="text-sm text-[var(--sandy-muted-foreground)]">
          If an account exists for <strong>{sentTo}</strong>, a demo reset link has been &ldquo;sent&rdquo;. This is a
          frontend simulation — no email is actually delivered.
        </p>
        <Link href="/reset-password" className="text-sm text-[var(--sandy-primary)] hover:underline">
          Preview the reset-password screen
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--sandy-foreground)]">Reset your password</h1>
        <p className="mt-1 text-sm text-[var(--sandy-muted-foreground)]">
          Enter your email and we&apos;ll simulate sending a reset link.
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField label="Email" htmlFor="email" required error={errors.email?.message}>
          <Input id="email" type="email" placeholder="you@business.com" hasError={Boolean(errors.email)} {...register("email")} />
        </FormField>
        {error && status === "failed" && (
          <p role="alert" className="rounded-lg bg-[var(--sandy-danger-bg)] px-3 py-2 text-sm text-[var(--sandy-danger)]">
            {error}
          </p>
        )}
        <Button type="submit" isLoading={status === "loading"}>
          Send reset link
        </Button>
        <Link href="/sign-in" className="text-center text-sm text-[var(--sandy-muted-foreground)] hover:text-[var(--sandy-foreground)]">
          Back to sign in
        </Link>
      </form>
    </div>
  );
}
