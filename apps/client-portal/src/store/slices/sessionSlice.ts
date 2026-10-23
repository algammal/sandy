import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RequestStatus } from "@sandy/shared-types";
import { authService, type DemoUser, type RegisterInput, type SignInInput } from "../../services/authService";

interface SessionState {
  user: DemoUser | null;
  status: RequestStatus;
  error: string | null;
  passwordResetStatus: RequestStatus;
  passwordResetSentTo: string | null;
}

const initialState: SessionState = {
  user: null,
  status: "idle",
  error: null,
  passwordResetStatus: "idle",
  passwordResetSentTo: null,
};

export const signIn = createAsyncThunk("session/signIn", async (input: SignInInput) => authService.signIn(input));

export const registerAccount = createAsyncThunk("session/register", async (input: RegisterInput) =>
  authService.register(input),
);

export const requestPasswordReset = createAsyncThunk("session/requestPasswordReset", async (email: string) =>
  authService.requestPasswordReset(email),
);

const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    signOut(state) {
      state.user = null;
      state.status = "idle";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signIn.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action: PayloadAction<DemoUser>) => {
        state.status = "succeeded";
        state.user = action.payload;
      })
      .addCase(signIn.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message ?? "Sign-in failed.";
      })
      .addCase(registerAccount.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(registerAccount.fulfilled, (state, action: PayloadAction<DemoUser>) => {
        state.status = "succeeded";
        state.user = action.payload;
      })
      .addCase(registerAccount.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message ?? "Registration failed.";
      })
      .addCase(requestPasswordReset.pending, (state) => {
        state.passwordResetStatus = "loading";
        state.error = null;
      })
      .addCase(requestPasswordReset.fulfilled, (state, action) => {
        state.passwordResetStatus = "succeeded";
        state.passwordResetSentTo = action.payload.email;
      })
      .addCase(requestPasswordReset.rejected, (state, action) => {
        state.passwordResetStatus = "failed";
        state.error = action.error.message ?? "Could not send reset link.";
      });
  },
});

export const { signOut } = sessionSlice.actions;
export default sessionSlice.reducer;
