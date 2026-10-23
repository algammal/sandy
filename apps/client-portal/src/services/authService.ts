import { simulateRequest } from "./simulate";
import { DEMO_CLIENT_NAME } from "../utils/constants";

export interface DemoUser {
  name: string;
  email: string;
  clientName: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

/**
 * Frontend-only demo authentication. No real session, hashing or server
 * validation happens here — this boundary exists purely so a real auth
 * provider can be dropped in later without touching the UI.
 *
 * Demo trigger: use an email containing "error" to preview the failure state.
 */
export const authService = {
  signIn(input: SignInInput): Promise<DemoUser> {
    const shouldFail = input.email.toLowerCase().includes("error");
    return simulateRequest(
      () => ({ name: "Amina Hassan", email: input.email, clientName: DEMO_CLIENT_NAME }),
      { delayMs: 650, failureRate: shouldFail ? 1 : 0, errorMessage: "Invalid email or password. (Demo mode: avoid using \"error\" in the email.)" },
    );
  },

  register(input: RegisterInput): Promise<DemoUser> {
    const shouldFail = input.email.toLowerCase().includes("error");
    return simulateRequest(
      () => ({ name: input.name, email: input.email, clientName: DEMO_CLIENT_NAME }),
      { delayMs: 750, failureRate: shouldFail ? 1 : 0, errorMessage: "Could not create the demo account. Please try again." },
    );
  },

  requestPasswordReset(email: string): Promise<{ email: string }> {
    const shouldFail = email.toLowerCase().includes("error");
    return simulateRequest(() => ({ email }), {
      delayMs: 650,
      failureRate: shouldFail ? 1 : 0,
      errorMessage: "We could not send a reset link to that address.",
    });
  },
};
