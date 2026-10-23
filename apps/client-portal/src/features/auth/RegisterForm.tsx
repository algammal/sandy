"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Button, FormField, Input, useToast } from "@sandy/ui";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { registerAccount } from "../../store/slices/sessionSlice";
import { registerSchema, type RegisterFormValues } from "./schemas";

export function RegisterForm() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { showToast } = useToast();
  const status = useAppSelector((state) => state.session.status);
  const error = useAppSelector((state) => state.session.error);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (values: RegisterFormValues) => {
    const result = await dispatch(registerAccount(values));
    if (registerAccount.fulfilled.match(result)) {
      showToast({ tone: "success", title: "Account created", description: "This is a demo account — no real credentials were stored." });
      router.push("/dashboard");
    }
  };

  return (
    <div className="flex flex-col gap-5 p-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--sandy-foreground)]">Create your account</h1>
        <p className="mt-1 text-sm text-[var(--sandy-muted-foreground)]">
          Demo registration — this does not create a real account or store credentials.
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField label="Full name" htmlFor="name" required error={errors.name?.message}>
          <Input id="name" placeholder="Jane Doe" hasError={Boolean(errors.name)} {...register("name")} />
        </FormField>
        <FormField label="Email" htmlFor="email" required error={errors.email?.message}>
          <Input id="email" type="email" placeholder="you@business.com" hasError={Boolean(errors.email)} {...register("email")} />
        </FormField>
        <FormField label="Password" htmlFor="password" required error={errors.password?.message}>
          <Input id="password" type="password" hasError={Boolean(errors.password)} {...register("password")} />
        </FormField>
        <FormField label="Confirm password" htmlFor="confirmPassword" required error={errors.confirmPassword?.message}>
          <Input id="confirmPassword" type="password" hasError={Boolean(errors.confirmPassword)} {...register("confirmPassword")} />
        </FormField>
        {error && status === "failed" && (
          <p role="alert" className="rounded-lg bg-[var(--sandy-danger-bg)] px-3 py-2 text-sm text-[var(--sandy-danger)]">
            {error}
          </p>
        )}
        <Button type="submit" isLoading={status === "loading"}>
          Create account
        </Button>
        <p className="text-center text-sm text-[var(--sandy-muted-foreground)]">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-[var(--sandy-primary)] hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
