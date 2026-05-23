"use client";

import { createContext, useContext } from "react";

import type { Profile } from "@/src/types/database";

const AuthProfileContext = createContext<Profile | null>(null);

type AuthProfileProviderProps = {
  profile: Profile;
  children: React.ReactNode;
};

export function AuthProfileProvider({
  profile,
  children,
}: AuthProfileProviderProps) {
  return (
    <AuthProfileContext.Provider value={profile}>
      {children}
    </AuthProfileContext.Provider>
  );
}

export function useAuthProfile(): Profile | null {
  return useContext(AuthProfileContext);
}
