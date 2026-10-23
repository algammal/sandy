import type { Faq } from "@sandy/shared-types";
import { generateId } from "@sandy/shared-utils";
import { simulateRequest } from "./simulate";
import { seedFaqs } from "./seedData";
import { DEMO_CLIENT_ID } from "../utils/constants";

let faqs: Faq[] = seedFaqs.map((faq) => ({ ...faq }));

export type FaqInput = Omit<Faq, "id" | "clientId" | "createdAt" | "updatedAt">;

export const faqService = {
  list(): Promise<Faq[]> {
    return simulateRequest(() => [...faqs]);
  },

  create(input: FaqInput): Promise<Faq> {
    return simulateRequest(() => {
      const now = new Date().toISOString();
      const faq: Faq = { ...input, id: generateId("faq"), clientId: DEMO_CLIENT_ID, createdAt: now, updatedAt: now };
      faqs = [faq, ...faqs];
      return faq;
    });
  },

  update(id: string, input: FaqInput): Promise<Faq> {
    return simulateRequest(() => {
      const existing = faqs.find((faq) => faq.id === id);
      if (!existing) throw new Error("FAQ not found.");
      const updated: Faq = { ...existing, ...input, updatedAt: new Date().toISOString() };
      faqs = faqs.map((faq) => (faq.id === id ? updated : faq));
      return updated;
    });
  },

  remove(id: string): Promise<{ id: string }> {
    return simulateRequest(() => {
      faqs = faqs.filter((faq) => faq.id !== id);
      return { id };
    });
  },
};
