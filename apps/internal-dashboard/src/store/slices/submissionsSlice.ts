import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RequestStatus, ReviewNote, ReviewNoteVisibility } from "@sandy/shared-types";
import { reviewNoteService } from "../../services/reviewNoteService";

interface SubmissionsState {
  notesByClientId: Record<string, ReviewNote[]>;
  status: RequestStatus;
  mutationStatus: RequestStatus;
  error: string | null;
}

const initialState: SubmissionsState = {
  notesByClientId: {},
  status: "idle",
  mutationStatus: "idle",
  error: null,
};

export const fetchReviewNotes = createAsyncThunk("submissions/fetchNotes", async (clientId: string) => ({
  clientId,
  notes: await reviewNoteService.listForClient(clientId),
}));

export const addReviewNote = createAsyncThunk(
  "submissions/addNote",
  async ({ clientId, message, visibility }: { clientId: string; message: string; visibility: ReviewNoteVisibility }) =>
    reviewNoteService.add(clientId, message, visibility),
);

const submissionsSlice = createSlice({
  name: "submissions",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReviewNotes.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchReviewNotes.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.notesByClientId[action.payload.clientId] = action.payload.notes;
      })
      .addCase(fetchReviewNotes.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message ?? "Failed to load review notes.";
      })
      .addCase(addReviewNote.pending, (state) => {
        state.mutationStatus = "loading";
      })
      .addCase(addReviewNote.fulfilled, (state, action: PayloadAction<ReviewNote>) => {
        state.mutationStatus = "succeeded";
        const existing = state.notesByClientId[action.payload.clientId] ?? [];
        state.notesByClientId[action.payload.clientId] = [action.payload, ...existing];
      })
      .addCase(addReviewNote.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.error = action.error.message ?? "Failed to add review note.";
      });
  },
});

export default submissionsSlice.reducer;
