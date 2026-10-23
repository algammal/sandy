import type { ReviewNote, ReviewNoteVisibility } from "@sandy/shared-types";
import { generateId } from "@sandy/shared-utils";
import { simulateRequest } from "./simulate";
import { seedReviewNotes } from "./seedData";
import { recordActivity } from "./activityLog";

let notes: ReviewNote[] = seedReviewNotes.map((note) => ({ ...note }));

export const reviewNoteService = {
  listForClient(clientId: string): Promise<ReviewNote[]> {
    return simulateRequest(() => notes.filter((note) => note.clientId === clientId));
  },

  add(clientId: string, message: string, visibility: ReviewNoteVisibility, authorName = "You"): Promise<ReviewNote> {
    return simulateRequest(() => {
      const note: ReviewNote = { id: generateId("note"), clientId, authorName, visibility, message, createdAt: new Date().toISOString() };
      notes = [note, ...notes];
      recordActivity({
        clientId,
        actorType: "internal",
        actorName: authorName,
        action: "review_note_added",
        description: `${authorName} added a ${visibility === "internal" ? "internal" : "client-visible"} review note.`,
      });
      return note;
    });
  },
};
