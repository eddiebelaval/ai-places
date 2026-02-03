'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { UserSession, SubscriptionTier } from '@aiplaces/shared';

interface PremiumStatus {
  subscriptionTier: SubscriptionTier;
  emailVerified: boolean;
  isPremium: boolean;
}

interface AuthState {
  /** Current authenticated user */
  user: UserSession | null;

  /** Session token for WebSocket authentication */
  sessionToken: string | null;

  /** Whether the user is authenticated */
  isAuthenticated: boolean;

  /** Whether auth state is being loaded */
  isLoading: boolean;

  /** Premium status (fetched separately) */
  premiumStatus: PremiumStatus | null;

  /** Actions */
  setUser: (user: UserSession | null) => void;
  setSessionToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setPremiumStatus: (status: PremiumStatus | null) => void;
  fetchPremiumStatus: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    immer((set, get) => ({
      user: null,
      sessionToken: null,
      isAuthenticated: false,
      isLoading: true,
      premiumStatus: null,

      setUser: (user) => {
        set((state) => {
          state.user = user;
          state.isAuthenticated = !!user;
          state.isLoading = false;
        });
        // Fetch premium status when user is set
        if (user) {
          get().fetchPremiumStatus();
        }
      },

      setSessionToken: (token) => {
        set((state) => {
          state.sessionToken = token;
        });
      },

      setLoading: (loading) => {
        set((state) => {
          state.isLoading = loading;
        });
      },

      setPremiumStatus: (status) => {
        set((state) => {
          state.premiumStatus = status;
        });
      },

      fetchPremiumStatus: async () => {
        const user = get().user;
        if (!user) return;

        try {
          // No need to pass userId - endpoint uses authenticated session
          const response = await fetch('/api/user/profile');
          if (response.ok) {
            const data = await response.json();
            set((state) => {
              state.premiumStatus = {
                subscriptionTier: data.subscriptionTier,
                emailVerified: data.emailVerified,
                isPremium: data.isPremium,
              };
            });
          }
        } catch (error) {
          console.error('Failed to fetch premium status:', error);
        }
      },

      logout: () => {
        set((state) => {
          state.user = null;
          state.sessionToken = null;
          state.isAuthenticated = false;
          state.premiumStatus = null;
        });
      },
    })),
    {
      name: 'aiplaces-auth',
      // Only persist the session token - user data is fetched from server
      partialize: (state) => ({
        sessionToken: state.sessionToken,
      }),
    }
  )
);

/**
 * Helper function to check if user can place pixels
 * (authenticated and not in spectator mode)
 */
export function canPlacePixels(state: AuthState): boolean {
  return state.isAuthenticated && state.user !== null && !state.user.isSpectatorOnly;
}
