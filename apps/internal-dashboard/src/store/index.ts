import { combineReducers, configureStore } from "@reduxjs/toolkit";
import clientsReducer from "./slices/clientsSlice";
import submissionsReducer from "./slices/submissionsSlice";
import agentConfigurationsReducer from "./slices/agentConfigurationsSlice";
import agentInstancesReducer from "./slices/agentInstancesSlice";
import activityReducer from "./slices/activitySlice";
import uiPreferencesReducer from "./slices/uiPreferencesSlice";
import businessInfoReducer from "./slices/businessInfoSlice";
import agentRequestsReducer from "./slices/agentRequestsSlice";

const rootReducer = combineReducers({
  clients: clientsReducer,
  submissions: submissionsReducer,
  agentConfigurations: agentConfigurationsReducer,
  agentInstances: agentInstancesReducer,
  activity: activityReducer,
  uiPreferences: uiPreferencesReducer,
  businessInfo: businessInfoReducer,
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
