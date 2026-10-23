import type { Compound } from "@sandy/shared-types";
import { generateId } from "@sandy/shared-utils";
import { simulateRequest } from "./simulate";
import { seedCompounds } from "./seedData";
import { DEMO_CLIENT_ID } from "../utils/constants";

let compounds: Compound[] = seedCompounds.map((compound) => ({ ...compound }));

export type CompoundInput = Omit<Compound, "id" | "clientId" | "isArchived" | "createdAt" | "updatedAt">;

export const compoundService = {
  list(): Promise<Compound[]> {
    return simulateRequest(() => [...compounds]);
  },

  get(id: string): Promise<Compound | undefined> {
    return simulateRequest(() => compounds.find((compound) => compound.id === id));
  },

  create(input: CompoundInput): Promise<Compound> {
    return simulateRequest(() => {
      const now = new Date().toISOString();
      const compound: Compound = {
        ...input,
        id: generateId("cmp"),
        clientId: DEMO_CLIENT_ID,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      };
      compounds = [compound, ...compounds];
      return compound;
    });
  },

  update(id: string, input: CompoundInput): Promise<Compound> {
    return simulateRequest(() => {
      const existing = compounds.find((compound) => compound.id === id);
      if (!existing) throw new Error("Compound not found.");
      const updated: Compound = { ...existing, ...input, updatedAt: new Date().toISOString() };
      compounds = compounds.map((compound) => (compound.id === id ? updated : compound));
      return updated;
    });
  },

  setArchived(id: string, isArchived: boolean): Promise<Compound> {
    return simulateRequest(() => {
      const existing = compounds.find((compound) => compound.id === id);
      if (!existing) throw new Error("Compound not found.");
      const updated: Compound = { ...existing, isArchived, updatedAt: new Date().toISOString() };
      compounds = compounds.map((compound) => (compound.id === id ? updated : compound));
      return updated;
    });
  },
};
