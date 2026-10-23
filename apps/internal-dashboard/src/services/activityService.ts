import type { ActivityLogEntry } from "@sandy/shared-types";
import { simulateRequest } from "./simulate";
import { listActivity } from "./activityLog";

export const activityService = {
  list(): Promise<ActivityLogEntry[]> {
    return simulateRequest(() => listActivity(), { delayMs: 350 });
  },
};
