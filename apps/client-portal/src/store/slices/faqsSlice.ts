import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Faq, RequestStatus } from "@sandy/shared-types";
import { faqService, type FaqInput } from "../../services/faqService";

interface FaqsState {
  items: Faq[];
  status: RequestStatus;
  mutationStatus: RequestStatus;
  error: string | null;
  searchTerm: string;
  categoryFilter: string;
}

const initialState: FaqsState = {
  items: [],
  status: "idle",
  mutationStatus: "idle",
  error: null,
  searchTerm: "",
  categoryFilter: "all",
};

export const fetchFaqs = createAsyncThunk("faqs/fetch", async () => faqService.list());

export const createFaq = createAsyncThunk("faqs/create", async (input: FaqInput) => faqService.create(input));

export const updateFaq = createAsyncThunk("faqs/update", async ({ id, input }: { id: string; input: FaqInput }) =>
  faqService.update(id, input),
);

export const removeFaq = createAsyncThunk("faqs/remove", async (id: string) => faqService.remove(id));

const faqsSlice = createSlice({
  name: "faqs",
  initialState,
  reducers: {
    setSearchTerm(state, action: PayloadAction<string>) {
      state.searchTerm = action.payload;
    },
    setCategoryFilter(state, action: PayloadAction<string>) {
      state.categoryFilter = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFaqs.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchFaqs.fulfilled, (state, action: PayloadAction<Faq[]>) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchFaqs.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message ?? "Failed to load FAQs.";
      })
      .addCase(createFaq.fulfilled, (state, action: PayloadAction<Faq>) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateFaq.fulfilled, (state, action: PayloadAction<Faq>) => {
        state.items = state.items.map((item) => (item.id === action.payload.id ? action.payload : item));
      })
      .addCase(removeFaq.fulfilled, (state, action: PayloadAction<{ id: string }>) => {
        state.items = state.items.filter((item) => item.id !== action.payload.id);
      });
  },
});

export const { setSearchTerm, setCategoryFilter } = faqsSlice.actions;
export default faqsSlice.reducer;
