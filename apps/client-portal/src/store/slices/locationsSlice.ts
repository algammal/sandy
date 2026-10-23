import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Location, RequestStatus } from "@sandy/shared-types";
import { locationService, type LocationInput } from "../../services/locationService";

interface LocationsState {
  items: Location[];
  status: RequestStatus;
  mutationStatus: RequestStatus;
  error: string | null;
}

const initialState: LocationsState = {
  items: [],
  status: "idle",
  mutationStatus: "idle",
  error: null,
};

export const fetchLocations = createAsyncThunk("locations/fetch", async () => locationService.list());

export const createLocation = createAsyncThunk("locations/create", async (input: LocationInput) =>
  locationService.create(input),
);

export const updateLocation = createAsyncThunk(
  "locations/update",
  async ({ id, input }: { id: string; input: LocationInput }) => locationService.update(id, input),
);

export const removeLocation = createAsyncThunk("locations/remove", async (id: string) => locationService.remove(id));

const locationsSlice = createSlice({
  name: "locations",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLocations.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchLocations.fulfilled, (state, action: PayloadAction<Location[]>) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchLocations.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message ?? "Failed to load locations.";
      })
      .addCase(createLocation.fulfilled, (state, action: PayloadAction<Location>) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateLocation.fulfilled, (state, action: PayloadAction<Location>) => {
        state.items = state.items.map((item) => (item.id === action.payload.id ? action.payload : item));
      })
      .addCase(removeLocation.fulfilled, (state, action: PayloadAction<{ id: string }>) => {
        state.items = state.items.filter((item) => item.id !== action.payload.id);
      });
  },
});

export default locationsSlice.reducer;
