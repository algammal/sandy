import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Client, ClientSubmissionBundle, RequestStatus, SubmissionStatus } from "@sandy/shared-types";
import { clientService } from "../../services/clientService";
import { clientFromBundle } from "../../features/clients/clientFromBundle";

interface ClientsState {
  items: Client[];
  status: RequestStatus;
  mutationStatus: RequestStatus;
  error: string | null;
  searchTerm: string;
  statusFilter: string;
  categoryFilter: string;
}

const initialState: ClientsState = {
  items: [],
  status: "idle",
  mutationStatus: "idle",
  error: null,
  searchTerm: "",
  statusFilter: "all",
  categoryFilter: "all",
};

export const fetchClients = createAsyncThunk("clients/fetch", async () => clientService.list());

export const transitionClientSubmission = createAsyncThunk(
  "clients/transitionSubmission",
  async ({ id, status }: { id: string; status: SubmissionStatus }) => clientService.transitionSubmission(id, status),
);

const clientsSlice = createSlice({
  name: "clients",
  initialState,
  reducers: {
    setSearchTerm(state, action: PayloadAction<string>) {
      state.searchTerm = action.payload;
    },
    setStatusFilter(state, action: PayloadAction<string>) {
      state.statusFilter = action.payload;
    },
    setCategoryFilter(state, action: PayloadAction<string>) {
      state.categoryFilter = action.payload;
    },
    /** Materializes or refreshes a Client record from an imported client-portal submission bundle. */
    upsertClientFromBundle(state, action: PayloadAction<ClientSubmissionBundle>) {
      const existing = state.items.find((item) => item.id === action.payload.client.id);
      const client = clientFromBundle(action.payload, existing);
      state.items = existing ? state.items.map((item) => (item.id === client.id ? client : item)) : [client, ...state.items];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClients.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchClients.fulfilled, (state, action: PayloadAction<Client[]>) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message ?? "Failed to load clients.";
      })
      .addCase(transitionClientSubmission.pending, (state) => {
        state.mutationStatus = "loading";
      })
      .addCase(transitionClientSubmission.fulfilled, (state, action: PayloadAction<Client>) => {
        state.mutationStatus = "succeeded";
        state.items = state.items.map((item) => (item.id === action.payload.id ? action.payload : item));
      })
      .addCase(transitionClientSubmission.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.error = action.error.message ?? "Failed to update submission status.";
      });
  },
});

export const { setSearchTerm, setStatusFilter, setCategoryFilter, upsertClientFromBundle } = clientsSlice.actions;
export default clientsSlice.reducer;
