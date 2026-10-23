import { combineReducers, configureStore } from "@reduxjs/toolkit";
import businessProfileReducer from "./slices/businessProfileSlice";
import propertiesReducer from "./slices/propertiesSlice";
import compoundsReducer from "./slices/compoundsSlice";
import locationsReducer from "./slices/locationsSlice";
import contactsReducer from "./slices/contactsSlice";
import faqsReducer from "./slices/faqsSlice";
import submissionReducer from "./slices/submissionSlice";
import sessionReducer from "./slices/sessionSlice";
import uiPreferencesReducer from "./slices/uiPreferencesSlice";
import referenceDataReducer from "./slices/referenceDataSlice";
import agentRequestsReducer from "./slices/agentRequestsSlice";

const rootReducer = combineReducers({
  businessProfile: businessProfileReducer,
  properties: propertiesReducer,
  compounds: compoundsReducer,
  locations: locationsReducer,
  contacts: contactsReducer,
  faqs: faqsReducer,
  submission: submissionReducer,
  session: sessionReducer,
  uiPreferences: uiPreferencesReducer,
  referenceData: referenceDataReducer,
  agentRequests: agentRequestsReducer,
});

export function makeStore() {
  return configureStore({
    reducer: rootReducer,
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = AppStore["dispatch"];
