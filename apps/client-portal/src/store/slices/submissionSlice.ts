import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RequestStatus, Submission, SubmissionStatus } from "@sandy/shared-types";
import { submissionService } from "../../services/submissionService";

interface SubmissionState {
  submission: Submission | null;
  status: RequestStatus;
  transitionStatus: RequestStatus;
  error: string | null;
}

const initialState: SubmissionState = {
  submission: null,
  status: "idle",
  transitionStatus: "idle",
  error: null,
};

export const fetchSubmission = createAsyncThunk("submission/fetch", async () => submissionService.get());

export const transitionSubmission = createAsyncThunk(
  "submission/transition",
  async ({ status, note }: { status: SubmissionStatus; note?: string }) => submissionService.transition(status, note),
);

const submissionSlice = createSlice({
  name: "submission",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubmission.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchSubmission.fulfilled, (state, action: PayloadAction<Submission>) => {
        state.status = "succeeded";
        state.submission = action.payload;
      })
      .addCase(fetchSubmission.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message ?? "Failed to load submission status.";
      })
      .addCase(transitionSubmission.pending, (state) => {
        state.transitionStatus = "loading";
      })
      .addCase(transitionSubmission.fulfilled, (state, action: PayloadAction<Submission>) => {
        state.transitionStatus = "succeeded";
        state.submission = action.payload;
      })
      .addCase(transitionSubmission.rejected, (state, action) => {
        state.transitionStatus = "failed";
        state.error = action.error.message ?? "Failed to update submission.";
      });
  },
});

export default submissionSlice.reducer;
