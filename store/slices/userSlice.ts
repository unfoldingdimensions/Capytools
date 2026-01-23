import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserState {
    userId: string | null;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    subscriptionTier: 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
    creditsRemaining: number;
    creditsUsed: number;
    isLoading: boolean;
    error: string | null;
}

const initialState: UserState = {
    userId: null,
    email: null,
    firstName: null,
    lastName: null,
    subscriptionTier: 'FREE',
    creditsRemaining: 3,
    creditsUsed: 0,
    isLoading: false,
    error: null,
};

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        setUserData: (state, action: PayloadAction<Partial<UserState>>) => {
            return { ...state, ...action.payload, error: null };
        },
        updateCredits: (state, action: PayloadAction<{ remaining: number; used: number }>) => {
            state.creditsRemaining = action.payload.remaining;
            state.creditsUsed = action.payload.used;
        },
        deductCredit: (state) => {
            if (state.creditsRemaining > 0) {
                state.creditsRemaining -= 1;
                state.creditsUsed += 1;
            }
        },
        addCredits: (state, action: PayloadAction<number>) => {
            state.creditsRemaining += action.payload;
        },
        setSubscriptionTier: (state, action: PayloadAction<'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE'>) => {
            state.subscriptionTier = action.payload;
        },
        setUserLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setUserError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
        clearUserData: () => initialState,
    },
});

export const {
    setUserData,
    updateCredits,
    deductCredit,
    addCredits,
    setSubscriptionTier,
    setUserLoading,
    setUserError,
    clearUserData,
} = userSlice.actions;

export default userSlice.reducer;

