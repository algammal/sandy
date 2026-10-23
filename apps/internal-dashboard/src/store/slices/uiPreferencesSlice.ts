import { createSlice } from "@reduxjs/toolkit";

interface UiPreferencesState {
  isMobileSidebarOpen: boolean;
}

const initialState: UiPreferencesState = {
  isMobileSidebarOpen: false,
};

const uiPreferencesSlice = createSlice({
  name: "uiPreferences",
  initialState,
  reducers: {
    openMobileSidebar(state) {
      state.isMobileSidebarOpen = true;
    },
    closeMobileSidebar(state) {
      state.isMobileSidebarOpen = false;
    },
    toggleMobileSidebar(state) {
      state.isMobileSidebarOpen = !state.isMobileSidebarOpen;
    },
  },
});

export const { openMobileSidebar, closeMobileSidebar, toggleMobileSidebar } = uiPreferencesSlice.actions;
export default uiPreferencesSlice.reducer;
