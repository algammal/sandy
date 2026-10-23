import { describe, expect, it } from "vitest";
import reducer, { transitionSubmission } from "./submissionSlice";
import type { Submission } from "@sandy/shared-types";

const baseSubmission: Submission = {
  id: "submission_1",
  clientId: "client_demo",
  status: "draft",
  completionPercentage: 50,
  history: [],
};

describe("submissionSlice", () => {
  it("applies a status transition returned by the service", () => {
    const submitted: Submission = {
      ...baseSubmission,
      status: "submitted",
      submittedAt: "2024-01-01T00:00:00.000Z",
      history: [{ id: "hist_1", status: "submitted", actorName: "You", createdAt: "2024-01-01T00:00:00.000Z" }],
    };
    const state = reducer(
      undefined,
      transitionSubmission.fulfilled(submitted, "requestId", { status: "submitted" }),
    );
    expect(state.submission?.status).toBe("submitted");
    expect(state.submission?.history).toHaveLength(1);
    expect(state.transitionStatus).toBe("succeeded");
  });

  it("marks the transition as failed on rejection", () => {
    const state = reducer(
      undefined,
      transitionSubmission.rejected(new Error("Could not update."), "requestId", { status: "submitted" }),
    );
    expect(state.transitionStatus).toBe("failed");
    expect(state.error).toBe("Could not update.");
  });
});
