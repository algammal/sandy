import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Property, RequestStatus } from "@sandy/shared-types";
import { propertyService, type PropertyInput } from "../../services/propertyService";

interface PropertiesState {
  items: Property[];
  status: RequestStatus;
  mutationStatus: RequestStatus;
  error: string | null;
  searchTerm: string;
  typeFilter: string;
  includeArchived: boolean;
}

const initialState: PropertiesState = {
  items: [],
  status: "idle",
  mutationStatus: "idle",
  error: null,
  searchTerm: "",
  typeFilter: "all",
  includeArchived: false,
};

export const fetchProperties = createAsyncThunk("properties/fetch", async () => propertyService.list());

export const createProperty = createAsyncThunk("properties/create", async (input: PropertyInput) =>
  propertyService.create(input),
);

export const updateProperty = createAsyncThunk(
  "properties/update",
  async ({ id, input }: { id: string; input: PropertyInput }) => propertyService.update(id, input),
);

export const setPropertyArchived = createAsyncThunk(
  "properties/setArchived",
  async ({ id, isArchived }: { id: string; isArchived: boolean }) => propertyService.setArchived(id, isArchived),
);

const propertiesSlice = createSlice({
  name: "properties",
  initialState,
  reducers: {
    setSearchTerm(state, action: PayloadAction<string>) {
      state.searchTerm = action.payload;
    },
    setTypeFilter(state, action: PayloadAction<string>) {
      state.typeFilter = action.payload;
    },
    setIncludeArchived(state, action: PayloadAction<boolean>) {
      state.includeArchived = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProperties.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchProperties.fulfilled, (state, action: PayloadAction<Property[]>) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchProperties.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message ?? "Failed to load properties.";
      })
      .addCase(createProperty.pending, (state) => {
        state.mutationStatus = "loading";
      })
      .addCase(createProperty.fulfilled, (state, action: PayloadAction<Property>) => {
        state.mutationStatus = "succeeded";
        state.items.unshift(action.payload);
      })
      .addCase(createProperty.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.error = action.error.message ?? "Failed to create property.";
      })
      .addCase(updateProperty.fulfilled, (state, action: PayloadAction<Property>) => {
        state.mutationStatus = "succeeded";
        state.items = state.items.map((item) => (item.id === action.payload.id ? action.payload : item));
      })
      .addCase(setPropertyArchived.fulfilled, (state, action: PayloadAction<Property>) => {
        state.items = state.items.map((item) => (item.id === action.payload.id ? action.payload : item));
      });
  },
});

export const { setSearchTerm, setTypeFilter, setIncludeArchived } = propertiesSlice.actions;
export default propertiesSlice.reducer;
