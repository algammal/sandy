"use client";

import { titleCase } from "@sandy/shared-utils";
import { EmptyState, GlassPanel, StatusBadge } from "@sandy/ui";
import type { ClientBusinessInfo } from "../../services/businessInfoSeed";

export function BusinessProfileSection({ info }: { info: ClientBusinessInfo }) {
  const { businessProfile } = info;
  if (!businessProfile.businessName) {
    return <EmptyState title="No business profile submitted yet" description="This client hasn't filled in their business profile." />;
  }
  return (
    <div className="flex flex-col gap-4">
      <GlassPanel>
        <h3 className="mb-2 text-sm font-semibold text-[var(--sandy-foreground)]">{businessProfile.businessName}</h3>
        <p className="text-sm text-[var(--sandy-muted-foreground)]">{businessProfile.description || "No description provided."}</p>
      </GlassPanel>
      <div className="grid gap-4 sm:grid-cols-2">
        <GlassPanel>
          <h4 className="mb-2 text-sm font-semibold text-[var(--sandy-foreground)]">Contact</h4>
          <p className="text-sm text-[var(--sandy-foreground)]">{businessProfile.contactEmail || "No email provided"}</p>
          <p className="text-sm text-[var(--sandy-foreground)]">{businessProfile.contactPhone || "No phone provided"}</p>
        </GlassPanel>
        <GlassPanel>
          <h4 className="mb-2 text-sm font-semibold text-[var(--sandy-foreground)]">Supported services</h4>
          {businessProfile.supportedServices.length === 0 ? (
            <p className="text-sm text-[var(--sandy-muted-foreground)]">None listed.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {businessProfile.supportedServices.map((service) => (
                <StatusBadge key={service} label={service} tone="info" />
              ))}
            </div>
          )}
        </GlassPanel>
      </div>
      <GlassPanel>
        <h4 className="mb-2 text-sm font-semibold text-[var(--sandy-foreground)]">Working hours</h4>
        <ul className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-3">
          {businessProfile.workingHours.map((entry) => (
            <li key={entry.day} className="text-[var(--sandy-foreground)]">
              <span className="font-medium">{titleCase(entry.day)}:</span>{" "}
              {entry.closed ? <span className="text-[var(--sandy-muted-foreground)]">Closed</span> : `${entry.openTime}–${entry.closeTime}`}
            </li>
          ))}
        </ul>
      </GlassPanel>
      <GlassPanel>
        <h4 className="mb-2 text-sm font-semibold text-[var(--sandy-foreground)]">Policies</h4>
        {businessProfile.policies.length === 0 ? (
          <p className="text-sm text-[var(--sandy-muted-foreground)]">No policies listed.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {businessProfile.policies.map((policy) => (
              <li key={policy.id}>
                <span className="font-medium text-[var(--sandy-foreground)]">{policy.title}:</span>{" "}
                <span className="text-[var(--sandy-muted-foreground)]">{policy.description}</span>
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>
    </div>
  );
}

export function PropertiesSection({ info }: { info: ClientBusinessInfo }) {
  if (info.properties.length === 0) {
    return <EmptyState title="No properties submitted yet" />;
  }
  return (
    <div className="flex flex-col gap-3">
      {info.properties.map((property) => (
        <GlassPanel key={property.id} className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-[var(--sandy-foreground)]">{property.name}</h4>
            <StatusBadge label={titleCase(property.type)} tone="neutral" />
          </div>
          <p className="text-sm text-[var(--sandy-muted-foreground)]">{property.description}</p>
        </GlassPanel>
      ))}
    </div>
  );
}

export function CompoundsSection({ info }: { info: ClientBusinessInfo }) {
  if (info.compounds.length === 0) {
    return <EmptyState title="No compounds submitted yet" />;
  }
  return (
    <div className="flex flex-col gap-3">
      {info.compounds.map((compound) => (
        <GlassPanel key={compound.id} className="flex flex-col gap-1">
          <h4 className="font-medium text-[var(--sandy-foreground)]">{compound.name}</h4>
          <p className="text-sm text-[var(--sandy-muted-foreground)]">{compound.description}</p>
          <p className="text-xs text-[var(--sandy-muted-foreground)]">{compound.propertyIds.length} linked properties</p>
        </GlassPanel>
      ))}
    </div>
  );
}

export function LocationsSection({ info }: { info: ClientBusinessInfo }) {
  if (info.locations.length === 0) {
    return <EmptyState title="No locations submitted yet" />;
  }
  return (
    <div className="flex flex-col gap-3">
      {info.locations.map((location) => (
        <GlassPanel key={location.id} className="flex flex-col gap-1">
          <h4 className="font-medium text-[var(--sandy-foreground)]">{location.name}</h4>
          <p className="text-sm text-[var(--sandy-muted-foreground)]">
            {location.address.line1}, {location.address.city}, {location.address.region}, {location.address.country}
          </p>
        </GlassPanel>
      ))}
    </div>
  );
}

export function ContactsSection({ info }: { info: ClientBusinessInfo }) {
  if (info.contacts.length === 0) {
    return <EmptyState title="No contact numbers submitted yet" />;
  }
  return (
    <div className="flex flex-col gap-2">
      {info.contacts.map((contact) => (
        <GlassPanel key={contact.id} className="flex items-center justify-between">
          <div>
            <p className="font-medium text-[var(--sandy-foreground)]">{contact.displayName}</p>
            <p className="text-sm text-[var(--sandy-muted-foreground)]">{contact.phoneNumber}</p>
          </div>
          <StatusBadge label={titleCase(contact.label)} tone="neutral" />
        </GlassPanel>
      ))}
    </div>
  );
}

export function FaqsSection({ info }: { info: ClientBusinessInfo }) {
  if (info.faqs.length === 0) {
    return <EmptyState title="No FAQs submitted yet" />;
  }
  return (
    <div className="flex flex-col gap-3">
      {info.faqs.map((faq) => (
        <GlassPanel key={faq.id} className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <p className="font-medium text-[var(--sandy-foreground)]">{faq.question}</p>
            <StatusBadge label={faq.category} tone="info" />
          </div>
          <p className="text-sm text-[var(--sandy-muted-foreground)]">{faq.answer}</p>
        </GlassPanel>
      ))}
    </div>
  );
}
