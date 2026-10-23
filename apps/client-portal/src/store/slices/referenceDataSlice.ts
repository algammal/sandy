import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AmenityRecord, RequestStatus } from "@sandy/shared-types";
import { amenityService } from "../../services/amenityService";

interface ReferenceDataState {
  amenities: AmenityRecord[];
  status: RequestStatus;
}

const initialState: ReferenceDataState = {
  amenities: [],
  status: "idle",
};

export const fetchAmenities = createAsyncThunk("referenceData/fetchAmenities", async () => amenityService.list());

const referenceDataSlice = createSlice({
  name: "referenceData",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAmenities.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchAmenities.fulfilled, (state, action: PayloadAction<AmenityRecord[]>) => {
        state.status = "succeeded";
        state.amenities = action.payload;
      })
      .addCase(fetchAmenities.rejected, (state) => {
        state.status = "failed";
      });
  },
});

export default referenceDataSlice.reducer;
