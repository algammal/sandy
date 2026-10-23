import type {
  AmenityRecord,
  BusinessProfile,
  Compound,
  ContactNumber,
  Faq,
  Location,
  Property,
} from "@sandy/shared-types";

/**
 * In this frontend-only phase, the internal dashboard and the client portal
 * are separate applications with separate mock data stores — there is no
 * backend yet to bridge them. This file stands in for "the business
 * information a client submitted," scoped to a few representative clients
 * so the review workspace and Agent Studio have real data to work with.
 * A real backend would replace this with an actual client submission record.
 */
export interface ClientBusinessInfo {
  businessProfile: BusinessProfile;
  properties: Property[];
  compounds: Compound[];
  locations: Location[];
  contacts: ContactNumber[];
  faqs: Faq[];
  amenities: AmenityRecord[];
}

const now = new Date();
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

const sandcastleInfo: ClientBusinessInfo = {
  businessProfile: {
    clientId: "client_demo_sandcastle",
    businessName: "Sandcastle Living",
    description:
      "Sandcastle Living manages residential compounds, beachfront chalets and boutique office parks across Greater Cairo and the North Coast.",
    category: "Real Estate & Property Management",
    contactEmail: "hello@sandcastleliving.com",
    contactPhone: "+20 2 2758 4100",
    website: "https://sandcastleliving.example.com",
    workingHours: [
      { day: "sunday", closed: false, openTime: "09:00", closeTime: "18:00" },
      { day: "monday", closed: false, openTime: "09:00", closeTime: "18:00" },
      { day: "friday", closed: true },
    ],
    supportedServices: ["Property Leasing", "Property Sales", "Facility Management"],
    policies: [{ id: "policy_1", title: "Cancellation Policy", description: "Full refund 14+ days before check-in." }],
    updatedAt: daysAgo(5),
  },
  properties: [
    {
      id: "prop_tower_a_304",
      clientId: "client_demo_sandcastle",
      name: "Sandcastle Tower A — Unit 304",
      type: "apartment",
      description: "A 2-bedroom apartment with a courtyard-facing balcony.",
      compoundId: "cmp_sandcastle_residence",
      amenityIds: ["am_pool", "am_gym"],
      contactNumberIds: [],
      isArchived: false,
      createdAt: daysAgo(205),
      updatedAt: daysAgo(12),
    },
    {
      id: "prop_marina_chalet_7",
      clientId: "client_demo_sandcastle",
      name: "Marina Bay Chalet 7",
      type: "villa",
      description: "A 3-bedroom beachfront chalet with a private terrace.",
      compoundId: "cmp_marina_bay",
      amenityIds: ["am_pool", "am_concierge"],
      contactNumberIds: [],
      isArchived: false,
      createdAt: daysAgo(196),
      updatedAt: daysAgo(30),
    },
  ],
  compounds: [
    {
      id: "cmp_sandcastle_residence",
      clientId: "client_demo_sandcastle",
      name: "Sandcastle Residence",
      description: "A gated residential community in New Cairo with resort-style amenities.",
      propertyIds: ["prop_tower_a_304"],
      amenityIds: ["am_pool", "am_gym", "am_security"],
      contactNumberIds: [],
      faqIds: ["faq_booking"],
      isArchived: false,
      createdAt: daysAgo(210),
      updatedAt: daysAgo(12),
    },
    {
      id: "cmp_marina_bay",
      clientId: "client_demo_sandcastle",
      name: "Marina Bay Compound",
      description: "Beachfront chalets on the North Coast with a private marina.",
      propertyIds: ["prop_marina_chalet_7"],
      amenityIds: ["am_pool", "am_concierge"],
      contactNumberIds: [],
      faqIds: ["faq_checkin"],
      isArchived: false,
      createdAt: daysAgo(198),
      updatedAt: daysAgo(30),
    },
  ],
  locations: [
    {
      id: "loc_new_cairo",
      clientId: "client_demo_sandcastle",
      name: "New Cairo — Fifth Settlement",
      address: { line1: "Plot 142, Teseen Street", city: "New Cairo", region: "Cairo", country: "Egypt" },
      relatedPropertyIds: ["prop_tower_a_304"],
      relatedCompoundIds: ["cmp_sandcastle_residence"],
      createdAt: daysAgo(210),
      updatedAt: daysAgo(12),
    },
  ],
  contacts: [
    { id: "contact_main", label: "main", displayName: "Main Line", phoneNumber: "+20 2 2758 4100", isPrimary: true },
    { id: "contact_sales", label: "sales", displayName: "Sales Desk", phoneNumber: "+20 2 2758 4101", isPrimary: false },
  ],
  faqs: [
    {
      id: "faq_booking",
      clientId: "client_demo_sandcastle",
      question: "How do I book a viewing?",
      answer: "Call the front desk or email bookings@sandcastleliving.com.",
      category: "booking",
      createdAt: daysAgo(175),
      updatedAt: daysAgo(60),
    },
    {
      id: "faq_checkin",
      clientId: "client_demo_sandcastle",
      question: "What is the check-in process for Marina Bay chalets?",
      answer: "Check-in is from 3:00 PM at the Marina Bay concierge desk.",
      category: "booking",
      createdAt: daysAgo(150),
      updatedAt: daysAgo(30),
    },
  ],
  amenities: [
    { id: "am_pool", clientId: "client_demo_sandcastle", name: "Swimming Pool" },
    { id: "am_gym", clientId: "client_demo_sandcastle", name: "Fitness Center" },
    { id: "am_security", clientId: "client_demo_sandcastle", name: "24/7 Security" },
    { id: "am_concierge", clientId: "client_demo_sandcastle", name: "Concierge Desk" },
  ],
};

