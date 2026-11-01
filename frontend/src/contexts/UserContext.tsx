import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { isAuthenticated, getUserType, UserType } from "@/lib/auth";

export interface OnboardingStatus {
  hasUploadedBill: boolean;
  hasVerifiedLoad: boolean;
  hasViewedSavings: boolean;
  hasBuiltPortfolio: boolean;
}

export interface UserState {
  isLoggedIn: boolean;
  userType: UserType;
  isNewUser: boolean;
  onboarding: OnboardingStatus;
  totalSavingsToDate: number;
  currentMonthSavings: number;
  portfolioVolume: number;
  commissionEarned: number;
}

interface UserContextType {
  userState: UserState;
  updateUserState: (updates: Partial<UserState>) => void;
  completeOnboardingStep: (step: keyof OnboardingStatus) => void;
  resetOnboarding: () => void;
}

const defaultOnboarding: OnboardingStatus = {
  hasUploadedBill: false,
  hasVerifiedLoad: false,
  hasViewedSavings: false,
  hasBuiltPortfolio: false,
};

const defaultUserState: UserState = {
  isLoggedIn: false,
  userType: "consumer",
  isNewUser: true,
  onboarding: defaultOnboarding,
  totalSavingsToDate: 0,
  currentMonthSavings: 0,
  portfolioVolume: 0,
  commissionEarned: 0,
};

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_STATE_KEY = "prolt_user_state";

export function UserProvider({ children }: { children: ReactNode }) {
  const [userState, setUserState] = useState<UserState>(() => {
    // Initialize from localStorage
    try {
      const saved = localStorage.getItem(USER_STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...defaultUserState,
          ...parsed,
          isLoggedIn: isAuthenticated(),
          userType: getUserType(),
        };
      }
    } catch {
      // Ignore parse errors
    }
    return {
      ...defaultUserState,
      isLoggedIn: isAuthenticated(),
      userType: getUserType(),
    };
  });

  // Sync with auth state
  useEffect(() => {
    const checkAuth = () => {
      const loggedIn = isAuthenticated();
      const type = getUserType();
      if (loggedIn !== userState.isLoggedIn || type !== userState.userType) {
        setUserState((prev) => ({
          ...prev,
          isLoggedIn: loggedIn,
          userType: type,
        }));
      }
    };

    // Check on mount and when storage changes
    checkAuth();
    window.addEventListener("storage", checkAuth);
    return () => window.removeEventListener("storage", checkAuth);
  }, [userState.isLoggedIn, userState.userType]);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(USER_STATE_KEY, JSON.stringify(userState));
    } catch {
      // Ignore storage errors
    }
  }, [userState]);

  const updateUserState = (updates: Partial<UserState>) => {
    setUserState((prev) => ({ ...prev, ...updates }));
  };

  const completeOnboardingStep = (step: keyof OnboardingStatus) => {
    setUserState((prev) => ({
      ...prev,
      onboarding: { ...prev.onboarding, [step]: true },
      isNewUser: false,
    }));
  };

  const resetOnboarding = () => {
    setUserState((prev) => ({
      ...prev,
      onboarding: defaultOnboarding,
      isNewUser: true,
    }));
  };

  return (
    <UserContext.Provider
      value={{
        userState,
        updateUserState,
        completeOnboardingStep,
        resetOnboarding,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}

// Hook to check if user is a returning user with activity
export function useIsReturningUser() {
  const { userState } = useUser();

  if (!userState.isLoggedIn) return false;

  if (userState.userType === "consumer") {
    return (
      userState.onboarding.hasViewedSavings || userState.totalSavingsToDate > 0
    );
  }

  if (userState.userType === "trader") {
    return (
      userState.onboarding.hasBuiltPortfolio || userState.portfolioVolume > 0
    );
  }

  return false;
}
