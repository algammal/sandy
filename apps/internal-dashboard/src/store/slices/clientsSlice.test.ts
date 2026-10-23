import { describe, expect, it } from "vitest";
import reducer, { fetchClients, transitionClientSubmission } from "./clientsSlice";
import type { Client } from "@sandy/shared-types";

const client: Client = {
  id: "client_1",
  name: "Test Co",
  businessCategory: "Real Estate",
  contactEmail: "hi@test.co",
  contactPhone: "+1 555 0100",
  submissionStatus: "submitted",
  agentStatus: "not_configured",
  propertyCount: 0,
  compoundCount: 0,
  locationCount: 0,
  contactNumberCount: 0,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("clientsSlice", () => {
  it("stores the list of clients on a successful fetch", () => {
    const state = reducer(undefined, fetchClients.fulfilled([client], "requestId", undefined));
    expect(state.items).toHaveLength(1);
  });

  it("applies a submission status transition to the matching client", () => {
    const initial = reducer(undefined, fetchClients.fulfilled([client], "requestId", undefined));
    const approved: Client = { ...client, submissionStatus: "approved" };
    const next = reducer(
      initial,
      transitionClientSubmission.fulfilled(approved, "requestId", { id: client.id, status: "approved" }),
    );
    expect(next.items[0]?.submissionStatus).toBe("approved");
  });
});
