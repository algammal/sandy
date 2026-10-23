"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Button, FormField, Input, useToast } from "@sandy/ui";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { signIn } from "../../store/slices/sessionSlice";
import { signInSchema, type SignInFormValues } from "./schemas";

export function SignInForm() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { showToast } = useToast();
  const status = useAppSelector((state) => state.session.status);
  const error = useAppSelector((state) => state.session.error);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormValues>({ resolver: zodResolver(signInSchema) });

  const onSubmit = async (values: SignInFormValues) => {
    const result = await dispatch(signIn(values));
    if (signIn.fulfilled.match(result)) {
      showToast({ tone: "success", title: "Signed in", description: `Welcome back, ${result.payload.name}.` });
      router.push("/dashboard");
    }
  };

  const continueWithDemoAccount = async () => {
    const result = await dispatch(signIn({ email: "demo@sandcastleliving.com", password: "demo1234" }));
    if (signIn.fulfilled.match(result)) {
      showToast({ tone: "success", title: "Signed in", description: `Welcome back, ${result.payload.name}.` });
      router.push("/dashboard");
    }
  };

  return (
    <div className="flex flex-col gap-5 p-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--sandy-foreground)]">Welcome back</h1>
        <p className="mt-1 text-sm text-[var(--sandy-muted-foreground)]">Sign in to manage your business information.</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField label="Email" htmlFor="email" required error={errors.email?.message}>
          <Input id="email" type="email" placeholder="you@business.com" hasError={Boolean(errors.email)} {...register("email")} />
        </FormField>
        <FormField label="Password" htmlFor="password" required error={errors.password?.message}>
          <Input id="password" type="password" placeholder="••••••••" hasError={Boolean(errors.password)} {...register("password")} />
        </FormField>
        {error && status === "failed" && (
          <p role="alert" className="rounded-lg bg-[var(--sandy-danger-bg)] px-3 py-2 text-sm text-[var(--sandy-danger)]">
            {error}
          </p>
        )}
        <div className="flex items-center justify-between text-sm">
          <Link href="/forgot-password" className="text-[var(--sandy-primary)] hover:underline">
            Forgot password?
          </Link>
          <Link href="/register" className="text-[var(--sandy-muted-foreground)] hover:text-[var(--sandy-foreground)]">
            Create an account
          </Link>
        </div>
        <Button type="submit" isLoading={status === "loading"}>
          Sign in
        </Button>
        <Button type="button" variant="outline" onClick={continueWithDemoAccount} isLoading={status === "loading"}>
          Continue with demo account
        </Button>
      </form>
    </div>
  );
}
