import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { BusinessProfile } from "@sandy/shared-types";
import type { RequestStatus } from "@sandy/shared-types";
import { businessProfileService } from "../../services/businessProfileService";

interface BusinessProfileState {
  profile: BusinessProfile | null;
  status: RequestStatus;
  saveStatus: RequestStatus;
  error: string | null;
}

const initialState: BusinessProfileState = {
  profile: null,
  status: "idle",
  saveStatus: "idle",
  error: null,
};

export const fetchBusinessProfile = createAsyncThunk("businessProfile/fetch", async () => businessProfileService.get());

export const saveBusinessProfile = createAsyncThunk(
  "businessProfile/save",
  async (input: Omit<BusinessProfile, "clientId" | "updatedAt">) => businessProfileService.update(input),
);

const businessProfileSlice = createSlice({
  name: "businessProfile",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBusinessProfile.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchBusinessProfile.fulfilled, (state, action: PayloadAction<BusinessProfile>) => {
        state.status = "succeeded";
        state.profile = action.payload;
      })
      .addCase(fetchBusinessProfile.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message ?? "Failed to load business profile.";
      })
      .addCase(saveBusinessProfile.pending, (state) => {
        state.saveStatus = "loading";
        state.error = null;
      })
      .addCase(saveBusinessProfile.fulfilled, (state, action: PayloadAction<BusinessProfile>) => {
        state.saveStatus = "succeeded";
        state.profile = action.payload;
      })
      .addCase(saveBusinessProfile.rejected, (state, action) => {
        state.saveStatus = "failed";
        state.error = action.error.message ?? "Failed to save business profile.";
      });
  },
});

export default businessProfileSlice.reducer;
