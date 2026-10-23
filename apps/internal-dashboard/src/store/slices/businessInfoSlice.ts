import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ClientSubmissionBundle, RequestStatus } from "@sandy/shared-types";
import { businessInfoService } from "../../services/businessInfoService";
import type { ClientBusinessInfo } from "../../services/businessInfoSeed";

interface BusinessInfoState {
  byClientId: Record<string, ClientBusinessInfo>;
  statusByClientId: Record<string, RequestStatus>;
}

const initialState: BusinessInfoState = {
  byClientId: {},
  statusByClientId: {},
};

export const fetchBusinessInfo = createAsyncThunk("businessInfo/fetch", async (clientId: string) => ({
  clientId,
  info: await businessInfoService.getForClient(clientId),
}));

const businessInfoSlice = createSlice({
  name: "businessInfo",
  initialState,
  reducers: {
    /** Stores a client-portal submission bundle's business data directly — no fetch/service round trip needed, it's already in hand. */
    setBusinessInfoFromBundle(state, action: PayloadAction<ClientSubmissionBundle>) {
      const bundle = action.payload;
      state.byClientId[bundle.client.id] = {
        businessProfile: bundle.businessProfile,
        properties: bundle.properties,
        compounds: bundle.compounds,
        locations: bundle.locations,
        contacts: bundle.contacts,
        faqs: bundle.faqs,
        amenities: bundle.amenities,
      };
      state.statusByClientId[bundle.client.id] = "succeeded";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBusinessInfo.pending, (state, action) => {
        state.statusByClientId[action.meta.arg] = "loading";
      })
      .addCase(fetchBusinessInfo.fulfilled, (state, action) => {
        state.statusByClientId[action.payload.clientId] = "succeeded";
        state.byClientId[action.payload.clientId] = action.payload.info;
      })
      .addCase(fetchBusinessInfo.rejected, (state, action) => {
        state.statusByClientId[action.meta.arg] = "failed";
      });
  },
});

export const { setBusinessInfoFromBundle } = businessInfoSlice.actions;
export default businessInfoSlice.reducer;
