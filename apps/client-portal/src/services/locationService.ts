import type { Location } from "@sandy/shared-types";
import { generateId } from "@sandy/shared-utils";
import { simulateRequest } from "./simulate";
import { seedLocations } from "./seedData";
import { DEMO_CLIENT_ID } from "../utils/constants";

let locations: Location[] = seedLocations.map((location) => ({ ...location }));

export type LocationInput = Omit<Location, "id" | "clientId" | "createdAt" | "updatedAt">;

export const locationService = {
  list(): Promise<Location[]> {
    return simulateRequest(() => [...locations]);
  },

  get(id: string): Promise<Location | undefined> {
    return simulateRequest(() => locations.find((location) => location.id === id));
  },

  create(input: LocationInput): Promise<Location> {
    return simulateRequest(() => {
      const now = new Date().toISOString();
      const location: Location = { ...input, id: generateId("loc"), clientId: DEMO_CLIENT_ID, createdAt: now, updatedAt: now };
      locations = [location, ...locations];
      return location;
    });
  },

  update(id: string, input: LocationInput): Promise<Location> {
    return simulateRequest(() => {
      const existing = locations.find((location) => location.id === id);
      if (!existing) throw new Error("Location not found.");
      const updated: Location = { ...existing, ...input, updatedAt: new Date().toISOString() };
      locations = locations.map((location) => (location.id === id ? updated : location));
      return updated;
    });
  },

  remove(id: string): Promise<{ id: string }> {
    return simulateRequest(() => {
      locations = locations.filter((location) => location.id !== id);
      return { id };
    });
  },
};
