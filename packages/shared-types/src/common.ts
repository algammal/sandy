/** Shared primitive and value types used across both applications. */

export type ID = string;

export type ISODateString = string;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  region: string;
  country: string;
  postalCode?: string;
}

export type WeekDay =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface BusinessHoursEntry {
  day: WeekDay;
  closed: boolean;
  openTime?: string;
  closeTime?: string;
}

export type ContactLabel =
  | "main"
  | "sales"
  | "support"
  | "emergency"
  | "property"
  | "other";

export interface ContactNumber {
  id: ID;
  label: ContactLabel;
  displayName: string;
  phoneNumber: string;
  extension?: string;
  propertyId?: ID;
  compoundId?: ID;
  isPrimary: boolean;
}

export interface Amenity {
  id: ID;
  name: string;
  description?: string;
}

/** Generic async request status, mirrored by every slice that talks to a mock service. */
export type RequestStatus = "idle" | "loading" | "succeeded" | "failed";

export interface AsyncState {
  status: RequestStatus;
  error: string | null;
}
