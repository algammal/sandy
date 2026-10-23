import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Compound, RequestStatus } from "@sandy/shared-types";
import { compoundService, type CompoundInput } from "../../services/compoundService";

interface CompoundsState {
  items: Compound[];
  status: RequestStatus;
  mutationStatus: RequestStatus;
  error: string | null;
  searchTerm: string;
}

const initialState: CompoundsState = {
  items: [],
  status: "idle",
  mutationStatus: "idle",
  error: null,
  searchTerm: "",
};

export const fetchCompounds = createAsyncThunk("compounds/fetch", async () => compoundService.list());

export const createCompound = createAsyncThunk("compounds/create", async (input: CompoundInput) =>
  compoundService.create(input),
);

export const updateCompound = createAsyncThunk(
  "compounds/update",
  async ({ id, input }: { id: string; input: CompoundInput }) => compoundService.update(id, input),
);

export const setCompoundArchived = createAsyncThunk(
  "compounds/setArchived",
  async ({ id, isArchived }: { id: string; isArchived: boolean }) => compoundService.setArchived(id, isArchived),
);

const compoundsSlice = createSlice({
  name: "compounds",
  initialState,
  reducers: {
    setSearchTerm(state, action: PayloadAction<string>) {
      state.searchTerm = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCompounds.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchCompounds.fulfilled, (state, action: PayloadAction<Compound[]>) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchCompounds.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message ?? "Failed to load compounds.";
      })
      .addCase(createCompound.fulfilled, (state, action: PayloadAction<Compound>) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateCompound.fulfilled, (state, action: PayloadAction<Compound>) => {
        state.items = state.items.map((item) => (item.id === action.payload.id ? action.payload : item));
      })
      .addCase(setCompoundArchived.fulfilled, (state, action: PayloadAction<Compound>) => {
        state.items = state.items.map((item) => (item.id === action.payload.id ? action.payload : item));
      });
  },
});

export const { setSearchTerm } = compoundsSlice.actions;
export default compoundsSlice.reducer;
