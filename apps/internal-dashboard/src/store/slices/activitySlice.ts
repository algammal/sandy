import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ActivityLogEntry, RequestStatus } from "@sandy/shared-types";
import { activityService } from "../../services/activityService";

interface ActivityState {
  items: ActivityLogEntry[];
  status: RequestStatus;
}

const initialState: ActivityState = {
  items: [],
  status: "idle",
};

export const fetchActivity = createAsyncThunk("activity/fetch", async () => activityService.list());

const activitySlice = createSlice({
  name: "activity",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchActivity.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchActivity.fulfilled, (state, action: PayloadAction<ActivityLogEntry[]>) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchActivity.rejected, (state) => {
        state.status = "failed";
      });
  },
});

export default activitySlice.reducer;
