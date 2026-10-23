import type { ContactNumber } from "@sandy/shared-types";
import { generateId } from "@sandy/shared-utils";
import { simulateRequest } from "./simulate";
import { seedContactNumbers } from "./seedData";

let contacts: ContactNumber[] = seedContactNumbers.map((contact) => ({ ...contact }));

export type ContactNumberInput = Omit<ContactNumber, "id">;

export const contactService = {
  list(): Promise<ContactNumber[]> {
    return simulateRequest(() => [...contacts]);
  },

  create(input: ContactNumberInput): Promise<ContactNumber> {
    return simulateRequest(() => {
      const contact: ContactNumber = { ...input, id: generateId("contact") };
      contacts = [contact, ...contacts];
      return contact;
    });
  },

  update(id: string, input: ContactNumberInput): Promise<ContactNumber> {
    return simulateRequest(() => {
      const existing = contacts.find((contact) => contact.id === id);
      if (!existing) throw new Error("Contact number not found.");
      const updated: ContactNumber = { ...existing, ...input };
      contacts = contacts.map((contact) => (contact.id === id ? updated : contact));
      return updated;
    });
  },

  remove(id: string): Promise<{ id: string }> {
    return simulateRequest(() => {
      contacts = contacts.filter((contact) => contact.id !== id);
      return { id };
    });
  },
};
