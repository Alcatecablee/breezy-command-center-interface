import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import {
  supabase,
  getCurrentUser,
  getUserProfile,
  getSubscription,
  isSupabaseConfigured,
} from "./supabase";
import type { UserProfile, Subscription } from "./supabase";
import {
  checkDatabaseSetup,
  initializeUserProfile,
} from "../utils/initDatabase";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  subscription: Subscription | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, metadata?: any) => Promise<any>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (currentUser: User) => {
    try {
      // Load user profile
      const { data: profileData } = await getUserProfile(currentUser.id);
      setProfile(profileData);

      // Load subscription
      const { data: subscriptionData } = await getSubscription(currentUser.id);
      setSubscription(subscriptionData);
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  useEffect(() => {
    // Check if Supabase is configured
    if (!isSupabaseConfigured) {
      console.warn("Supabase not configured - running in demo mode");
      setLoading(false);
      return;
    }

    // Check active sessions and sets the user
    const getSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setUser(session?.user ?? null);

        if (session?.user) {
          await loadUserData(session.user);
        }
      } catch (error) {
        console.error("Error getting session:", error);
      }

      setLoading(false);
    };

    getSession();

    // Listen for changes on auth state (sign in, sign out, etc.)
    let authSubscription: any = null;

    if (isSupabaseConfigured) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        try {
          setUser(session?.user ?? null);

          if (session?.user) {
            await loadUserData(session.user);
          } else {
            setProfile(null);
            setSubscription(null);
          }
        } catch (error) {
          console.error("Error in auth state change:", error);
        }

        setLoading(false);
      });

      authSubscription = subscription;
    }

    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return {
        data: null,
        error: new Error(
          "Supabase not configured. Please set up environment variables.",
        ),
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    if (!isSupabaseConfigured) {
      return {
        data: null,
        error: new Error(
          "Supabase not configured. Please set up environment variables.",
        ),
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    return { data, error };
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      throw new Error("Supabase not configured");
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const refreshProfile = async () => {
    if (user) {
      await loadUserData(user);
    }
  };

  const value = {
    user,
    profile,
    subscription,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
