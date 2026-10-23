import type { ActivityActorType, ActivityLogEntry } from "@sandy/shared-types";
import { generateId } from "@sandy/shared-utils";
import { seedActivity } from "./seedData";

let activity: ActivityLogEntry[] = [...seedActivity];

export function recordActivity(entry: { clientId?: string; actorType: ActivityActorType; actorName: string; action: string; description: string }) {
  const logged: ActivityLogEntry = { ...entry, id: generateId("activity"), createdAt: new Date().toISOString() };
  activity = [logged, ...activity];
  return logged;
}

export function listActivity(): ActivityLogEntry[] {
  return [...activity].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
