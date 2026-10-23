import type { Submission, SubmissionStatus } from "@sandy/shared-types";
import { generateId } from "@sandy/shared-utils";
import { simulateRequest } from "./simulate";
import { seedSubmission } from "./seedData";

let submission: Submission = { ...seedSubmission, history: [...seedSubmission.history] };

export const submissionService = {
  get(): Promise<Submission> {
    return simulateRequest(() => ({ ...submission, history: [...submission.history] }));
  },

  /** Demo-only transition. A real backend would gate this behind actual completeness checks. */
  transition(status: SubmissionStatus, note?: string): Promise<Submission> {
    return simulateRequest(() => {
      submission = {
        ...submission,
        status,
        submittedAt: status === "submitted" ? new Date().toISOString() : submission.submittedAt,
        history: [
          ...submission.history,
          { id: generateId("hist"), status, note, actorName: "You", createdAt: new Date().toISOString() },
        ],
      };
      return { ...submission, history: [...submission.history] };
    });
  },
};
