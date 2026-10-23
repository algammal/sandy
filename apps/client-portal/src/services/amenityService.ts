import type { AmenityRecord } from "@sandy/shared-types";
import { simulateRequest } from "./simulate";
import { seedAmenities } from "./seedData";

const amenities: AmenityRecord[] = seedAmenities.map((amenity) => ({ ...amenity }));

export const amenityService = {
  list(): Promise<AmenityRecord[]> {
    return simulateRequest(() => [...amenities], { delayMs: 300 });
  },
};
