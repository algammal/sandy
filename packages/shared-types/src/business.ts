import type {
  Address,
  Amenity,
  BusinessHoursEntry,
  Coordinates,
  ID,
  ISODateString,
} from "./common";

export type PropertyType =
  | "apartment"
  | "villa"
  | "office"
  | "retail"
  | "warehouse"
  | "mixed_use"
  | "other";

export interface Property {
  id: ID;
  clientId: ID;
  name: string;
  type: PropertyType;
  description: string;
  compoundId?: ID;
  locationId?: ID;
  address?: Address;
  amenityIds: ID[];
  contactNumberIds: ID[];
  metadata?: Record<string, string>;
  isArchived: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Compound {
  id: ID;
  clientId: ID;
  name: string;
  description: string;
  locationId?: ID;
  propertyIds: ID[];
  amenityIds: ID[];
  contactNumberIds: ID[];
  faqIds: ID[];
  isArchived: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Location {
  id: ID;
  clientId: ID;
  name: string;
  address: Address;
  coordinates?: Coordinates;
  relatedPropertyIds: ID[];
  relatedCompoundIds: ID[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type FaqCategory =
  | "general"
  | "pricing"
  | "policies"
  | "amenities"
  | "booking"
  | "support"
  | "other";

export interface Faq {
  id: ID;
  clientId: ID;
  question: string;
  answer: string;
  category: FaqCategory;
  compoundId?: ID;
  propertyId?: ID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface BusinessPolicy {
  id: ID;
  title: string;
  description: string;
}

export interface BusinessProfile {
  clientId: ID;
  businessName: string;
  description: string;
  category: string;
  contactEmail: string;
  contactPhone: string;
  website?: string;
  workingHours: BusinessHoursEntry[];
  supportedServices: string[];
  policies: BusinessPolicy[];
  additionalInformation?: string;
  updatedAt: ISODateString;
}

export interface AmenityRecord extends Amenity {
  clientId: ID;
}
