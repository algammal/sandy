import { describe, expect, it } from "vitest";
import reducer, { createProperty, fetchProperties, setPropertyArchived, setSearchTerm } from "./propertiesSlice";
import type { Property } from "@sandy/shared-types";

const sampleProperty: Property = {
  id: "prop_1",
  clientId: "client_demo",
  name: "Test Villa",
  type: "villa",
  description: "A villa",
  amenityIds: [],
  contactNumberIds: [],
  isArchived: false,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("propertiesSlice", () => {
  it("has the expected initial state", () => {
    const state = reducer(undefined, { type: "@@init" });
    expect(state.items).toEqual([]);
    expect(state.status).toBe("idle");
  });

  it("sets status to loading on fetch pending", () => {
    const state = reducer(undefined, fetchProperties.pending("requestId", undefined));
    expect(state.status).toBe("loading");
    expect(state.error).toBeNull();
  });

  it("stores properties on fetch fulfilled", () => {
    const state = reducer(undefined, fetchProperties.fulfilled([sampleProperty], "requestId", undefined));
    expect(state.status).toBe("succeeded");
    expect(state.items).toHaveLength(1);
    expect(state.items[0]?.name).toBe("Test Villa");
  });

  it("records an error message on fetch rejected", () => {
    const action = fetchProperties.rejected(new Error("network down"), "requestId", undefined);
    const state = reducer(undefined, action);
    expect(state.status).toBe("failed");
    expect(state.error).toBe("network down");
  });

  it("prepends a newly created property", () => {
    const initial = reducer(undefined, fetchProperties.fulfilled([sampleProperty], "requestId", undefined));
    const created: Property = { ...sampleProperty, id: "prop_2", name: "New Apartment" };
    const next = reducer(
      initial,
      createProperty.fulfilled(created, "requestId", {
        name: "New Apartment",
        type: "apartment",
        description: "desc",
        amenityIds: [],
        contactNumberIds: [],
      }),
    );
    expect(next.items[0]?.id).toBe("prop_2");
    expect(next.items).toHaveLength(2);
  });

  it("toggles archived state for the matching property", () => {
    const initial = reducer(undefined, fetchProperties.fulfilled([sampleProperty], "requestId", undefined));
    const archived: Property = { ...sampleProperty, isArchived: true };
    const next = reducer(
      initial,
      setPropertyArchived.fulfilled(archived, "requestId", { id: sampleProperty.id, isArchived: true }),
    );
    expect(next.items[0]?.isArchived).toBe(true);
  });

  it("updates the search term", () => {
    const state = reducer(undefined, setSearchTerm("villa"));
    expect(state.searchTerm).toBe("villa");
  });
});
