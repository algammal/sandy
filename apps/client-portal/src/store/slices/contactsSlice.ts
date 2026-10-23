import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ContactNumber, RequestStatus } from "@sandy/shared-types";
import { contactService, type ContactNumberInput } from "../../services/contactService";

interface ContactsState {
  items: ContactNumber[];
  status: RequestStatus;
  mutationStatus: RequestStatus;
  error: string | null;
}

const initialState: ContactsState = {
  items: [],
  status: "idle",
  mutationStatus: "idle",
  error: null,
};

export const fetchContacts = createAsyncThunk("contacts/fetch", async () => contactService.list());

export const createContact = createAsyncThunk("contacts/create", async (input: ContactNumberInput) =>
  contactService.create(input),
);

export const updateContact = createAsyncThunk(
  "contacts/update",
  async ({ id, input }: { id: string; input: ContactNumberInput }) => contactService.update(id, input),
);

export const removeContact = createAsyncThunk("contacts/remove", async (id: string) => contactService.remove(id));

const contactsSlice = createSlice({
  name: "contacts",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchContacts.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchContacts.fulfilled, (state, action: PayloadAction<ContactNumber[]>) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchContacts.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message ?? "Failed to load contact numbers.";
      })
      .addCase(createContact.fulfilled, (state, action: PayloadAction<ContactNumber>) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateContact.fulfilled, (state, action: PayloadAction<ContactNumber>) => {
        state.items = state.items.map((item) => (item.id === action.payload.id ? action.payload : item));
      })
      .addCase(removeContact.fulfilled, (state, action: PayloadAction<{ id: string }>) => {
        state.items = state.items.filter((item) => item.id !== action.payload.id);
      });
  },
});

export default contactsSlice.reducer;
