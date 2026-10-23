import type { Property } from "@sandy/shared-types";
import { generateId } from "@sandy/shared-utils";
import { simulateRequest } from "./simulate";
import { seedProperties } from "./seedData";
import { DEMO_CLIENT_ID } from "../utils/constants";

let properties: Property[] = seedProperties.map((property) => ({ ...property }));

export type PropertyInput = Omit<Property, "id" | "clientId" | "isArchived" | "createdAt" | "updatedAt">;

export const propertyService = {
  list(): Promise<Property[]> {
    return simulateRequest(() => [...properties]);
  },

  get(id: string): Promise<Property | undefined> {
    return simulateRequest(() => properties.find((property) => property.id === id));
  },

  create(input: PropertyInput): Promise<Property> {
    return simulateRequest(() => {
      const now = new Date().toISOString();
      const property: Property = {
        ...input,
        id: generateId("prop"),
        clientId: DEMO_CLIENT_ID,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      };
      properties = [property, ...properties];
      return property;
    });
  },

  update(id: string, input: PropertyInput): Promise<Property> {
    return simulateRequest(() => {
      const existing = properties.find((property) => property.id === id);
      if (!existing) throw new Error("Property not found.");
      const updated: Property = { ...existing, ...input, updatedAt: new Date().toISOString() };
      properties = properties.map((property) => (property.id === id ? updated : property));
      return updated;
    });
  },

  setArchived(id: string, isArchived: boolean): Promise<Property> {
    return simulateRequest(() => {
      const existing = properties.find((property) => property.id === id);
      if (!existing) throw new Error("Property not found.");
      const updated: Property = { ...existing, isArchived, updatedAt: new Date().toISOString() };
      properties = properties.map((property) => (property.id === id ? updated : property));
      return updated;
    });
  },
};