const nileViewInfo: ClientBusinessInfo = {
  businessProfile: {
    clientId: "client_nile_view",
    businessName: "Nile View Residences",
    description: "Riverside apartments and serviced residences along the Nile Corniche.",
    category: "Real Estate & Property Management",
    contactEmail: "contact@nileview.example.com",
    contactPhone: "+20 2 3456 7890",
    workingHours: [{ day: "sunday", closed: false, openTime: "08:00", closeTime: "20:00" }],
    supportedServices: ["Property Leasing", "Concierge Services"],
    policies: [{ id: "policy_2", title: "Pet Policy", description: "Small pets allowed with prior approval." }],
    updatedAt: daysAgo(3),
  },
  properties: [
    {
      id: "prop_nile_1201",
      clientId: "client_nile_view",
      name: "Nile Tower — Unit 1201",
      type: "apartment",
      description: "A riverside 3-bedroom apartment with a full Nile view.",
      amenityIds: [],
      contactNumberIds: [],
      isArchived: false,
      createdAt: daysAgo(250),
      updatedAt: daysAgo(3),
    },
  ],
  compounds: [],
  locations: [
    {
      id: "loc_corniche",
      clientId: "client_nile_view",
      name: "Nile Corniche",
      address: { line1: "Corniche El Nile", city: "Cairo", region: "Cairo", country: "Egypt" },
      relatedPropertyIds: ["prop_nile_1201"],
      relatedCompoundIds: [],
      createdAt: daysAgo(260),
      updatedAt: daysAgo(3),
    },
  ],
  contacts: [{ id: "contact_nile_main", label: "main", displayName: "Leasing Office", phoneNumber: "+20 2 3456 7890", isPrimary: true }],
  faqs: [
    {
      id: "faq_nile_1",
      clientId: "client_nile_view",
      question: "Is covered parking included?",
      answer: "Yes, one covered parking spot is included with every unit.",
      category: "amenities",
      createdAt: daysAgo(100),
      updatedAt: daysAgo(10),
    },
  ],
  amenities: [],
};

const blueHarborInfo: ClientBusinessInfo = {
  businessProfile: {
    clientId: "client_blue_harbor",
    businessName: "Blue Harbor Hospitality",
    description: "A beachfront resort offering rooms, suites and a full-service spa.",
    category: "Hospitality & Resorts",
    contactEmail: "guest@blueharbor.example.com",
    contactPhone: "",
    workingHours: [{ day: "sunday", closed: false, openTime: "00:00", closeTime: "23:59" }],
    supportedServices: ["Room Booking"],
    policies: [],
    updatedAt: daysAgo(2),
  },
  properties: [
    {
      id: "prop_blue_suite_1",
      clientId: "client_blue_harbor",
      name: "Oceanfront Suite 1",
      type: "villa",
      description: "A beachfront suite with a private balcony.",
      amenityIds: [],
      contactNumberIds: [],
      isArchived: false,
      createdAt: daysAgo(70),
      updatedAt: daysAgo(2),
    },
  ],
  compounds: [
    {
      id: "cmp_blue_resort",
      clientId: "client_blue_harbor",
      name: "Blue Harbor Resort",
      description: "The main resort compound with rooms, suites and a spa.",
      propertyIds: ["prop_blue_suite_1"],
      amenityIds: [],
      contactNumberIds: [],
      faqIds: [],
      isArchived: false,
      createdAt: daysAgo(70),
      updatedAt: daysAgo(2),
    },
  ],
  locations: [],
  contacts: [],
  faqs: [],
  amenities: [],
};

export const businessInfoByClientId: Record<string, ClientBusinessInfo> = {
  client_demo_sandcastle: sandcastleInfo,
  client_nile_view: nileViewInfo,
  client_blue_harbor: blueHarborInfo,
};

export const emptyBusinessInfo: ClientBusinessInfo = {
  businessProfile: {
    clientId: "",
    businessName: "",
    description: "",
    category: "",
    contactEmail: "",
    contactPhone: "",
    workingHours: [],
    supportedServices: [],
    policies: [],
    updatedAt: new Date().toISOString(),
  },
  properties: [],
  compounds: [],
  locations: [],
  contacts: [],
  faqs: [],
  amenities: [],
};
