import { createSlice,type PayloadAction } from '@reduxjs/toolkit';

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  role?: string;
  principalType?: 'candidate' | 'user';
}

interface AuthState {
  isAuthenticated: boolean;
  isInitialized: boolean;
  user: UserProfile | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  isInitialized: false,
  user: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action: PayloadAction<UserProfile>) => {
      state.isAuthenticated = true;
      state.isInitialized = true;
      state.user = action.payload;
    },
    setInitialized: (state) => {
      state.isInitialized = true;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.isInitialized = true;
      state.user = null;
    },
    updateProfile: (state, action: PayloadAction<Partial<UserProfile>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
});

export const { loginSuccess, setInitialized, logout, updateProfile } = authSlice.actions;
export default authSlice.reducer;
