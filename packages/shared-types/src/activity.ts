import type { ID, ISODateString } from "./common";

export type ActivityActorType = "client" | "internal" | "system";

export interface ActivityLogEntry {
  id: ID;
  clientId?: ID;
  actorType: ActivityActorType;
  actorName: string;
  action: string;
  description: string;
  createdAt: ISODateString;
}
